"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  FlowGraphData,
  FlowTokenItem,
  FlowNodeGroup,
  FlowEdge,
} from "@/utils/tokenFlowBuilder";
import { FlowNodeCard } from "@/components/FlowNodeCard";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Sparkles,
  LayoutGrid,
} from "lucide-react";

interface FlowCanvasProps {
  graphData: FlowGraphData;
  selectedToken: FlowTokenItem | null;
  upstreamTokenIds: Set<string>;
  downstreamTokenIds: Set<string>;
  activeEdgeIds: Set<string>;
  onSelectToken: (token: FlowTokenItem | null) => void;
}

const ITEM_HEIGHT = 38;
const HEADER_HEIGHT = 46;

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
  graphData,
  selectedToken,
  upstreamTokenIds,
  downstreamTokenIds,
  activeEdgeIds,
  onSelectToken,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Viewport transformation state - default: 100% zoom (1.0)
  const [pan, setPan] = useState({ x: 60, y: 60 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Custom node positions
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodeDragStart, setNodeDragStart] = useState({
    mouseX: 0,
    mouseY: 0,
    initialX: 0,
    initialY: 0,
  });

  // Track latest pan and zoom in refs for high-fps event handlers
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  panRef.current = pan;
  zoomRef.current = zoom;

  // Sync node positions on graphData change
  useEffect(() => {
    setNodePositions((prev) => {
      const updated: Record<string, { x: number; y: number }> = {};
      graphData.nodes.forEach((n) => {
        updated[n.id] = prev[n.id] || { x: n.x, y: n.y };
      });
      return updated;
    });
  }, [graphData.nodes]);

  // Initial Load: Center view with 100% zoom (1.0)
  useEffect(() => {
    if (graphData.nodes.length > 0) {
      setZoom(1);
      setPan({ x: 60, y: 60 });
    }
  }, [graphData.nodes.length === 0]);

  // Handle Pan Drag (Canvas Background)
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".flow-node-card") || e.button !== 0) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y });
  };

  // Start Node Drag
  const handleStartNodeDrag = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      const node = graphData.nodes.find((n) => n.id === nodeId);
      const currPos = nodePositions[nodeId] || (node ? { x: node.x, y: node.y } : { x: 0, y: 0 });
      setDraggingNodeId(nodeId);
      setNodeDragStart({
        mouseX: e.clientX,
        mouseY: e.clientY,
        initialX: currPos.x,
        initialY: currPos.y,
      });
    },
    [graphData.nodes, nodePositions]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        // 1. Moving a Node Card
        if (draggingNodeId) {
          const deltaX = (e.clientX - nodeDragStart.mouseX) / zoomRef.current;
          const deltaY = (e.clientY - nodeDragStart.mouseY) / zoomRef.current;
          setNodePositions((prev) => ({
            ...prev,
            [draggingNodeId]: {
              x: Math.round(nodeDragStart.initialX + deltaX),
              y: Math.round(nodeDragStart.initialY + deltaY),
            },
          }));
          return;
        }

        // 2. Panning the Canvas
        if (isDragging) {
          setPan({
            x: Math.round(e.clientX - dragStart.x),
            y: Math.round(e.clientY - dragStart.y),
          });
        }
      });
    },
    [draggingNodeId, nodeDragStart, isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsDragging(false);
    setDraggingNodeId(null);
  }, []);

  useEffect(() => {
    if (isDragging || draggingNodeId) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isDragging, draggingNodeId, handleMouseMove, handleMouseUp]);

  // Smooth Zoom with mouse wheel (damped exponential step)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;

    // Damped zoom factor for ultra-smooth scrolling on both wheel and trackpad
    const zoomFactor = Math.exp(-e.deltaY * 0.0018);
    let newZoom = currentZoom * zoomFactor;
    newZoom = Math.min(Math.max(newZoom, 0.25), 2.5);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom centered at cursor
      const newPanX = mouseX - (mouseX - currentPan.x) * (newZoom / currentZoom);
      const newPanY = mouseY - (mouseY - currentPan.y) * (newZoom / currentZoom);

      setZoom(newZoom);
      setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
    } else {
      setZoom(newZoom);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.15, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.15, 0.25));
  const handleReset = () => {
    setPan({ x: 60, y: 60 });
    setZoom(1);
  };

  // Reset to auto-arranged layout at 100% zoom
  const handleAutoArrange = () => {
    const fresh: Record<string, { x: number; y: number }> = {};
    graphData.nodes.forEach((n) => {
      fresh[n.id] = { x: n.x, y: n.y };
    });
    setNodePositions(fresh);
    setPan({ x: 60, y: 60 });
    setZoom(1);
  };

  const handleFitView = useCallback(() => {
    if (!containerRef.current || graphData.nodes.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    graphData.nodes.forEach((n) => {
      const pos = nodePositions[n.id] || { x: n.x, y: n.y };
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + n.width);
      maxY = Math.max(maxY, pos.y + n.height);
    });

    const graphWidth = maxX - minX + 160;
    const graphHeight = maxY - minY + 160;

    const scaleX = rect.width / graphWidth;
    const scaleY = rect.height / graphHeight;
    const fitZoom = Math.min(Math.max(Math.min(scaleX, scaleY) * 0.9, 0.25), 1.2);

    const fitPanX = (rect.width - (maxX - minX) * fitZoom) / 2 - minX * fitZoom;
    const fitPanY = (rect.height - (maxY - minY) * fitZoom) / 2 - minY * fitZoom;

    setZoom(fitZoom);
    setPan({ x: Math.round(fitPanX), y: Math.round(fitPanY) });
  }, [graphData.nodes, nodePositions]);

  // Dynamically calculate bezier curve paths based on live node positions
  const dynamicEdges = useMemo(() => {
    const nodeMap = new Map<string, { x: number; y: number; width: number; height: number; tokens: FlowTokenItem[] }>();
    graphData.nodes.forEach((n) => {
      const pos = nodePositions[n.id] || { x: n.x, y: n.y };
      nodeMap.set(n.id, {
        x: pos.x,
        y: pos.y,
        width: n.width,
        height: n.height,
        tokens: n.tokens,
      });
    });

    const tokenAnchorMap = new Map<
      string,
      { source: { x: number; y: number }; target: { x: number; y: number } }
    >();

    nodeMap.forEach((node) => {
      node.tokens.forEach((token, idx) => {
        const itemY = node.y + HEADER_HEIGHT + idx * ITEM_HEIGHT + ITEM_HEIGHT / 2;
        tokenAnchorMap.set(token.id, {
          source: { x: node.x + node.width, y: itemY },
          target: { x: node.x, y: itemY },
        });
      });
    });

    return graphData.edges.map((edge) => {
      const src = tokenAnchorMap.get(edge.sourceTokenId);
      const tgt = tokenAnchorMap.get(edge.targetTokenId);
      if (!src || !tgt) return edge;

      const sx = src.source.x;
      const sy = src.source.y;
      const tx = tgt.target.x;
      const ty = tgt.target.y;
      const dx = Math.max(Math.abs(tx - sx) * 0.45, 60);
      const bezierPath = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;

      return {
        ...edge,
        sourcePoint: { x: sx, y: sy },
        targetPoint: { x: tx, y: ty },
        bezierPath,
      };
    });
  }, [graphData.nodes, graphData.edges, nodePositions]);

  const hasSelection = selectedToken !== null;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      className={`relative w-full h-full bg-slate-100 dark:bg-[#08080c] overflow-hidden select-none ${
        draggingNodeId ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing"
      }`}
    >
      {/* Background Dot Grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 dark:opacity-20">
        <defs>
          <pattern
            id="flow-grid"
            x={pan.x % (24 * zoom)}
            y={pan.y % (24 * zoom)}
            width={24 * zoom}
            height={24 * zoom}
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1.5" cy="1.5" r="1" className="fill-zinc-400 dark:fill-zinc-600" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#flow-grid)" />
      </svg>

      {/* Main Canvas World Space with GPU hardware acceleration */}
      <div
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: "0 0",
          willChange: isDragging || draggingNodeId ? "transform" : "auto",
        }}
        className="absolute top-0 left-0 w-full h-full pointer-events-auto"
      >
        {/* SVG Bezier Curves Layer */}
        <svg className="absolute top-0 left-0 w-[8000px] h-[8000px] pointer-events-none overflow-visible">
          <defs>
            {/* Linear gradient for glowing edges */}
            <linearGradient id="edge-active-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            <filter id="edge-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render All Dynamic Graph Edges */}
          {dynamicEdges.map((edge) => {
            const isActive = activeEdgeIds.has(edge.id);
            const isDimmed = hasSelection && !isActive;

            return (
              <g key={edge.id} className="transition-opacity duration-150">
                {/* Background Shadow / Glow Wire for Active Edges */}
                {isActive && (
                  <path
                    d={edge.bezierPath}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="5"
                    strokeOpacity="0.45"
                    filter="url(#edge-glow)"
                  />
                )}

                {/* Main Bezier Curve Wire */}
                <path
                  d={edge.bezierPath}
                  fill="none"
                  stroke={
                    isActive
                      ? "url(#edge-active-grad)"
                      : isDimmed
                      ? "#a1a1aa"
                      : "#71717a"
                  }
                  strokeWidth={isActive ? "2.5" : "1.5"}
                  strokeOpacity={isDimmed ? 0.2 : isActive ? 1 : 0.65}
                />

                {/* Animated pulse dot on active edges */}
                {isActive && (
                  <circle r="3" fill="#ffffff" filter="url(#edge-glow)">
                    <animateMotion
                      path={edge.bezierPath}
                      dur="2.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* DOM Node Cards Layer */}
        {graphData.nodes.map((node) => (
          <div key={node.id} className="flow-node-card">
            <FlowNodeCard
              node={node}
              position={nodePositions[node.id]}
              selectedTokenId={selectedToken?.id || null}
              upstreamTokenIds={upstreamTokenIds}
              downstreamTokenIds={downstreamTokenIds}
              onStartDrag={handleStartNodeDrag}
              onSelectToken={(token) => {
                if (selectedToken?.id === token.id) {
                  onSelectToken(null);
                } else {
                  onSelectToken(token);
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Floating Canvas Controls (Bottom Left) */}
      <div className="absolute left-6 bottom-6 flex items-center gap-1.5 p-1 bg-white/90 dark:bg-[#121218]/90 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl dark:shadow-2xl backdrop-blur-md z-20">
        <button
          onClick={handleZoomIn}
          className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800" />
        <button
          onClick={handleFitView}
          className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          title="Fit View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleAutoArrange}
          className="p-2 text-zinc-600 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          title="Auto-Arrange Layout (100% Zoom)"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          title="Reset to 100% Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="px-2 font-mono text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Empty Graph State */}
      {graphData.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center pointer-events-none">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-zinc-300">No Flow Nodes Found</h4>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            Try adjusting your search query or selected token type filter to reveal graph connections.
          </p>
        </div>
      )}
    </div>
  );
};
