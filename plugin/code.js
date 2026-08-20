// Show Plugin UI
figma.showUI(__html__, {
  width: 440,
  height: 620,
  themeColors: true,
});

/**
 * Robust color parser to Figma RGBA (0-1)
 */
function parseColorToFigma(colorInput) {
  if (typeof colorInput !== "string") {
    return { r: 0.5, g: 0.5, b: 0.5, a: 1 };
  }
  var str = colorInput.trim();

  // Hex (#rgb, #rrggbb, #rrggbbaa)
  if (str.startsWith("#")) {
    var hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map(function (c) { return c + c; }).join("");
    }
    if (hex.length === 6) {
      hex += "ff";
    }
    if (hex.length === 8) {
      var num = parseInt(hex, 16);
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

  // rgb/rgba (rgb(255, 0, 0) or rgba(255, 0, 0, 0.5))
  var rgbMatch = str.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
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
function parseDimensionValue(val) {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    var parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Flexible variable lookup for alias resolution across collections
 */
function findVariableByAlias(aliasStr, allVars) {
  if (!aliasStr) return undefined;
  var clean = aliasStr.replace(/[{}]/g, "").trim().toLowerCase();
  var slashPath = clean.replace(/\./g, "/");

  // 1. Exact slash match (e.g. "colors/brand/500")
  var match = allVars.find(function (v) { return v.name.toLowerCase() === slashPath; });
  if (match) return match;

  // 2. Match without set prefix (e.g. "global/colors/brand/500" vs "colors/brand/500")
  var parts = slashPath.split("/");
  if (parts.length > 1) {
    var subPath = parts.slice(1).join("/");
    match = allVars.find(function (v) {
      return v.name.toLowerCase() === subPath || v.name.toLowerCase().endsWith("/" + subPath);
    });
    if (match) return match;
  }

  // 3. Suffix match on the last 2 segments (e.g. "brand/500")
  if (parts.length >= 2) {
    var lastTwo = parts.slice(-2).join("/");
    match = allVars.find(function (v) { return v.name.toLowerCase().endsWith(lastTwo); });
    if (match) return match;
  }

  // 4. Exact last segment match
  var lastSeg = parts[parts.length - 1];
  if (lastSeg) {
    match = allVars.find(function (v) {
      var vLast = v.name.split("/").pop();
      return vLast ? vLast.toLowerCase() === lastSeg : false;
    });
    if (match) return match;
  }

  return undefined;
}

// -------------------------------------------------------------
// MESSAGE HANDLERS
// -------------------------------------------------------------
figma.ui.onmessage = async function (msg) {
  // 1. Initial Config Retrieval
  if (msg.type === "GET_SAVED_CONFIG") {
    var saved = await figma.clientStorage.getAsync("second_screen_config");
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
    var rawTokens = msg.payload.rawTokens;
    var resolvedTokens = msg.payload.resolvedTokens;
    var themeGroups = msg.payload.themeGroups;
    var options = msg.payload.options || {};

    try {
      figma.ui.postMessage({ type: "LOG", payload: "Processing " + resolvedTokens.length + " design tokens..." });

      var createdVarsCount = 0;
      var updatedVarsCount = 0;
      var linkedAliasesCount = 0;
      var createdStylesCount = 0;

      // Group resolved tokens by set name
      var setsMap = {};
      resolvedTokens.forEach(function (t) {
        var setName = t.setName || "global";
        if (!setsMap[setName]) setsMap[setName] = [];
        setsMap[setName].push(t);
      });

      // A. Create & Update Figma Native Variables (with Theme Modes!)
      if (options.createVariables && figma.variables) {
        figma.ui.postMessage({ type: "LOG", payload: "Creating Variable Collections & Theme Modes..." });

        var existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
        var existingVars = await figma.variables.getLocalVariablesAsync();

        // Index existing variables for fast lookup
        var existingVarsMap = new Map();
        for (var v of existingVars) {
          existingVarsMap.set(v.variableCollectionId + "::" + v.name, v);
        }

        var processedSets = new Set();
        var aliasTasks = [];

        // 1. Process Theme Groups into Multi-Mode Figma Collections (e.g. Theme with Dark & Light modes)
        if (Array.isArray(themeGroups) && themeGroups.length > 0) {
          for (var grp of themeGroups) {
            if (!grp.options || grp.options.length === 0) continue;

            var cleanColName = grp.name.replace(/^[./\s]+|[./\s]+$/g, "").replace(/[/\\]+/g, " / ") || "Theme";
            var collection = existingCollections.find(function (c) { return c.name === cleanColName; });

            if (!collection) {
              collection = figma.variables.createVariableCollection(cleanColName);
              existingCollections.push(collection);
              figma.ui.postMessage({ type: "LOG", payload: '✓ Created collection "' + cleanColName + '"' });
            }

            var modeMap = {};

            // Rename default mode to first option
            if (collection.modes.length > 0 && grp.options[0]) {
              var firstOpt = grp.options[0];
              try {
                collection.renameMode(collection.modes[0].modeId, firstOpt.name);
                modeMap[firstOpt.name] = collection.modes[0].modeId;
              } catch (e) {
                modeMap[firstOpt.name] = collection.defaultModeId;
              }
            }

            // Add additional modes for subsequent options
            for (var i = 1; i < grp.options.length; i++) {
              var opt = grp.options[i];
              var existingMode = collection.modes.find(function (m) {
                return m.name.toLowerCase() === opt.name.toLowerCase();
              });
              if (existingMode) {
                modeMap[opt.name] = existingMode.modeId;
              } else {
                try {
                  var newModeId = collection.addMode(opt.name);
                  modeMap[opt.name] = newModeId;
                  figma.ui.postMessage({ type: "LOG", payload: '✓ Added mode "' + opt.name + '" to "' + cleanColName + '"' });
                } catch (e) {
                  console.warn("Could not add mode " + opt.name + ":", e);
                }
              }
            }

            // Populate variables for each theme option into its corresponding mode
            for (var option of grp.options) {
              var targetModeId = modeMap[option.name] || collection.defaultModeId;
              var selectedSets = option.selectedTokenSets || {};

              for (var sName of Object.keys(selectedSets)) {
                var state = selectedSets[sName];
                if (state === "enabled" || state === "source") {
                  processedSets.add(sName);
                  var tokens = setsMap[sName] || [];

                  for (var token of tokens) {
                    var cleanVarName = token.name.replace(/^[./\s]+|[./\s]+$/g, "").replace(/[./\\]+/g, "/");
                    var figmaType = null;
                    var value = null;

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
                        var key = collection.id + "::" + cleanVarName;
                        var variable = existingVarsMap.get(key);

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
                            variable: variable,
                            targetModeId: targetModeId,
                            rawValue: token.rawValue,
                            resolvedValue: token.resolvedValue,
                            type: token.type,
                            tokenName: token.name,
                          });
                        }
                      } catch (e) {
                        figma.ui.postMessage({
                          type: "LOG",
                          payload: "⚠ [Var Error] " + cleanVarName + ": " + e.message,
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
        for (var setName of Object.keys(setsMap)) {
          if (processedSets.has(setName) && Array.isArray(themeGroups) && themeGroups.length > 0) {
            continue;
          }

          var tokens = setsMap[setName];
          var cleanColName = setName.replace(/^[./\s]+|[./\s]+$/g, "").replace(/[/\\]+/g, " / ") || "Tokens";
          var collection = existingCollections.find(function (c) { return c.name === cleanColName; });

          if (!collection) {
            collection = figma.variables.createVariableCollection(cleanColName);
            existingCollections.push(collection);
            figma.ui.postMessage({ type: "LOG", payload: '✓ Created collection "' + cleanColName + '"' });
          }

          var modeId = collection.defaultModeId;

          for (var token of tokens) {
            var cleanVarName = token.name.replace(/^[./\s]+|[./\s]+$/g, "").replace(/[./\\]+/g, "/");
            var figmaType = null;
            var value = null;

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
                var key = collection.id + "::" + cleanVarName;
                var variable = existingVarsMap.get(key);

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
                    variable: variable,
                    targetModeId: modeId,
                    rawValue: token.rawValue,
                    resolvedValue: token.resolvedValue,
                    type: token.type,
                    tokenName: token.name,
                  });
                }
              } catch (e) {
                figma.ui.postMessage({
                  type: "LOG",
                  payload: "⚠ [Var Error] " + cleanVarName + ": " + e.message,
                });
              }
            }
          }
        }

        // 3. PASS 2: Link Variable Aliases in Figma!
        if (aliasTasks.length > 0) {
          figma.ui.postMessage({ type: "LOG", payload: "Linking " + aliasTasks.length + " variable aliases..." });

          var allFreshVars = await figma.variables.getLocalVariablesAsync();

          for (var task of aliasTasks) {
            var match = task.rawValue.match(/\{([^}]+)\}/);
            if (match && match[1]) {
              var aliasKey = match[1];
              var targetVar = findVariableByAlias(aliasKey, allFreshVars);

              if (targetVar && targetVar.id !== task.variable.id) {
                try {
                  var aliasObj = figma.variables.createVariableAlias(targetVar);
                  task.variable.setValueForMode(task.targetModeId, aliasObj);
                  linkedAliasesCount++;
                } catch (err) {
                  console.warn("Could not link alias for " + task.tokenName + ":", err);
                }
              }
            }
          }

          if (linkedAliasesCount > 0) {
            figma.ui.postMessage({ type: "LOG", payload: "✓ Linked " + linkedAliasesCount + " variable aliases!" });
          }
        }
      }

      // B. Create Paint Styles & Text Styles
      if (options.createStyles) {
        figma.ui.postMessage({ type: "LOG", payload: "Creating Paint & Text Styles..." });

        var existingPaintStyles = await figma.getLocalPaintStylesAsync();
        var existingTextStyles = await figma.getLocalTextStylesAsync();

        for (var token of resolvedTokens) {
          var styleName = token.setName + "/" + token.name.replace(/\./g, "/");

          // Paint Style for Color
          if (token.type === "color") {
            var rgba = parseColorToFigma(token.resolvedValue || token.rawValue);
            var paintStyle = existingPaintStyles.find(function (s) { return s.name === styleName; });
            if (!paintStyle) {
              paintStyle = figma.createPaintStyle();
              paintStyle.name = styleName;
              createdStylesCount++;
            }
            paintStyle.paints = [
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
              var textStyle = existingTextStyles.find(function (s) { return s.name === styleName; });
              if (!textStyle) {
                textStyle = figma.createTextStyle();
                textStyle.name = styleName;
                createdStylesCount++;
              }

              var fontObj = token.resolvedValue || token.rawValue;
              if (typeof fontObj === "string") {
                try {
                  fontObj = JSON.parse(fontObj);
                } catch (e) {
                  fontObj = {};
                }
              }

              var family = (fontObj.fontFamily || "Inter").replace(/['",]/g, "").split(" ")[0] || "Inter";
              var weightVal = fontObj.fontWeight || "400";
              var fontStyle = "Regular";
              if (String(weightVal).includes("700") || String(weightVal).toLowerCase().includes("bold")) {
                fontStyle = "Bold";
              } else if (String(weightVal).includes("600") || String(weightVal).toLowerCase().includes("semibold")) {
                fontStyle = "Semi Bold";
              } else if (String(weightVal).includes("500") || String(weightVal).toLowerCase().includes("medium")) {
                fontStyle = "Medium";
              }

              try {
                await figma.loadFontAsync({ family: family, style: fontStyle });
                textStyle.fontName = { family: family, style: fontStyle };
              } catch (err) {
                await figma.loadFontAsync({ family: "Inter", style: "Regular" });
                textStyle.fontName = { family: "Inter", style: "Regular" };
              }

              if (fontObj.fontSize) {
                textStyle.fontSize = parseDimensionValue(fontObj.fontSize);
              }
              if (fontObj.lineHeight) {
                var lh = parseDimensionValue(fontObj.lineHeight);
                textStyle.lineHeight = { value: lh, unit: "PIXELS" };
              }
            } catch (err) {
              figma.ui.postMessage({
                type: "LOG",
                payload: "⚠ [Style Error] " + styleName + ": " + err.message,
              });
            }
          }
        }
      }

      var totalCount = createdVarsCount + updatedVarsCount;
      figma.ui.postMessage({
        type: "PULL_SUCCESS",
        payload: {
          variablesCount: totalCount,
          stylesCount: createdStylesCount,
        },
      });

      figma.notify("Synced " + totalCount + " variables (" + linkedAliasesCount + " linked aliases) & " + createdStylesCount + " styles!");
    } catch (err) {
      figma.ui.postMessage({ type: "ERROR", payload: err.message });
      figma.notify("Sync failed: " + err.message, { error: true });
    }
  }

  // 4. EXPORT FIGMA TO SECOND SCREEN
  if (msg.type === "EXPORT_FIGMA_TO_TOKENS") {
    try {
      figma.ui.postMessage({ type: "LOG", payload: "Scanning Figma Variables and Styles..." });

      var rawTokensDoc = {};

      if (figma.variables) {
        var collections = await figma.variables.getLocalVariableCollectionsAsync();
        var variables = await figma.variables.getLocalVariablesAsync();

        for (var col of collections) {
          var colVars = variables.filter(function (v) { return v.variableCollectionId === col.id; });

          for (var mode of col.modes) {
            var setName = col.modes.length > 1
              ? mode.name.toLowerCase()
              : col.name.replace(/\s*\/\s*/g, "/");

            if (!rawTokensDoc[setName]) rawTokensDoc[setName] = {};

            for (var v of colVars) {
              var val = v.valuesByMode[mode.modeId];
              if (val === undefined) continue;

              var pathParts = v.name.split("/");
              var cur = rawTokensDoc[setName];
              for (var i = 0; i < pathParts.length - 1; i++) {
                if (!cur[pathParts[i]]) cur[pathParts[i]] = {};
                cur = cur[pathParts[i]];
              }

              var leafName = pathParts[pathParts.length - 1];

              if (val && typeof val === "object" && val.type === "VARIABLE_ALIAS" && val.id) {
                var targetVar = variables.find(function (tv) { return tv.id === val.id; });
                if (targetVar) {
                  cur[leafName] = {
                    value: "{" + targetVar.name.replace(/\//g, ".") + "}",
                    type: v.resolvedType === "COLOR" ? "color" : v.resolvedType === "FLOAT" ? "dimension" : "other",
                  };
                }
              } else if (v.resolvedType === "COLOR" && typeof val === "object" && val !== null) {
                var r = Math.round(val.r * 255).toString(16).padStart(2, "0");
                var g = Math.round(val.g * 255).toString(16).padStart(2, "0");
                var b = Math.round(val.b * 255).toString(16).padStart(2, "0");
                cur[leafName] = { value: "#" + r + g + b, type: "color" };
              } else if (v.resolvedType === "FLOAT") {
                cur[leafName] = { value: val + "px", type: "dimension" };
              } else {
                cur[leafName] = { value: String(val), type: "other" };
              }
            }
          }
        }
      }

      // Export Paint Styles
      var paintStyles = await figma.getLocalPaintStylesAsync();
      if (paintStyles.length > 0) {
        if (!rawTokensDoc["styles"]) rawTokensDoc["styles"] = {};
        for (var style of paintStyles) {
          var paint = style.paints[0];
          if (paint && paint.type === "SOLID") {
            var pr = Math.round(paint.color.r * 255).toString(16).padStart(2, "0");
            var pg = Math.round(paint.color.g * 255).toString(16).padStart(2, "0");
            var pb = Math.round(paint.color.b * 255).toString(16).padStart(2, "0");
            rawTokensDoc["styles"][style.name.replace(/\//g, ".")] = {
              value: "#" + pr + pg + pb,
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
    } catch (err) {
      figma.ui.postMessage({ type: "ERROR", payload: err.message });
      figma.notify("Export failed: " + err.message, { error: true });
    }
  }
};
