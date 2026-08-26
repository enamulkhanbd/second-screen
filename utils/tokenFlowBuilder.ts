import {
  RawTokensDocument,
  ThemeGroup,
  ThemeOption,
  TokenType,
} from "@/types/tokens";
import {
  isTokenLeaf,
  getLeafValue,
  getLeafType,
  resolveTokenAlias,
} from "@/utils/transformTokens";
import { getCategoryForType, TokenCategory } from "@/utils/themeHelpers";

export interface FlowTokenItem {
  id: string; // Full dot path or unique id, e.g. "dark.color.semantic.bg.brandStrong"
  key: string; // Dot path relative to set or full key, e.g. "color.semantic.bg.brandStrong"
  name: string; // Short display name, e.g. "brandStrong"
  setName: string; // e.g. "dark", "global", "components"
  pathSegments: string[];
  type: TokenType;
  category: TokenCategory;
  rawValue: string;
  resolvedValue: string;
  isAlias: boolean;
  aliasTargets: string[]; // Dot paths this token references, e.g. ["brand.color.palette.brand.500"]
  tier: "foundation" | "alias" | "component"; // Tier level
}

export interface FlowNodeGroup {
  id: string; // e.g. "set-global-color" or "set-dark"
  setName: string; // e.g. "global" or "dark"
  title: string; // e.g. "Global / Color" or "Dark Semantic"
  category: TokenCategory;
  tier: "foundation" | "alias" | "component";
  x: number;
  y: number;
  width: number;
  height: number;
  tokens: FlowTokenItem[];
}

export interface FlowEdge {
  id: string;
  sourceTokenId: string;
  targetTokenId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePoint: { x: number; y: number };
  targetPoint: { x: number; y: number };
  bezierPath: string;
  category: TokenCategory;
}

export interface FlowGraphData {
  nodes: FlowNodeGroup[];
  edges: FlowEdge[];
  allTokens: FlowTokenItem[];
  tokensById: Map<string, FlowTokenItem>;
  edgesBySource: Map<string, FlowEdge[]>;
  edgesByTarget: Map<string, FlowEdge[]>;
}

/**
 * Extracts alias references from raw value strings or objects (e.g. "{colors.blue.500}")
 */
export function extractAliasReferences(rawValue: string): string[] {
  if (!rawValue || typeof rawValue !== "string") return [];
  const regex = /\{([^}]+)\}/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(rawValue)) !== null) {
    if (match[1]) matches.push(match[1].trim());
  }
  return matches;
}

/**
 * Normalizes token paths and names for flexible dependency matching
 */
function normalizePath(p: any): string {
  const str = typeof p === "string" ? p : String(p || "");
  return str.toLowerCase().replace(/^[./\s]+|[./\s]+$/g, "").replace(/[/\\]/g, ".");
}

/**
 * Builds the visual dependency flow graph for a given raw tokens document and active theme option.
 */
export function buildTokenFlowGraph(
  rawDoc: RawTokensDocument,
  activeOption: ThemeOption | null,
  filterType: "all" | TokenCategory = "all",
  searchQuery: string = ""
): FlowGraphData {
  if (!rawDoc || typeof rawDoc !== "object") {
    return {
      nodes: [],
      edges: [],
      allTokens: [],
      tokensById: new Map(),
      edgesBySource: new Map(),
      edgesByTarget: new Map(),
    };
  }

  // 1. Identify which sets to process
  // If activeOption has selectedTokenSets, exclude only explicitly "disabled" sets.
  const disabledSetNorms = new Set<string>();
  if (activeOption && activeOption.selectedTokenSets) {
    Object.entries(activeOption.selectedTokenSets).forEach(([setName, status]) => {
      if (status === "disabled") {
        disabledSetNorms.add(normalizePath(setName));
      }
    });
  }

  const allDocKeys = Object.keys(rawDoc).filter(
    (k) =>
      !k.startsWith("$") &&
      !String(k).toLowerCase().includes("metadata") &&
      !String(k).toLowerCase().includes("$themes") &&
      typeof rawDoc[k] === "object" &&
      rawDoc[k] !== null &&
      !Array.isArray(rawDoc[k])
  );

  const setsToProcess = allDocKeys.filter((k) => {
    const norm = normalizePath(k);
    return !disabledSetNorms.has(norm);
  });

  // 2. Discover all tokens across enabled sets
  const discoveredTokens: FlowTokenItem[] = [];
  const tokensById = new Map<string, FlowTokenItem>();
  const tokenKeyToIdMap = new Map<string, string>();

  setsToProcess.forEach((setName) => {
    const setTree = rawDoc[setName];
    if (!setTree || typeof setTree !== "object") return;

    const traverse = (node: any, currentPath: string[]) => {
      if (!node || typeof node !== "object") return;

      if (isTokenLeaf(node)) {
        const fullKey = currentPath.join(".");
        const id = `${setName}.${fullKey}`;
        const rawValue = getLeafValue(node);
        const resolvedValue = resolveTokenAlias(rawValue, rawDoc, setName);
        const aliasTargets = extractAliasReferences(rawValue);
        const isAlias = aliasTargets.length > 0;
        const type = getLeafType(node, currentPath);
        const category = getCategoryForType(type);

        // Determine tier
        let tier: "foundation" | "alias" | "component" = "foundation";
        const lowerKey = String(fullKey || "").toLowerCase();
        const lowerSet = String(setName || "").toLowerCase();

        if (
          lowerKey.includes("component") ||
          lowerKey.includes("button") ||
          lowerKey.includes("input") ||
          lowerKey.includes("card") ||
          lowerKey.includes("nav") ||
          lowerSet.includes("component") ||
          lowerSet.includes("button")
        ) {
          tier = "component";
        } else if (
          isAlias ||
          lowerKey.includes("semantic") ||
          lowerKey.includes("alias") ||
          lowerSet.includes("semantic") ||
          lowerSet.includes("alias") ||
          lowerSet.includes("dark") ||
          lowerSet.includes("light") ||
          lowerSet.includes("mode") ||
          lowerSet.includes("theme")
        ) {
          tier = "alias";
        } else {
          tier = "foundation";
        }

        const tokenItem: FlowTokenItem = {
          id,
          key: fullKey,
          name: currentPath[currentPath.length - 1] || fullKey,
          setName,
          pathSegments: currentPath,
          type,
          category,
          rawValue,
          resolvedValue,
          isAlias,
          aliasTargets,
          tier,
        };

        discoveredTokens.push(tokenItem);
        tokensById.set(id, tokenItem);

        // Index various permutations of the key for alias lookups
        const normKey = normalizePath(fullKey);
        const normId = normalizePath(id);
        tokenKeyToIdMap.set(normKey, id);
        tokenKeyToIdMap.set(normId, id);

        // Also index with set stripped/attached
        const simpleName = currentPath[currentPath.length - 1];
        if (simpleName) {
          tokenKeyToIdMap.set(normalizePath(simpleName), id);
        }

        // Subpath keys (e.g. "colors.blue.500" -> "blue.500")
        for (let i = 1; i < currentPath.length; i++) {
          const subKey = currentPath.slice(i).join(".");
          tokenKeyToIdMap.set(normalizePath(subKey), id);
        }
        return;
      }

      for (const [key, child] of Object.entries(node)) {
        if (key.startsWith("$")) continue;
        traverse(child, [...currentPath, key]);
      }
    };

    traverse(setTree, []);
  });

  // 3. Apply type filtering & search filtering
  let filteredTokens = discoveredTokens;
  if (filterType !== "all") {
    filteredTokens = filteredTokens.filter((t) => t.category === filterType);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredTokens = filteredTokens.filter(
      (t) =>
        String(t.key || "").toLowerCase().includes(q) ||
        String(t.setName || "").toLowerCase().includes(q) ||
        String(t.rawValue || "").toLowerCase().includes(q) ||
        String(t.resolvedValue || "").toLowerCase().includes(q)
    );
  }

  // 4. Group tokens into visual node cards by Set & Category
  const groupMap = new Map<string, FlowNodeGroup>();
  const ITEM_HEIGHT = 38;
  const HEADER_HEIGHT = 46;
  const NODE_WIDTH = 320;

  filteredTokens.forEach((token) => {
    // Group by Set and Category
    const groupId = `grp-${token.setName}-${token.category}`;
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, {
        id: groupId,
        setName: token.setName,
        title: `${token.setName} • ${token.category}`,
        category: token.category,
        tier: token.tier,
        x: 0,
        y: 0,
        width: NODE_WIDTH,
        height: HEADER_HEIGHT,
        tokens: [],
      });
    }

    const group = groupMap.get(groupId)!;
    group.tokens.push(token);
    group.height = HEADER_HEIGHT + group.tokens.length * ITEM_HEIGHT + 12;
  });

  // Re-evaluate tier for each node group based on actual token alias composition
  groupMap.forEach((group) => {
    const aliasCount = group.tokens.filter((t) => t.isAlias).length;
    const lowerSet = String(group.setName || "").toLowerCase();
    if (
      lowerSet.includes("component") ||
      lowerSet.includes("button") ||
      lowerSet.includes("input") ||
      lowerSet.includes("card")
    ) {
      group.tier = "component";
    } else if (aliasCount > 0 || lowerSet.includes("semantic") || lowerSet.includes("alias") || lowerSet.includes("dark") || lowerSet.includes("light")) {
      group.tier = "alias";
    } else {
      group.tier = "foundation";
    }
  });

  // 5. Organize node positions into 3 distinct hierarchical columns (Foundation -> Alias -> Component)
  const tierColumns: Record<"foundation" | "alias" | "component", FlowNodeGroup[]> = {
    foundation: [],
    alias: [],
    component: [],
  };

  Array.from(groupMap.values()).forEach((node) => {
    tierColumns[node.tier].push(node);
  });

  // Sort nodes inside each column: Color first, then Typography, Spacing, Sizing, etc., then alphabetically by setName
  const categoryPriority: Record<TokenCategory, number> = {
    color: 1,
    typography: 2,
    spacing: 3,
    sizing: 4,
    borderRadius: 5,
    boxShadow: 6,
    opacity: 7,
    other: 8,
  };

  Object.keys(tierColumns).forEach((tierKey) => {
    const tier = tierKey as "foundation" | "alias" | "component";
    tierColumns[tier].sort((a, b) => {
      const pA = categoryPriority[a.category] || 99;
      const pB = categoryPriority[b.category] || 99;
      if (pA !== pB) return pA - pB;
      return a.setName.localeCompare(b.setName);
    });
  });

  const COL_X_GAP = 180;
  const ROW_Y_GAP = 36;
  const START_X = 80;
  const START_Y = 80;

  const columnOrder: Array<"foundation" | "alias" | "component"> = [
    "foundation",
    "alias",
    "component",
  ];

  let currentX = START_X;
  const nodeGroups: FlowNodeGroup[] = [];

  columnOrder.forEach((tier) => {
    const columnNodes = tierColumns[tier];
    let currentY = START_Y;

    columnNodes.forEach((node) => {
      node.x = currentX;
      node.y = currentY;
      currentY += node.height + ROW_Y_GAP;
      nodeGroups.push(node);
    });

    if (columnNodes.length > 0) {
      currentX += NODE_WIDTH + COL_X_GAP;
    }
  });

  // Map to find token's exact handle coordinates
  const tokenAnchorMap = new Map<
    string,
    { source: { x: number; y: number }; target: { x: number; y: number }; nodeId: string }
  >();

  nodeGroups.forEach((node) => {
    node.tokens.forEach((token, idx) => {
      const itemY = node.y + HEADER_HEIGHT + idx * ITEM_HEIGHT + ITEM_HEIGHT / 2;
      tokenAnchorMap.set(token.id, {
        source: { x: node.x + node.width, y: itemY },
        target: { x: node.x, y: itemY },
        nodeId: node.id,
      });
    });
  });

  // 6. Build connecting Bezier edges between tokens and their alias targets
  const edges: FlowEdge[] = [];
  const edgesBySource = new Map<string, FlowEdge[]>();
  const edgesByTarget = new Map<string, FlowEdge[]>();

  filteredTokens.forEach((targetToken) => {
    if (!targetToken.isAlias) return;

    targetToken.aliasTargets.forEach((rawAlias) => {
      const normAlias = normalizePath(rawAlias);
      let sourceTokenId = tokenKeyToIdMap.get(normAlias);

      // Flexible search for source token
      if (!sourceTokenId) {
        tokenKeyToIdMap.forEach((id, key) => {
          if (sourceTokenId) return;
          if (
            key === normAlias ||
            key.endsWith(`.${normAlias}`) ||
            normAlias.endsWith(`.${key}`) ||
            key.split(".").pop() === normAlias.split(".").pop()
          ) {
            sourceTokenId = id;
          }
        });
      }

      if (!sourceTokenId) return;

      const sourceAnchor = tokenAnchorMap.get(sourceTokenId);
      const targetAnchor = tokenAnchorMap.get(targetToken.id);

      if (sourceAnchor && targetAnchor) {
        const sx = sourceAnchor.source.x;
        const sy = sourceAnchor.source.y;
        const tx = targetAnchor.target.x;
        const ty = targetAnchor.target.y;

        const dx = Math.max(Math.abs(tx - sx) * 0.45, 60);
        const bezierPath = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;

        const edge: FlowEdge = {
          id: `edge-${sourceTokenId}-to-${targetToken.id}`,
          sourceTokenId,
          targetTokenId: targetToken.id,
          sourceNodeId: sourceAnchor.nodeId,
          targetNodeId: targetAnchor.nodeId,
          sourcePoint: { x: sx, y: sy },
          targetPoint: { x: tx, y: ty },
          bezierPath,
          category: targetToken.category,
        };

        edges.push(edge);

        if (!edgesBySource.has(sourceTokenId)) edgesBySource.set(sourceTokenId, []);
        edgesBySource.get(sourceTokenId)!.push(edge);

        if (!edgesByTarget.has(targetToken.id)) edgesByTarget.set(targetToken.id, []);
        edgesByTarget.get(targetToken.id)!.push(edge);
      }
    });
  });

  return {
    nodes: nodeGroups,
    edges,
    allTokens: filteredTokens,
    tokensById,
    edgesBySource,
    edgesByTarget,
  };
}

/**
 * Traces all upstream dependencies (ancestors) and downstream consumers (descendants) for a selected token.
 */
export function traceTokenDependencies(
  tokenId: string,
  edgesBySource: Map<string, FlowEdge[]>,
  edgesByTarget: Map<string, FlowEdge[]>
): {
  upstreamTokenIds: Set<string>;
  downstreamTokenIds: Set<string>;
  activeEdgeIds: Set<string>;
} {
  const upstreamTokenIds = new Set<string>();
  const downstreamTokenIds = new Set<string>();
  const activeEdgeIds = new Set<string>();

  // 1. Recursive Upstream (Ancestors)
  const findUpstream = (currId: string, visited: Set<string>) => {
    if (visited.has(currId)) return;
    visited.add(currId);

    const incomingEdges = edgesByTarget.get(currId) || [];
    incomingEdges.forEach((edge) => {
      activeEdgeIds.add(edge.id);
      upstreamTokenIds.add(edge.sourceTokenId);
      findUpstream(edge.sourceTokenId, visited);
    });
  };

  // 2. Recursive Downstream (Consumers)
  const findDownstream = (currId: string, visited: Set<string>) => {
    if (visited.has(currId)) return;
    visited.add(currId);

    const outgoingEdges = edgesBySource.get(currId) || [];
    outgoingEdges.forEach((edge) => {
      activeEdgeIds.add(edge.id);
      downstreamTokenIds.add(edge.targetTokenId);
      findDownstream(edge.targetTokenId, visited);
    });
  };

  findUpstream(tokenId, new Set());
  findDownstream(tokenId, new Set());

  return {
    upstreamTokenIds,
    downstreamTokenIds,
    activeEdgeIds,
  };
}
