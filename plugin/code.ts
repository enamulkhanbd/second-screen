/// <reference types="@figma/plugin-typings" />

// Show Plugin UI
figma.showUI(__html__, {
  width: 440,
  height: 620,
  themeColors: true,
});

/**
 * Robust color parser to Figma RGBA (0-1)
 */
function parseColorToFigma(colorInput: any): { r: number; g: number; b: number; a: number } {
  if (typeof colorInput !== "string") {
    return { r: 0.5, g: 0.5, b: 0.5, a: 1 };
  }
  let str = colorInput.trim();

  // Hex (#rgb, #rrggbb, #rrggbbaa)
  if (str.startsWith("#")) {
    let hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    if (hex.length === 6) {
      hex += "ff";
    }
    if (hex.length === 8) {
      const num = parseInt(hex, 16);
      if (!isNaN(num)) {
        return {
          r: ((num >> 24) & 255) / 255,
          g: ((num >> 16) & 255) / 255,
          b: ((num >> 8) & 255) / 255,
          a: (num & 255) / 255,
        };
      }
    }
  }

  // rgb/rgba
  const rgbMatch = str.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgbMatch) {
    return {
      r: Math.max(0, Math.min(1, parseFloat(rgbMatch[1]) / 255)),
      g: Math.max(0, Math.min(1, parseFloat(rgbMatch[2]) / 255)),
      b: Math.max(0, Math.min(1, parseFloat(rgbMatch[3]) / 255)),
      a: rgbMatch[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(rgbMatch[4]))) : 1,
    };
  }

  return { r: 0.5, g: 0.5, b: 0.5, a: 1 };
}

/**
 * Parses numeric dimension from px/rem/em/number values
 */
function parseDimensionValue(val: any): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Flexible variable lookup for alias resolution across collections
 */
function findVariableByAlias(
  aliasStr: string,
  allVars: Variable[]
): Variable | undefined {
  if (!aliasStr) return undefined;
  const clean = aliasStr.replace(/[{}]/g, "").trim().toLowerCase();
  const slashPath = clean.replace(/\./g, "/");
  const dotPath = clean.replace(/\//g, ".");

  // 1. Exact slash match (e.g. "colors/brand/500")
  let match = allVars.find((v) => v.name.toLowerCase() === slashPath);
  if (match) return match;

  // 2. Match without set prefix (e.g. "global/colors/brand/500" vs "colors/brand/500")
  const parts = slashPath.split("/");
  if (parts.length > 1) {
    const subPath = parts.slice(1).join("/");
    match = allVars.find((v) => v.name.toLowerCase() === subPath || v.name.toLowerCase().endsWith(`/${subPath}`));
    if (match) return match;
  }

  // 3. Suffix match on the last 2 segments (e.g. "brand/500")
  if (parts.length >= 2) {
    const lastTwo = parts.slice(-2).join("/");
    match = allVars.find((v) => v.name.toLowerCase().endsWith(lastTwo));
    if (match) return match;
  }

  // 4. Exact last segment match
  const lastSeg = parts[parts.length - 1];
  if (lastSeg) {
    match = allVars.find((v) => {
      const vLast = v.name.split("/").pop()?.toLowerCase();
      return vLast === lastSeg;
    });
    if (match) return match;
  }

  return undefined;
}

// -------------------------------------------------------------
// MESSAGE HANDLERS
// -------------------------------------------------------------
figma.ui.onmessage = async (msg: { type: string; payload?: any }) => {
  // 1. Initial Config Retrieval
  if (msg.type === "GET_SAVED_CONFIG") {
    const saved = await figma.clientStorage.getAsync("second_screen_config");
    figma.ui.postMessage({
      type: "SAVED_CONFIG",
      payload: saved || {
        serverUrl: "http://localhost:3000",
        pat: "",
        createVariables: true,
        createStyles: true,
      },
    });
  }

  // 2. Save Config
  if (msg.type === "SAVE_CONFIG") {
    await figma.clientStorage.setAsync("second_screen_config", msg.payload);
    figma.notify("Configuration saved.");
  }

  // 3. PULL TOKENS TO FIGMA
  if (msg.type === "PULL_TOKENS_TO_FIGMA") {
    const { rawTokens, resolvedTokens, themeGroups, options } = msg.payload;

    try {
      figma.ui.postMessage({ type: "LOG", payload: `Processing ${resolvedTokens.length} design tokens...` });

      let createdVarsCount = 0;
      let updatedVarsCount = 0;
      let linkedAliasesCount = 0;
      let createdStylesCount = 0;

      // Group resolved tokens by set name
      const setsMap: Record<string, any[]> = {};
      resolvedTokens.forEach((t: any) => {
        const setName = t.setName || "global";
        if (!setsMap[setName]) setsMap[setName] = [];
        setsMap[setName].push(t);
      });

      // A. Create & Update Figma Native Variables (with Theme Modes!)
      if (options.createVariables && figma.variables) {
        figma.ui.postMessage({ type: "LOG", payload: "Creating Variable Collections & Theme Modes..." });

        const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
        const existingVars = await figma.variables.getLocalVariablesAsync();

        // Index existing variables for fast lookup
        const existingVarsMap = new Map<string, Variable>();
        for (const v of existingVars) {
          existingVarsMap.set(`${v.variableCollectionId}::${v.name}`, v);
        }

        const processedSets = new Set<string>();
        const aliasTasks: Array<{
          variable: Variable;
          targetModeId: string;
          rawValue: any;
          resolvedValue: any;
          type: string;
          tokenName: string;
        }> = [];

        // 1. Process Theme Groups into Multi-Mode Figma Collections (e.g. Theme with Dark & Light modes)
        if (Array.isArray(themeGroups) && themeGroups.length > 0) {
          for (const grp of themeGroups) {
            if (!grp.options || grp.options.length === 0) continue;

            const cleanColName = grp.name.replace(/^[./\s]+|[./\s]+$/g, "").replace(/[/\\]+/g, " / ") || "Theme";
            let collection = existingCollections.find((c) => c.name === cleanColName);

            if (!collection) {
              collection = figma.variables.createVariableCollection(cleanColName);
              existingCollections.push(collection);
              figma.ui.postMessage({ type: "LOG", payload: `✓ Created collection "${cleanColName}"` });
            }

            const modeMap: Record<string, string> = {};

            // Rename default mode to first option
            if (collection.modes.length > 0 && grp.options[0]) {
              const firstOpt = grp.options[0];
              try {
                collection.renameMode(collection.modes[0].modeId, firstOpt.name);
                modeMap[firstOpt.name] = collection.modes[0].modeId;
              } catch {
                modeMap[firstOpt.name] = collection.defaultModeId;
              }
            }

            // Add additional modes for subsequent options
            for (let i = 1; i < grp.options.length; i++) {
              const opt = grp.options[i];
              let existingMode = collection.modes.find((m) => m.name.toLowerCase() === opt.name.toLowerCase());
              if (existingMode) {
                modeMap[opt.name] = existingMode.modeId;
              } else {
                try {
                  const newModeId = collection.addMode(opt.name);
                  modeMap[opt.name] = newModeId;
                  figma.ui.postMessage({ type: "LOG", payload: `✓ Added mode "${opt.name}" to "${cleanColName}"` });
                } catch (e: any) {
                  console.warn(`Could not add mode ${opt.name}:`, e);
                }
              }
            }

            // Populate variables for each theme option into its corresponding mode
            for (const opt of grp.options) {
              const targetModeId = modeMap[opt.name] || collection.defaultModeId;
              const selectedSets = opt.selectedTokenSets || {};

              for (const [sName, state] of Object.entries(selectedSets)) {
                if (state === "enabled" || state === "source") {
                  processedSets.add(sName);
                  const tokens = setsMap[sName] || [];

                  for (const token of tokens) {
                    const cleanVarName = token.name.replace(/^[./\s]+|[./\s]+$/g, "").replace(/[./\\]+/g, "/");
                    let figmaType: VariableResolvedDataType | null = null;
                    let value: any = null;

                    if (token.type === "color") {
                      figmaType = "COLOR";
                      value = parseColorToFigma(token.resolvedValue || token.rawValue);
                    } else if (
                      token.type === "dimension" ||
                      token.type === "spacing" ||
                      token.type === "sizing" ||
                      token.type === "borderRadius" ||
                      token.type === "borderWidth" ||
                      token.type === "opacity" ||
                      token.type === "fontSizes" ||
                      token.type === "lineHeights" ||
                      token.type === "letterSpacing" ||
                      token.type === "fontWeights" ||
                      token.type === "number"
                    ) {
                      figmaType = "FLOAT";
                      value = parseDimensionValue(token.resolvedValue || token.rawValue);
                    } else if (token.type !== "typography" && token.type !== "boxShadow") {
                      figmaType = "STRING";
                      value = String(token.resolvedValue || token.rawValue);
                    }

                    if (figmaType && value !== null) {
                      try {
                        const key = `${collection.id}::${cleanVarName}`;
                        let variable = existingVarsMap.get(key);

                        if (!variable) {
                          variable = figma.variables.createVariable(cleanVarName, collection, figmaType);
                          existingVarsMap.set(key, variable);
                          createdVarsCount++;
                        } else {
                          updatedVarsCount++;
                        }

                        variable.setValueForMode(targetModeId, value);

                        // Queue alias linking task
                        if (typeof token.rawValue === "string" && /\{[^}]+\}/.test(token.rawValue)) {
                          aliasTasks.push({
                            variable,
                            targetModeId,
                            rawValue: token.rawValue,
                            resolvedValue: token.resolvedValue,
                            type: token.type,
                            tokenName: token.name,
                          });
                        }
                      } catch (e: any) {
                        figma.ui.postMessage({
                          type: "LOG",
                          payload: `⚠ [Var Error] ${cleanVarName}: ${e.message}`,
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }

        // 2. Process Remaining Standalone Sets (e.g. Primitives, Global, Dimensions)
        for (const [setName, tokens] of Object.entries(setsMap)) {
          if (processedSets.has(setName) && Array.isArray(themeGroups) && themeGroups.length > 0) {
            continue;
          }

          const cleanColName = setName.replace(/^[./\s]+|[./\s]+$/g, "").replace(/[/\\]+/g, " / ") || "Tokens";
          let collection = existingCollections.find((c) => c.name === cleanColName);

          if (!collection) {
            collection = figma.variables.createVariableCollection(cleanColName);
            existingCollections.push(collection);
            figma.ui.postMessage({ type: "LOG", payload: `✓ Created collection "${cleanColName}"` });
          }

          const modeId = collection.defaultModeId;

          for (const token of tokens) {
            const cleanVarName = token.name.replace(/^[./\s]+|[./\s]+$/g, "").replace(/[./\\]+/g, "/");
            let figmaType: VariableResolvedDataType | null = null;
            let value: any = null;

            if (token.type === "color") {
              figmaType = "COLOR";
              value = parseColorToFigma(token.resolvedValue || token.rawValue);
            } else if (
              token.type === "dimension" ||
              token.type === "spacing" ||
              token.type === "sizing" ||
              token.type === "borderRadius" ||
              token.type === "borderWidth" ||
              token.type === "opacity" ||
              token.type === "fontSizes" ||
              token.type === "lineHeights" ||
              token.type === "letterSpacing" ||
              token.type === "fontWeights" ||
              token.type === "number"
            ) {
              figmaType = "FLOAT";
              value = parseDimensionValue(token.resolvedValue || token.rawValue);
            } else if (token.type !== "typography" && token.type !== "boxShadow") {
              figmaType = "STRING";
              value = String(token.resolvedValue || token.rawValue);
            }

            if (figmaType && value !== null) {
              try {
                const key = `${collection.id}::${cleanVarName}`;
                let variable = existingVarsMap.get(key);

                if (!variable) {
                  variable = figma.variables.createVariable(cleanVarName, collection, figmaType);
                  existingVarsMap.set(key, variable);
                  createdVarsCount++;
                } else {
                  updatedVarsCount++;
                }

                variable.setValueForMode(modeId, value);

                // Queue alias linking task
                if (typeof token.rawValue === "string" && /\{[^}]+\}/.test(token.rawValue)) {
                  aliasTasks.push({
                    variable,
                    targetModeId: modeId,
                    rawValue: token.rawValue,
                    resolvedValue: token.resolvedValue,
                    type: token.type,
                    tokenName: token.name,
                  });
                }
              } catch (e: any) {
                figma.ui.postMessage({
                  type: "LOG",
                  payload: `⚠ [Var Error] ${cleanVarName}: ${e.message}`,
                });
              }
            }
          }
        }

        // 3. PASS 2: Link Variable Aliases in Figma!
        if (aliasTasks.length > 0) {
          figma.ui.postMessage({ type: "LOG", payload: `Linking ${aliasTasks.length} variable aliases...` });

          const allFreshVars = await figma.variables.getLocalVariablesAsync();

          for (const task of aliasTasks) {
            const match = task.rawValue.match(/\{([^}]+)\}/);
            if (match && match[1]) {
              const aliasKey = match[1];
              const targetVar = findVariableByAlias(aliasKey, allFreshVars);

              if (targetVar && targetVar.id !== task.variable.id) {
                try {
                  const aliasObj = figma.variables.createVariableAlias(targetVar);
                  task.variable.setValueForMode(task.targetModeId, aliasObj);
                  linkedAliasesCount++;
                } catch (err: any) {
                  console.warn(`Could not link alias for ${task.tokenName}:`, err);
                }
              }
            }
          }

          if (linkedAliasesCount > 0) {
            figma.ui.postMessage({ type: "LOG", payload: `✓ Linked ${linkedAliasesCount} variable aliases!` });
          }
        }
      }

      // B. Create Paint Styles & Text Styles
      if (options.createStyles) {
        figma.ui.postMessage({ type: "LOG", payload: "Creating Paint & Text Styles..." });

        const existingPaintStyles = await figma.getLocalPaintStylesAsync();
        const existingTextStyles = await figma.getLocalTextStylesAsync();

        for (const token of resolvedTokens) {
          const styleName = `${token.setName}/${token.name.replace(/\./g, "/")}`;

          // Paint Style for Color
          if (token.type === "color") {
            const rgba = parseColorToFigma(token.resolvedValue || token.rawValue);
            let style = existingPaintStyles.find((s) => s.name === styleName);
            if (!style) {
              style = figma.createPaintStyle();
              style.name = styleName;
              createdStylesCount++;
            }
            style.paints = [
              {
                type: "SOLID",
                color: { r: rgba.r, g: rgba.g, b: rgba.b },
                opacity: rgba.a,
              },
            ];
          }

          // Text Style for Typography
          if (token.type === "typography") {
            try {
              let style = existingTextStyles.find((s) => s.name === styleName);
              if (!style) {
                style = figma.createTextStyle();
                style.name = styleName;
                createdStylesCount++;
              }

              let fontObj = token.resolvedValue || token.rawValue;
              if (typeof fontObj === "string") {
                try {
                  fontObj = JSON.parse(fontObj);
                } catch {
                  fontObj = {};
                }
              }

              const family = (fontObj.fontFamily || "Inter").replace(/['",]/g, "").split(" ")[0] || "Inter";
              const weightVal = fontObj.fontWeight || "400";
              let fontStyle = "Regular";
              if (String(weightVal).includes("700") || String(weightVal).toLowerCase().includes("bold")) {
                fontStyle = "Bold";
              } else if (String(weightVal).includes("600") || String(weightVal).toLowerCase().includes("semibold")) {
                fontStyle = "Semi Bold";
              } else if (String(weightVal).includes("500") || String(weightVal).toLowerCase().includes("medium")) {
                fontStyle = "Medium";
              }

              try {
                await figma.loadFontAsync({ family, style: fontStyle });
                style.fontName = { family, style: fontStyle };
              } catch {
                await figma.loadFontAsync({ family: "Inter", style: "Regular" });
                style.fontName = { family: "Inter", style: "Regular" };
              }

              if (fontObj.fontSize) {
                style.fontSize = parseDimensionValue(fontObj.fontSize);
              }
              if (fontObj.lineHeight) {
                const lh = parseDimensionValue(fontObj.lineHeight);
                style.lineHeight = { value: lh, unit: "PIXELS" };
              }
            } catch (err: any) {
              figma.ui.postMessage({
                type: "LOG",
                payload: `⚠ [Style Error] ${styleName}: ${err.message}`,
              });
            }
          }
        }
      }

      const totalCount = createdVarsCount + updatedVarsCount;
      figma.ui.postMessage({
        type: "PULL_SUCCESS",
        payload: {
          variablesCount: totalCount,
          stylesCount: createdStylesCount,
        },
      });

      figma.notify(`Synced ${totalCount} variables (${linkedAliasesCount} linked aliases) & ${createdStylesCount} styles!`);
    } catch (err: any) {
      figma.ui.postMessage({ type: "ERROR", payload: err.message });
      figma.notify(`Sync failed: ${err.message}`, { error: true });
    }
  }

  // 4. EXPORT FIGMA TO SECOND SCREEN
  if (msg.type === "EXPORT_FIGMA_TO_TOKENS") {
    try {
      figma.ui.postMessage({ type: "LOG", payload: "Scanning Figma Variables and Styles..." });

      const rawTokensDoc: Record<string, any> = {};

      if (figma.variables) {
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        const variables = await figma.variables.getLocalVariablesAsync();

        for (const collection of collections) {
          const colVars = variables.filter((v) => v.variableCollectionId === collection.id);

          for (const mode of collection.modes) {
            const setName = collection.modes.length > 1
              ? mode.name.toLowerCase()
              : collection.name.replace(/\s*\/\s*/g, "/");

            if (!rawTokensDoc[setName]) rawTokensDoc[setName] = {};

            for (const v of colVars) {
              const val = v.valuesByMode[mode.modeId];
              if (val === undefined) continue;

              const pathParts = v.name.split("/");
              let cur = rawTokensDoc[setName];
              for (let i = 0; i < pathParts.length - 1; i++) {
                if (!cur[pathParts[i]]) cur[pathParts[i]] = {};
                cur = cur[pathParts[i]];
              }

              const leafName = pathParts[pathParts.length - 1];

              if (val && typeof val === "object" && (val as any).type === "VARIABLE_ALIAS" && (val as any).id) {
                const targetVar = variables.find((tv) => tv.id === (val as any).id);
                if (targetVar) {
                  cur[leafName] = {
                    value: `{${targetVar.name.replace(/\//g, ".")}}`,
                    type: v.resolvedType === "COLOR" ? "color" : v.resolvedType === "FLOAT" ? "dimension" : "other",
                  };
                }
              } else if (v.resolvedType === "COLOR" && typeof val === "object" && val !== null) {
                const r = Math.round((val as any).r * 255).toString(16).padStart(2, "0");
                const g = Math.round((val as any).g * 255).toString(16).padStart(2, "0");
                const b = Math.round((val as any).b * 255).toString(16).padStart(2, "0");
                cur[leafName] = { value: `#${r}${g}${b}`, type: "color" };
              } else if (v.resolvedType === "FLOAT") {
                cur[leafName] = { value: `${val}px`, type: "dimension" };
              } else {
                cur[leafName] = { value: String(val), type: "other" };
              }
            }
          }
        }
      }

      // Export Paint Styles
      const paintStyles = await figma.getLocalPaintStylesAsync();
      if (paintStyles.length > 0) {
        if (!rawTokensDoc["styles"]) rawTokensDoc["styles"] = {};
        for (const style of paintStyles) {
          const paint = style.paints[0];
          if (paint && paint.type === "SOLID") {
            const r = Math.round(paint.color.r * 255).toString(16).padStart(2, "0");
            const g = Math.round(paint.color.g * 255).toString(16).padStart(2, "0");
            const b = Math.round(paint.color.b * 255).toString(16).padStart(2, "0");
            rawTokensDoc["styles"][style.name.replace(/\//g, ".")] = {
              value: `#${r}${g}${b}`,
              type: "color",
            };
          }
        }
      }

      figma.ui.postMessage({
        type: "EXPORTED_TOKENS",
        payload: {
          rawTokens: rawTokensDoc,
        },
      });

      figma.notify("Local Figma variables and styles scanned successfully.");
    } catch (err: any) {
      figma.ui.postMessage({ type: "ERROR", payload: err.message });
      figma.notify(`Export failed: ${err.message}`, { error: true });
    }
  }
};
