"use client";

import React, { useState, useMemo, useRef } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { ProjectAsset, AssetGitConfig, AssetFigmaConfig, FigmaSourceLink } from "@/types/tenant";
import JSZip from "jszip";
import {
  Image as ImageIcon,
  Search,
  Download,
  Copy,
  Check,
  Plus,
  FolderGit2,
  RefreshCw,
  MoreVertical,
  Edit2,
  Trash2,
  UploadCloud,
  CheckSquare,
  Square,
  AlertCircle,
  Folder,
  Layers,
  Sparkles,
  PlusCircle,
  Bot,
  AlertTriangle,
  Activity,
  MoveRight,
  Award,
  Bookmark,
  Building,
  Briefcase,
  CheckCircle2,
  Shirt,
  Navigation,
  FileText,
  Settings,
  Shield,
  Heart,
  Globe,
  Grid,
  GitBranch,
  ShieldCheck,
  FolderUp,
  ChevronDown,
  Figma,
  ExternalLink,
  Link2,
  Pause,
  Play,
  Unlink,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const KNOWN_TYPE_NAMES = new Set([
  "stroke", "twotone", "two-tone", "two tone", "solid", "filled", "outline", "bulk", "broken", "linear",
  "bold", "curved", "light", "thin", "duotone", "duo-tone", "duo tone", "regular", "glyph", "sharp", "flat"
]);

/**
 * Formats a category or type name by replacing hyphens and underscores with spaces and applying Title Case.
 * e.g. "add-remove-delete" -> "Add Remove Delete", "two-tone" -> "Two Tone"
 */
export function formatCategoryName(category?: string): string {
  if (!category) return "General";
  return category
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Returns a contextual icon for category names
 */
function getCategoryIcon(categoryName: string) {
  const c = categoryName.toLowerCase();
  if (c.includes("add") || c.includes("remove") || c.includes("delete") || c.includes("plus")) return PlusCircle;
  if (c.includes("ai") || c.includes("bot") || c.includes("robot") || c.includes("smart")) return Bot;
  if (c.includes("alert") || c.includes("warning") || c.includes("error") || c.includes("danger")) return AlertTriangle;
  if (c.includes("anim") || c.includes("motion") || c.includes("graph")) return Activity;
  if (c.includes("arrow") || c.includes("direction") || c.includes("chevron")) return MoveRight;
  if (c.includes("award") || c.includes("badge") || c.includes("trophy") || c.includes("star")) return Award;
  if (c.includes("book") || c.includes("mark") || c.includes("save")) return Bookmark;
  if (c.includes("build") || c.includes("house") || c.includes("city") || c.includes("home")) return Building;
  if (c.includes("business") || c.includes("finance") || c.includes("work") || c.includes("chart")) return Briefcase;
  if (c.includes("check") || c.includes("success") || c.includes("verify") || c.includes("done")) return CheckCircle2;
  if (c.includes("cloth") || c.includes("fashion") || c.includes("wear")) return Shirt;
  if (c.includes("nav") || c.includes("menu") || c.includes("route")) return Navigation;
  if (c.includes("file") || c.includes("doc") || c.includes("page")) return FileText;
  if (c.includes("setting") || c.includes("gear") || c.includes("tool") || c.includes("config")) return Settings;
  if (c.includes("shield") || c.includes("security") || c.includes("lock") || c.includes("safe")) return Shield;
  if (c.includes("heart") || c.includes("like") || c.includes("favorite")) return Heart;
  if (c.includes("globe") || c.includes("web") || c.includes("network")) return Globe;
  return Folder;
}

/**
 * Normalizes string keys for flexible metadata matching
 */
function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/^icon[-_]?/i, "")
    .replace(/[^a-z0-9]/g, "");
}

interface RawMetadataItem {
  name?: string;
  title?: string;
  type?: string;
  iconType?: string;
  icon_type?: string;
  variant?: string;
  style?: string;
  tag?: string;
  category?: string;
  [key: string]: any;
}

function parseMetadataJson(content: string): Map<string, RawMetadataItem> {
  const map = new Map<string, RawMetadataItem>();
  try {
    const parsed = JSON.parse(content);
    const items: RawMetadataItem[] = Array.isArray(parsed)
      ? parsed
      : parsed.icons && Array.isArray(parsed.icons)
      ? parsed.icons
      : typeof parsed === "object"
      ? Object.entries(parsed).map(([k, v]: [string, any]) => ({
          name: k,
          ...(typeof v === "object" && v !== null ? v : {}),
        }))
      : [];

    for (const item of items) {
      if (!item) continue;
      const typeKey = (item.type || item.iconType || item.icon_type || item.variant || "").trim();

      if (item.name) {
        const normName = normalizeKey(item.name);
        if (typeKey) {
          map.set(`${normalizeKey(typeKey)}::${normName}`, item);
          map.set(`${typeKey.toLowerCase()}::${item.name.toLowerCase()}`, item);
        }
        if (!map.has(normName)) {
          map.set(normName, item);
          map.set(item.name.toLowerCase(), item);
        }
      }
      if (item.title) {
        const normTitle = normalizeKey(item.title);
        if (typeKey) {
          map.set(`${normalizeKey(typeKey)}::${normTitle}`, item);
          map.set(`${typeKey.toLowerCase()}::${item.title.toLowerCase()}`, item);
        }
        if (!map.has(normTitle)) {
          map.set(normTitle, item);
          map.set(item.title.toLowerCase(), item);
        }
      }
    }
  } catch (err) {
    console.warn("Failed to parse metadata.json:", err);
  }
  return map;
}

/**
 * Intelligently decomposes a relative file path (e.g. "icons/Two Tone/add-remove-delete/icon-unavailable.svg")
 */
function parseRawPathMeta(relativePath: string): { derivedType?: string; derivedCategory: string; stem: string } {
  const clean = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  let parts = clean.split("/").filter(Boolean);
  const fileName = parts.pop() || "";
  const stem = fileName.replace(/\.svg$/i, "");

  // Strip generic root prefixes if present (e.g. "icons", "assets", "svg", "dist", "src")
  if (parts.length > 0 && /^(icons?|assets?|svgs?|dist|src|build|exports?)$/i.test(parts[0])) {
    parts = parts.slice(1);
  }

  let derivedType: string | undefined = undefined;
  let derivedCategory = "general";

  // Check if any path segment matches a known type
  let typeIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    const norm = normalizeKey(parts[i]);
    const lower = parts[i].toLowerCase();
    if (KNOWN_TYPE_NAMES.has(norm) || KNOWN_TYPE_NAMES.has(lower)) {
      typeIndex = i;
      derivedType = parts[i];
      break;
    }
  }

  if (typeIndex !== -1) {
    const catParts = parts.filter((_, idx) => idx !== typeIndex);
    derivedCategory = catParts.length > 0 ? catParts.join("-") : "general";
  } else if (parts.length >= 2) {
    derivedType = parts[0];
    derivedCategory = parts.slice(1).join("-");
  } else if (parts.length === 1) {
    const single = parts[0];
    const normSingle = normalizeKey(single);
    if (KNOWN_TYPE_NAMES.has(normSingle) || KNOWN_TYPE_NAMES.has(single.toLowerCase())) {
      derivedType = single;
      derivedCategory = "general";
    } else {
      derivedCategory = single;
    }
  }

  return { derivedType, derivedCategory, stem };
}

export const AssetsView: React.FC = () => {
  const {
    currentProject,
    assets: storeAssets,
    uploadAssets,
    applyMetadataToAssets,
    updateAsset,
    updateAssets,
    deleteAsset,
    deleteAssets,
    assetGitConfig,
    setAssetGitConfig,
    syncAssetsFromGit,
    togglePauseAssetGit,
    disconnectAssetGit,
    isSyncingAssets,
    assetFigmaConfig,
    setAssetFigmaConfig,
    setFigmaPat,
    addFigmaSource,
    updateFigmaSource,
    removeFigmaSource,
    togglePauseFigmaSource,
    syncSingleFigmaSource,
    syncAllFigmaSources,
    togglePauseFigmaSync,
    syncAssetsFromFigma,
    isSyncingFigmaAssets,
    addToast,
    canUserEdit,
  } = useTokenStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFigmaSource, setSelectedFigmaSource] = useState<string>("all");
  const [showSourceBadges, setShowSourceBadges] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selection & Bulk Actions State
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkMetadataOpen, setIsBulkMetadataOpen] = useState(false);
  const [singleDeleteAsset, setSingleDeleteAsset] = useState<ProjectAsset | null>(null);

  // Drag and Drop Zone State
  const [isDragOver, setIsDragOver] = useState(false);

  // File Upload Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replacingAssetId, setReplacingAssetId] = useState<string | null>(null);

  // Modals & Drawer State
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [drawerActiveTab, setDrawerActiveTab] = useState<"figma" | "git">("figma");
  const [editingAsset, setEditingAsset] = useState<ProjectAsset | null>(null);
  const [editFormName, setEditFormName] = useState("");
  const [editFormTitle, setEditFormTitle] = useState("");
  const [editFormType, setEditFormType] = useState("");
  const [editFormCategory, setEditFormCategory] = useState("");
  const [editFormTag, setEditFormTag] = useState("");
  const [bulkFormTitle, setBulkFormTitle] = useState("");
  const [bulkFormType, setBulkFormType] = useState("");
  const [bulkFormCategory, setBulkFormCategory] = useState("");
  const [bulkFormTag, setBulkFormTag] = useState("");

  // Configuration status helper flags
  const hasFigmaConfigured = Boolean(
    assetFigmaConfig?.pat && assetFigmaConfig?.sources && assetFigmaConfig.sources.length > 0
  );
  const hasGitConfigured = Boolean(assetGitConfig?.repo && assetGitConfig?.pat);
  const enabledFigmaSourcesCount = (assetFigmaConfig?.sources || []).filter(
    (s) => s.enabled !== false && !s.isPaused
  ).length;

  // Independent Git Config Form
  const [gitProvider, setGitProvider] = useState<"github" | "gitlab" | "azure" | "bitbucket">(
    assetGitConfig?.provider || "github"
  );
  const [gitOwner, setGitOwner] = useState(assetGitConfig?.owner || "");
  const [gitProject, setGitProject] = useState(assetGitConfig?.project || "");
  const [gitRepo, setGitRepo] = useState(assetGitConfig?.repo || "");
  const [gitBranch, setGitBranch] = useState(assetGitConfig?.branch || "main");
  const [gitFolder, setGitFolder] = useState(assetGitConfig?.assetFolder || "icons");
  const [gitPat, setGitPat] = useState(assetGitConfig?.pat || "");
  const [isSavingGitConfig, setIsSavingGitConfig] = useState(false);

  // Unified Figma PAT Form
  const [figmaPatInput, setFigmaPatInput] = useState(assetFigmaConfig?.pat || "");
  const [showFigmaPat, setShowFigmaPat] = useState(false);
  const [isSavingFigmaPat, setIsSavingFigmaPat] = useState(false);

  // Add New Figma Source Form
  const [newFigmaTitle, setNewFigmaTitle] = useState("");
  const [newFigmaUrl, setNewFigmaUrl] = useState("");
  const [isAddingFigmaSource, setIsAddingFigmaSource] = useState(false);
  const [editingFigmaSource, setEditingFigmaSource] = useState<FigmaSourceLink | null>(null);
  const [editFigmaSourceName, setEditFigmaSourceName] = useState("");
  const [editFigmaSourceUrl, setEditFigmaSourceUrl] = useState("");
  const [isSavingFigmaSource, setIsSavingFigmaSource] = useState(false);

  // Syncing single source state
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);

  // Effective assets list
  const displayAssets: ProjectAsset[] = useMemo(() => {
    return storeAssets || [];
  }, [storeAssets]);

  // Unique icon types found in metadata or folder structure
  const iconTypes = useMemo(() => {
    const set = new Set<string>();
    displayAssets.forEach((a) => {
      if (a.type) set.add(a.type.toLowerCase());
    });
    return Array.from(set).sort();
  }, [displayAssets]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    displayAssets.forEach((a) => {
      if (a.category) set.add(a.category.toLowerCase());
    });
    return Array.from(set).sort();
  }, [displayAssets]);

  // Filtered categories in left sidebar
  const filteredCategoryList = useMemo(() => {
    if (!categorySearchQuery.trim()) return categories;
    const q = categorySearchQuery.toLowerCase();
    return categories.filter((c) => c.toLowerCase().includes(q) || formatCategoryName(c).toLowerCase().includes(q));
  }, [categories, categorySearchQuery]);

  // Filtered assets with Icon Type & Category filtering + Tag-Based Search Metadata
  const filteredAssets = useMemo(() => {
    return displayAssets.filter((icon) => {
      if (selectedType !== "all" && icon.type?.toLowerCase() !== selectedType) {
        return false;
      }
      if (selectedCategory !== "all" && icon.category?.toLowerCase() !== selectedCategory) {
        return false;
      }
      if (selectedFigmaSource !== "all" && icon.figmaSourceId !== selectedFigmaSource) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = icon.title?.toLowerCase().includes(q) || false;
        const matchName = icon.name.toLowerCase().includes(q);
        const matchType = icon.type?.toLowerCase().includes(q) || false;
        const matchCat = icon.category?.toLowerCase().includes(q) || false;
        const matchTag = icon.tag?.toLowerCase().includes(q) || false;
        const matchSource = icon.figmaSourceName?.toLowerCase().includes(q) || false;
        return matchTitle || matchName || matchType || matchCat || matchTag || matchSource;
      }
      return true;
    }).sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name, undefined, { sensitivity: "base" }));
  }, [displayAssets, selectedType, selectedCategory, selectedFigmaSource, searchQuery]);

  // Group filtered assets directly by Type (e.g. Stroke, Two Tone, Solid)
  const groupedAssetsByType = useMemo(() => {
    const map = new Map<string, ProjectAsset[]>();
    filteredAssets.forEach((asset) => {
      const type = asset.type || "General";
      if (!map.has(type)) map.set(type, []);
      map.get(type)!.push(asset);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([typeName, icons]) => ({
        typeName,
        icons,
      }));
  }, [filteredAssets]);

  // Toggle selection for an individual asset
  const toggleAssetSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle Select All / Deselect All
  const toggleSelectAll = () => {
    if (selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(filteredAssets.map((a) => a.id)));
    }
  };

  /**
   * Unified Processor for multi-layer SVG files and metadata.json (handles direct files, zip archives, and folders)
   */
  const processRawFileList = async (rawFiles: Array<{ path: string; content: string }>) => {
    let metadataMap = new Map<string, RawMetadataItem>();
    const svgItems: Array<{ path: string; content: string }> = [];

    // Step 1: Extract all metadata JSON files
    for (const item of rawFiles) {
      if (item.path.toLowerCase().endsWith(".json")) {
        const parsedMap = parseMetadataJson(item.content);
        parsedMap.forEach((v, k) => metadataMap.set(k, v));
      } else if (item.path.toLowerCase().endsWith(".svg")) {
        svgItems.push(item);
      }
    }

    // If metadata.json was uploaded without SVGs, apply it to existing project assets
    if (metadataMap.size > 0 && svgItems.length === 0) {
      await applyMetadataToAssets(metadataMap);
      return;
    }

    const newAssets: Array<{ name: string; title?: string; type?: string; tag?: string; category?: string; svg: string }> = [];

    // Step 2: Process SVG items with multi-layer path resolution and composite metadata matching
    for (const item of svgItems) {
      const cleanedSvg = item.content
        .replace(/<\?xml[^>]*\?>/gi, "")
        .replace(/<!DOCTYPE[^>]*>/gi, "")
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .trim();

      if (cleanedSvg.includes("<svg")) {
        const { derivedType, derivedCategory, stem } = parseRawPathMeta(item.path);

        const matchedMeta =
          (derivedType ? metadataMap.get(`${normalizeKey(derivedType)}::${normalizeKey(stem)}`) || metadataMap.get(`${derivedType.toLowerCase()}::${stem.toLowerCase()}`) : undefined) ||
          metadataMap.get(normalizeKey(stem)) ||
          metadataMap.get(stem.toLowerCase());

        const resolvedType = matchedMeta?.type || derivedType || undefined;
        const resolvedCategory = matchedMeta?.category || derivedCategory || (selectedCategory !== "all" ? selectedCategory : "general");

        newAssets.push({
          name: matchedMeta?.name || stem,
          title: matchedMeta?.title || stem,
          type: resolvedType,
          tag: matchedMeta?.tag || undefined,
          category: resolvedCategory,
          svg: cleanedSvg,
        });
      }
    }

    if (newAssets.length > 0) {
      await uploadAssets(newAssets);
    }
  };

  /**
   * Reads standard FileList, unzipping any .zip archives or extracting folder paths
   */
  const handleProcessIncomingFiles = async (files: FileList | File[]) => {
    if (!canUserEdit()) {
      addToast({
        type: "info",
        title: "Read-Only Mode",
        message: "Viewer role cannot upload assets.",
      });
      return;
    }

    const rawFiles: Array<{ path: string; content: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = (file as any).webkitRelativePath || file.name;

      if (file.name.toLowerCase().endsWith(".zip")) {
        try {
          const zip = await JSZip.loadAsync(file);
          const zipEntries: Array<Promise<void>> = [];

          zip.forEach((path, entry) => {
            if (!entry.dir && (path.toLowerCase().endsWith(".svg") || path.toLowerCase().endsWith(".json"))) {
              zipEntries.push(
                entry.async("text").then((text) => {
                  rawFiles.push({ path, content: text });
                })
              );
            }
          });

          await Promise.all(zipEntries);
        } catch (err) {
          console.warn("Failed unzipping archive:", file.name, err);
          addToast({
            type: "error",
            title: "ZIP Error",
            message: `Could not extract ${file.name}.`,
          });
        }
      } else if (file.name.toLowerCase().endsWith(".svg") || file.name.toLowerCase().endsWith(".json")) {
        try {
          const text = await file.text();
          rawFiles.push({ path: relativePath, content: text });
        } catch (err) {
          console.warn("Failed reading file:", file.name, err);
        }
      }
    }

    if (rawFiles.length > 0) {
      await processRawFileList(rawFiles);
    }
  };

  // Drag and Drop handlers with recursive folder reader
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // Check if DataTransfer items support webkitGetAsEntry for recursive folder drop
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const entries: any[] = [];
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) entries.push(entry);
      }

      if (entries.length > 0 && entries.some((entry) => entry.isDirectory)) {
        const rawFiles: Array<{ path: string; content: string }> = [];

        const readEntry = async (entry: any, currentPath = ""): Promise<void> => {
          if (entry.isFile) {
            const file: File = await new Promise((resolve, reject) => entry.file(resolve, reject));
            const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
            if (file.name.toLowerCase().endsWith(".svg") || file.name.toLowerCase().endsWith(".json")) {
              const text = await file.text();
              rawFiles.push({ path: fullPath, content: text });
            }
          } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const readEntries = async (): Promise<any[]> => {
              const results: any[] = [];
              let batch: any[] = await new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));
              while (batch.length > 0) {
                results.push(...batch);
                batch = await new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));
              }
              return results;
            };
            const children = await readEntries();
            const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
            for (const child of children) {
              await readEntry(child, nextPath);
            }
          }
        };

        for (const entry of entries) {
          await readEntry(entry);
        }

        if (rawFiles.length > 0) {
          await processRawFileList(rawFiles);
          return;
        }
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleProcessIncomingFiles(e.dataTransfer.files);
    }
  };

  // Handle replacing an individual SVG file
  const handleReplaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingAssetId) return;

    try {
      const text = await file.text();
      const cleanedSvg = text
        .replace(/<\?xml[^>]*\?>/gi, "")
        .replace(/<!DOCTYPE[^>]*>/gi, "")
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .trim();

      if (cleanedSvg.includes("<svg")) {
        await updateAsset(replacingAssetId, {
          svg: cleanedSvg,
          updatedAt: new Date().toISOString(),
        });
        addToast({
          type: "success",
          title: "SVG Replaced",
          message: "Updated vector icon content.",
        });
      }
    } catch (err) {
      console.warn("Failed replacing SVG:", err);
    } finally {
      setReplacingAssetId(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  /**
   * Enriches an SVG XML string with an `id`, `data-name`, and `<title>` tag
   * so when pasted or imported into Figma, Sketch, or Illustrator, the layer/frame is named correctly.
   */
  const enrichSvgWithName = (rawSvg: string, iconName: string): string => {
    if (!rawSvg || typeof rawSvg !== "string") return rawSvg;
    const nameClean = iconName.trim();
    if (!nameClean) return rawSvg;

    let formatted = rawSvg.trim();

    // 1. Ensure root <svg> tag contains id="..." and data-name="..." set to iconName
    const svgTagMatch = formatted.match(/<svg\b[^>]*>/i);
    if (svgTagMatch) {
      let svgTag = svgTagMatch[0];

      // Handle id attribute
      if (/\bid=["'][^"']*["']/i.test(svgTag)) {
        svgTag = svgTag.replace(/\bid=["'][^"']*["']/i, `id="${nameClean}"`);
      } else {
        svgTag = svgTag.replace(/<svg\b/i, `<svg id="${nameClean}"`);
      }

      // Handle data-name attribute
      if (/\bdata-name=["'][^"']*["']/i.test(svgTag)) {
        svgTag = svgTag.replace(/\bdata-name=["'][^"']*["']/i, `data-name="${nameClean}"`);
      } else {
        svgTag = svgTag.replace(/<svg\b/i, `<svg data-name="${nameClean}"`);
      }

      formatted = formatted.replace(svgTagMatch[0], svgTag);
    }

    // 2. Inject or update <title> inside <svg>
    if (/<title\b[^>]*>.*?<\/title>/i.test(formatted)) {
      formatted = formatted.replace(/<title\b[^>]*>.*?<\/title>/i, `<title>${nameClean}</title>`);
    } else {
      formatted = formatted.replace(/(<svg\b[^>]*>)/i, `$1<title>${nameClean}</title>`);
    }

    return formatted;
  };

  // Copy SVG string enriched with icon name for Figma layer naming
  const handleCopySvg = (svg: string, id: string, name?: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const iconName = name || "icon";
      const enriched = enrichSvgWithName(svg, iconName);

      if (navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
        const textBlob = new Blob([enriched], { type: "text/plain" });
        const htmlBlob = new Blob([enriched], { type: "text/html" });
        navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": textBlob,
            "text/html": htmlBlob,
          }),
        ]).catch(() => {
          navigator.clipboard.writeText(enriched);
        });
      } else {
        navigator.clipboard.writeText(enriched);
      }

      setCopiedId(id);
      addToast({
        type: "success",
        title: "SVG Copied",
        message: `Copied "${iconName}" SVG to clipboard.`,
      });
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  // Download single SVG file
  const handleDownloadSingleSvg = (asset: ProjectAsset) => {
    const iconName = asset.name || asset.title || "icon";
    const enriched = enrichSvgWithName(asset.svg, iconName);
    const blob = new Blob([enriched], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${iconName}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export / Download selected icons as a multi-layer hierarchical .ZIP archive
  const handleDownloadSelectedZip = async () => {
    const targetAssets =
      selectedAssetIds.size > 0
        ? filteredAssets.filter((a) => selectedAssetIds.has(a.id))
        : filteredAssets;

    if (targetAssets.length === 0) return;

    try {
      const zip = new JSZip();
      targetAssets.forEach((asset) => {
        const typeFolder = asset.type || "general";
        const catFolder = asset.category || "general";
        const iconName = asset.name || asset.title || "icon";
        const fileName = `${iconName}.svg`;
        const enriched = enrichSvgWithName(asset.svg, iconName);
        zip.file(`${typeFolder}/${catFolder}/${fileName}`, enriched);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentProject?.slug || "design-system"}-icons.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({
        type: "success",
        title: "Icons Exported",
        message: `Downloaded ${targetAssets.length} SVG icon${targetAssets.length === 1 ? "" : "s"} with folder hierarchy.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Export Failed",
        message: err.message || "Failed creating zip archive.",
      });
    }
  };

  // Bulk Delete Action
  const handleBulkDelete = async () => {
    if (selectedAssetIds.size === 0) return;
    const ids = Array.from(selectedAssetIds);
    await deleteAssets(ids);
    setSelectedAssetIds(new Set());
    setIsBulkDeleteOpen(false);
  };

  // Single Delete Action
  const handleSingleDelete = async () => {
    if (!singleDeleteAsset) return;
    await deleteAsset(singleDeleteAsset.id);
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      next.delete(singleDeleteAsset.id);
      return next;
    });
    setSingleDeleteAsset(null);
  };

  // Save Git Config & Sync
  const handleSaveGitConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitOwner.trim() || !gitRepo.trim() || !gitPat.trim()) {
      addToast({
        type: "error",
        title: "Incomplete Config",
        message: "Owner, repository, and Personal Access Token (PAT) are required.",
      });
      return;
    }

    setIsSavingGitConfig(true);
    try {
      const newConfig: AssetGitConfig = {
        provider: gitProvider,
        owner: gitOwner.trim(),
        project: gitProject.trim() || undefined,
        repo: gitRepo.trim(),
        branch: gitBranch.trim() || "main",
        assetFolder: gitFolder.trim() || "icons",
        pat: gitPat.trim(),
      };

      await setAssetGitConfig(newConfig);
      setIsSettingsDrawerOpen(false);
      await syncAssetsFromGit();
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Configuration Error",
        message: err.message || "Failed to save asset Git config.",
      });
    } finally {
      setIsSavingGitConfig(false);
    }
  };

  // Save Unified Figma PAT
  const handleSaveFigmaPat = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFigmaPat(true);
    try {
      await setFigmaPat(figmaPatInput);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Failed to Save PAT",
        message: err.message || "Could not save Figma token.",
      });
    } finally {
      setIsSavingFigmaPat(false);
    }
  };

  // Add New Figma Source Link
  const handleAddNewFigmaSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFigmaUrl.trim()) {
      addToast({
        type: "error",
        title: "Missing Link",
        message: "Please enter a valid Figma frame or section link.",
      });
      return;
    }

    setIsAddingFigmaSource(true);
    try {
      const ok = await addFigmaSource({
        name: newFigmaTitle.trim() || "Figma Icons",
        fileUrl: newFigmaUrl.trim(),
      });
      if (ok) {
        setNewFigmaTitle("");
        setNewFigmaUrl("");
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Failed to Add Source",
        message: err.message || "Could not add Figma link.",
      });
    } finally {
      setIsAddingFigmaSource(false);
    }
  };

  // Sync Single Figma Source Link
  const handleSyncSource = async (sourceId: string) => {
    setSyncingSourceId(sourceId);
    try {
      await syncSingleFigmaSource(sourceId);
    } finally {
      setSyncingSourceId(null);
    }
  };

  const handleOpenFigmaSourceEdit = (source: FigmaSourceLink) => {
    setEditingFigmaSource(source);
    setEditFigmaSourceName(source.name);
    setEditFigmaSourceUrl(source.fileUrl);
  };

  const handleSaveFigmaSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFigmaSource || !editFigmaSourceName.trim() || !editFigmaSourceUrl.trim()) return;

    setIsSavingFigmaSource(true);
    try {
      const name = editFigmaSourceName.trim();
      const fileUrl = editFigmaSourceUrl.trim();
      await updateFigmaSource(editingFigmaSource.id, { name, fileUrl });

      const sourceAssetIds = displayAssets
        .filter((asset) => asset.figmaSourceId === editingFigmaSource.id)
        .map((asset) => asset.id);
      if (sourceAssetIds.length > 0 && name !== editingFigmaSource.name) {
        await updateAssets(sourceAssetIds, { category: name });
      }

      setEditingFigmaSource(null);
    } finally {
      setIsSavingFigmaSource(false);
    }
  };

  // Open Edit Details Modal
  const handleOpenEdit = (asset: ProjectAsset) => {
    setEditingAsset(asset);
    setEditFormName(asset.name);
    setEditFormTitle(asset.title || asset.name);
    setEditFormType(asset.type || "");
    setEditFormCategory(asset.category || "general");
    setEditFormTag(asset.tag || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset || !editFormName.trim()) return;

    await updateAsset(editingAsset.id, {
      name: editFormName.trim(),
      title: editFormTitle.trim() || editFormName.trim(),
      type: editFormType.trim() || undefined,
      category: editFormCategory.trim().toLowerCase() || "general",
      tag: editFormTag.trim() || undefined,
    });
    setEditingAsset(null);
  };

  const handleOpenBulkMetadata = () => {
    setBulkFormTitle("");
    setBulkFormType("");
    setBulkFormCategory("");
    setBulkFormTag("");
    setIsBulkMetadataOpen(true);
  };

  const handleSaveBulkMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = bulkFormTitle.trim();
    const type = bulkFormType.trim();
    const category = bulkFormCategory.trim().toLowerCase();
    const tag = bulkFormTag.trim();
    if (!title && !type && !category && !tag) return;

    const selectedIds = selectedAssetIds;
    const updates: Partial<ProjectAsset> = {
      ...(title ? { title } : {}),
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
      ...(tag ? { tag } : {}),
    };
    await updateAssets(Array.from(selectedIds), updates);
    setIsBulkMetadataOpen(false);
  };

  const isAllSelected =
    filteredAssets.length > 0 && selectedAssetIds.size === filteredAssets.length;

  // Helper to render an individual icon card
  const renderIconCard = (icon: ProjectAsset) => {
    const isCopied = copiedId === icon.id;
    const isSelected = selectedAssetIds.has(icon.id);
    const displayTitle = icon.title || icon.name;

    return (
      <div
        key={icon.id}
        onClick={() => handleCopySvg(icon.svg, icon.id, displayTitle)}
        className={`p-4 rounded-xl border bg-card transition-all duration-200 cursor-pointer group shadow-2xs flex flex-col items-center justify-between text-center relative min-h-[148px] ${
          isSelected
            ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02]"
            : "border-border/80 hover:border-primary/50 hover:bg-muted/20"
        }`}
        title={icon.tag ? `Tags: ${icon.tag}` : undefined}
      >
        {/* Selection Checkbox (Top Left) */}
        <div
          className={`absolute top-2 left-2 z-10 transition-opacity ${
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          onClick={(e) => toggleAssetSelect(icon.id, e)}
        >
          <div
            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-background border border-border hover:border-primary text-transparent"
            }`}
          >
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
        </div>

        {/* Options Menu (Top Right) */}
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
              {canUserEdit() && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setReplacingAssetId(icon.id);
                      replaceInputRef.current?.click();
                    }}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Replace SVG File</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenEdit(icon)}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Edit Metadata</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={() => handleDownloadSingleSvg(icon)}
                className="gap-2 cursor-pointer text-xs"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Download .svg</span>
              </DropdownMenuItem>
              {icon.figmaUrl && (
                <DropdownMenuItem
                  onClick={() => window.open(icon.figmaUrl, "_blank")}
                  className="gap-2 cursor-pointer text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-violet-500" />
                  <span>Open in Figma</span>
                </DropdownMenuItem>
              )}
              {icon.figmaSourceName && (
                <div className="px-2 py-1 text-[10px] text-muted-foreground border-t border-border/50 truncate">
                  Source: <span className="font-semibold text-foreground">{icon.figmaSourceName}</span>
                </div>
              )}
              {canUserEdit() && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setSingleDeleteAsset(icon)}
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Icon</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* SVG Vector Render Preview */}
        <div
          className="w-11 h-11 flex items-center justify-center text-foreground transition-transform duration-150 group-hover:scale-105 mt-1"
          dangerouslySetInnerHTML={{ __html: icon.svg }}
        />

        {/* Icon Metadata: Title as primary, optional type/git/figma pill below */}
        <div className="w-full truncate mt-2 px-1">
          <span className="font-semibold text-xs text-foreground block truncate" title={displayTitle}>
            {displayTitle}
          </span>
          {(icon.type || icon.source === "git" || icon.source === "figma" || (showSourceBadges && icon.figmaSourceName)) && (
            <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
              {icon.type && (
                <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {icon.type}
                </span>
              )}
              {icon.source === "git" && (
                <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
                  git
                </span>
              )}
              {icon.source === "figma" && (
                <span
                  className="text-[9px] font-mono text-violet-600 dark:text-violet-400 bg-violet-500/10 px-1 py-0.5 rounded flex items-center gap-0.5"
                  title="Figma source"
                  aria-label="Figma source"
                >
                  <Figma className="w-2.5 h-2.5" />
                </span>
              )}
              {showSourceBadges && icon.figmaSourceName && (
                <span
                  className="text-[9px] font-medium text-violet-700 dark:text-violet-300 bg-violet-500/10 px-1 py-0.5 rounded truncate max-w-[90px]"
                  title={`Figma Source: ${icon.figmaSourceName}`}
                >
                  {icon.figmaSourceName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Copy Action Button */}
        <div className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-semibold flex items-center gap-1 mt-2">
          {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          <span>{isCopied ? "Copied" : "Copy SVG"}</span>
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden select-none relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Picker (accepts .svg, .json, .zip) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,.json,.zip"
        multiple
        onChange={(e) => {
          if (e.target.files) handleProcessIncomingFiles(e.target.files);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        className="hidden"
      />

      {/* Hidden Folder Picker (webkitdirectory) */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: "", directory: "" } as any)}
        onChange={(e) => {
          if (e.target.files) handleProcessIncomingFiles(e.target.files);
          if (folderInputRef.current) folderInputRef.current.value = "";
        }}
        className="hidden"
      />

      {/* Single Replace Input */}
      <input
        ref={replaceInputRef}
        type="file"
        accept=".svg"
        onChange={handleReplaceFileSelected}
        className="hidden"
      />

      {/* Top Header */}
      <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-card/60 backdrop-blur-md flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">Assets</h1>
              <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 border-primary/30 text-primary">
                {displayAssets.length} {displayAssets.length === 1 ? "icon" : "icons"}
              </Badge>
            </div>
            {/* <p className="text-[11px] text-muted-foreground">
              Vector SVG icon library &amp; independent Git folder synchronization
            </p> */}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Search Box */}
          {displayAssets.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search title, type, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs w-56 bg-background"
              />
            </div>
          )}

          {/* Select All Toggle Button */}
          {filteredAssets.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className={`h-8 text-xs gap-1.5 cursor-pointer ${
                selectedAssetIds.size > 0 ? "border-primary/50 text-primary bg-primary/5" : ""
              }`}
            >
              {isAllSelected ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
            </Button>
          )}

          {/* Upload Button with Menu */}
          {canUserEdit() && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="gap-1.5 h-8 text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Assets</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 text-xs">
                <DropdownMenuItem
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 cursor-pointer text-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-primary" />
                  <div>
                    <div className="font-semibold">Upload Files (.svg, .json, .zip)</div>
                    <div className="text-[10px] text-muted-foreground">Select SVGs, metadata or ZIP</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => folderInputRef.current?.click()}
                  className="gap-2 cursor-pointer text-xs"
                >
                  <FolderUp className="w-3.5 h-3.5 text-emerald-500" />
                  <div>
                    <div className="font-semibold">Upload Entire Folder</div>
                    <div className="text-[10px] text-muted-foreground">Preserves nested type folders</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Figma Global Sync Button (ONLY VISIBLE WHEN FIGMA IS CONFIGURED) */}
          {hasFigmaConfigured && (
            <Button
              variant="outline"
              size="sm"
              disabled={isSyncingFigmaAssets || assetFigmaConfig?.isPaused}
              onClick={() => syncAllFigmaSources()}
              className={`gap-1.5 h-8 text-xs font-semibold bg-background hover:bg-muted cursor-pointer border-violet-500/30 text-violet-600 dark:text-violet-400 ${
                assetFigmaConfig?.isPaused ? "opacity-60" : ""
              }`}
              title={
                assetFigmaConfig?.isPaused
                  ? "Figma sync is paused."
                  : `Sync all active Figma sources (${enabledFigmaSourcesCount})`
              }
            >
              <RefreshCw className={`w-3.5 h-3.5 text-violet-500 ${isSyncingFigmaAssets ? "animate-spin" : ""}`} />
              <span>
                {isSyncingFigmaAssets
                  ? "Syncing Figma..."
                  : assetFigmaConfig?.isPaused
                  ? "Figma Paused"
                  : `Sync Figma (${enabledFigmaSourcesCount})`}
              </span>
            </Button>
          )}

          {/* Quick Sync Button if Git is already configured */}
          {hasGitConfigured && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncAssetsFromGit()}
              disabled={isSyncingAssets || assetGitConfig?.isPaused}
              className={`gap-1.5 h-8 text-xs font-semibold bg-background hover:bg-muted cursor-pointer border-emerald-500/30 text-emerald-600 dark:text-emerald-400 ${
                assetGitConfig?.isPaused ? "opacity-60" : ""
              }`}
              title={
                assetGitConfig?.isPaused
                  ? "Git sync is paused. Resume in Git Config to sync."
                  : `Sync icons from ${assetGitConfig?.repo}/${assetGitConfig?.assetFolder || ""}`
              }
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isSyncingAssets ? "animate-spin" : ""}`} />
              <span>
                {isSyncingAssets
                  ? "Syncing Git..."
                  : assetGitConfig?.isPaused
                  ? "Git Paused"
                  : "Sync Git"}
              </span>
            </Button>
          )}

          {/* Download All .ZIP */}
          {filteredAssets.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadSelectedZip}
              className="gap-1.5 h-8 text-xs font-medium cursor-pointer"
              title="Download icons as hierarchical .ZIP"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export ZIP</span>
            </Button>
          )}

          {/* Asset Sources & Settings Drawer Trigger Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFigmaPatInput(assetFigmaConfig?.pat || "");
              setGitProvider(assetGitConfig?.provider || "github");
              setGitOwner(assetGitConfig?.owner || "");
              setGitProject(assetGitConfig?.project || "");
              setGitRepo(assetGitConfig?.repo || "");
              setGitBranch(assetGitConfig?.branch || "main");
              setGitFolder(assetGitConfig?.assetFolder || "icons");
              setGitPat(assetGitConfig?.pat || "");
              setIsSettingsDrawerOpen(true);
            }}
            className="gap-1.5 h-8 text-xs font-medium bg-background hover:bg-muted cursor-pointer"
            title="Open Asset Sources, Figma Links, Git Setup & View Options"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
            <span>Settings</span>
            {(hasFigmaConfigured || hasGitConfigured) && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Body: Left Categories Sidebar + Right Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Categories List */}
        {displayAssets.length > 0 && (
          <aside className="w-64 border-r border-border bg-card/30 flex flex-col flex-shrink-0 select-none overflow-hidden">
            {/* Categories Heading */}
            <div className="p-4 pb-2 border-b border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground tracking-tight">Categories</h2>
                <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5">
                  {categories.length}
                </Badge>
              </div>

              {/* Optional Category Quick Search */}
              {categories.length > 8 && (
                <div className="relative">
                  <Search className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Filter categories..."
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    className="h-7 pl-6 text-[11px] bg-background/80"
                  />
                </div>
              )}
            </div>

            {/* Scrollable Categories List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* "All Icons" Item */}
              <button
                onClick={() => setSelectedCategory("all")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer group ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Grid className={`w-4 h-4 flex-shrink-0 ${selectedCategory === "all" ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span className="truncate">All Icons</span>
                </div>
                <span className={`text-[11px] font-mono ml-2 ${selectedCategory === "all" ? "text-primary-foreground/90 font-bold" : "text-muted-foreground/80"}`}>
                  {displayAssets.length}
                </span>
              </button>

              {/* Category Items */}
              {filteredCategoryList.map((cat) => {
                const count = displayAssets.filter((a) => a.category?.toLowerCase() === cat).length;
                const isSelected = selectedCategory === cat;
                const IconComponent = getCategoryIcon(cat);
                const formattedName = formatCategoryName(cat);

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer group ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <IconComponent className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                      <span className="truncate" title={formattedName}>
                        {formattedName}
                      </span>
                    </div>
                    <span className={`text-[11px] font-mono ml-2 ${isSelected ? "text-primary-foreground/90 font-bold" : "text-muted-foreground/80"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Right Content Area: Top Type Filter Bar + Separated Category Sections */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Top Subheader: Icon Type Filter Pills (from metadata.json or folder structure) */}
          {iconTypes.length > 0 && displayAssets.length > 0 && (
            <div className="px-6 py-2.5 border-b border-border bg-muted/15 flex items-center gap-2 overflow-x-auto text-xs flex-shrink-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1 flex items-center gap-1">
                <span>Type:</span>
              </span>
              <button
                onClick={() => setSelectedType("all")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedType === "all"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                All Types ({displayAssets.length})
              </button>
              {iconTypes.map((t) => {
                const count = displayAssets.filter((a) => a.type?.toLowerCase() === t).length;
                const isSelected = selectedType === t;
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{formatCategoryName(t)}</span>
                    <span className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-6">
            {displayAssets.length === 0 ? (
              /* High-Value Onboarding Setup Guide Empty State */
              <div className="max-w-5xl mx-auto py-8 space-y-8 animate-in fade-in duration-300">
                <div className="text-center space-y-2 max-w-xl mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">
                    No Vector Assets in Project
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload SVG vector icons, folders, or ZIP archives, connect multiple Figma component frames &amp; sections, or synchronize automatically from any Git repository.
                  </p>
                </div>

                {/* Three Onboarding Workflow Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. Direct Multi-Layer SVG / ZIP / Folder Dropzone Card */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col justify-between group text-center space-y-4 ${
                      isDragOver
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-border/80 bg-card hover:border-primary/50 hover:bg-card/80 shadow-xs"
                    }`}
                  >
                    <div className="space-y-3 flex flex-col items-center">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Upload SVG, Folder, or ZIP</h3>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          Drag and drop nested type folders (e.g. <code className="font-mono text-primary">stroke/</code>, <code className="font-mono text-primary">twotone/</code>), a <code className="font-mono text-primary">.zip</code> archive, or <code className="font-mono text-primary">metadata.json</code>.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-1.5">
                      <Button
                        size="sm"
                        className="flex-1 text-xs font-semibold gap-1 shadow-xs pointer-events-none h-8"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Select Files</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          folderInputRef.current?.click();
                        }}
                        className="text-xs font-semibold gap-1 h-8"
                      >
                        <FolderUp className="w-3.5 h-3.5" />
                        <span>Folder</span>
                      </Button>
                    </div>
                  </div>

                  {/* 2. Connect Figma Component Links Card */}
                  <div
                    onClick={() => {
                      setFigmaPatInput(assetFigmaConfig?.pat || "");
                      setDrawerActiveTab("figma");
                      setIsSettingsDrawerOpen(true);
                    }}
                    className="p-5 rounded-2xl border border-border bg-card hover:border-violet-500/50 hover:bg-violet-500/5 transition-all cursor-pointer flex flex-col justify-between group space-y-4 shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Figma className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">Connect Figma Links</h3>
                          <Badge variant="outline" className="text-[9px] font-mono border-violet-500/30 text-violet-600 dark:text-violet-400">
                            Multi-Link
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          Paste links to your icon frames, sections, or component sets. Automatically sync variants &amp; high-fidelity SVG vectors.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-semibold gap-1.5 border-violet-500/30 text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-colors pointer-events-none h-8"
                      >
                        <Figma className="w-3.5 h-3.5" />
                        <span>Configure Figma Sources</span>
                      </Button>
                    </div>
                  </div>

                  {/* 3. Configure Git Sync Provider Card */}
                  <div
                    onClick={() => {
                      setGitProvider(assetGitConfig?.provider || "github");
                      setGitOwner(assetGitConfig?.owner || "");
                      setGitProject(assetGitConfig?.project || "");
                      setGitRepo(assetGitConfig?.repo || "");
                      setGitBranch(assetGitConfig?.branch || "main");
                      setGitFolder(assetGitConfig?.assetFolder || "icons");
                      setGitPat(assetGitConfig?.pat || "");
                      setDrawerActiveTab("git");
                      setIsSettingsDrawerOpen(true);
                    }}
                    className="p-5 rounded-2xl border border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer flex flex-col justify-between group space-y-4 shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FolderGit2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">Connect Git Folder</h3>
                          <Badge variant="outline" className="text-[9px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                            Independent
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          Sync from GitHub, GitLab, Azure, or Bitbucket. Pull all multi-layer icon types and <code className="font-mono text-foreground">metadata.json</code>.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors pointer-events-none h-8"
                      >
                        <FolderGit2 className="w-3.5 h-3.5" />
                        <span>Configure Git Provider</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Quick Best Practices Bar */}
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Supports Figma component links • multi-type folders (<code className="font-mono text-foreground font-semibold">stroke/</code>, <code className="font-mono text-foreground font-semibold">twotone/</code>) • metadata.json.</span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground/80">
                    Figma • GitHub • GitLab • Azure DevOps • Bitbucket
                  </span>
                </div>
              </div>
            ) : filteredAssets.length === 0 ? (
              /* Search / Filter Empty State */
              <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-muted-foreground">
                <Search className="w-8 h-8 mb-2 text-muted-foreground/40" />
                <p className="text-sm font-semibold text-foreground">No icons match your filters</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try clearing your search keyword, category, or icon type selection.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedType("all");
                    setSelectedCategory("all");
                  }}
                  className="mt-3 text-xs h-8 cursor-pointer"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              /* Separated Icon Groups directly by Type (Stroke, Two Tone, Solid, etc.) */
              <div className="space-y-8 animate-in fade-in duration-200">
                {groupedAssetsByType.map(({ typeName, icons }) => {
                  const formattedType = formatCategoryName(typeName);

                  return (
                    <section key={typeName} className="space-y-3">
                      {/* Type Section Header */}
                      {(groupedAssetsByType.length > 1 || selectedType === "all") && (
                        <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <h3 className="text-xs font-bold text-foreground tracking-tight">
                              {formattedType}
                            </h3>
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-mono py-0 px-1.5 h-4 text-muted-foreground font-normal"
                            >
                              {icons.length}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Icon Cards Grid for this Type */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                        {icons.map((icon) => renderIconCard(icon))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Sticky Floating Bulk Action Bar */}
      {selectedAssetIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl px-5 py-2.5 flex items-center gap-3.5 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
              {selectedAssetIds.size} selected
            </Badge>
          </div>

          <div className="h-4 w-px bg-border" />

          {canUserEdit() && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenBulkMetadata}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Metadata</span>
            </Button>
          )}

          {canUserEdit() && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadSelectedZip}
            className="h-8 text-xs font-medium gap-1.5 cursor-pointer bg-background"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Export Selected ({selectedAssetIds.size})</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedAssetIds(new Set())}
            className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Single Item Delete Confirmation Dialog */}
      <Dialog open={Boolean(singleDeleteAsset)} onOpenChange={() => setSingleDeleteAsset(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <DialogTitle className="text-sm font-bold">Delete Vector Icon?</DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to remove{" "}
              <strong className="text-foreground font-semibold">
                &ldquo;{singleDeleteAsset?.title || singleDeleteAsset?.name}&rdquo;
              </strong>{" "}
              from project assets? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSingleDeleteAsset(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleSingleDelete}
              className="text-xs h-8 font-semibold gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Icon</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <DialogTitle className="text-sm font-bold">Delete Selected Icons?</DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to delete{" "}
              <strong className="text-foreground font-semibold">
                {selectedAssetIds.size} vector icon{selectedAssetIds.size > 1 ? "s" : ""}
              </strong>{" "}
              from this project?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDeleteOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="text-xs h-8 font-semibold gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete {selectedAssetIds.size} Icons</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkMetadataOpen} onOpenChange={setIsBulkMetadataOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Edit Metadata for Selected Icons</DialogTitle>
            <DialogDescription className="text-xs">
              Update {selectedAssetIds.size} selected icon{selectedAssetIds.size > 1 ? "s" : ""}. Leave a field blank to keep its current value.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBulkMetadata} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="bulkTitle" className="text-xs font-semibold">Display Title</Label>
              <Input
                id="bulkTitle"
                value={bulkFormTitle}
                onChange={(e) => setBulkFormTitle(e.target.value)}
                placeholder="Apply the same title to all selected icons"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bulkType" className="text-xs font-semibold">Icon Type</Label>
                <Input
                  id="bulkType"
                  value={bulkFormType}
                  onChange={(e) => setBulkFormType(e.target.value)}
                  placeholder="e.g. Stroke"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bulkCategory" className="text-xs font-semibold">Category</Label>
                <Input
                  id="bulkCategory"
                  value={bulkFormCategory}
                  onChange={(e) => setBulkFormCategory(e.target.value)}
                  placeholder="e.g. navigation"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="bulkTag" className="text-xs font-semibold">Search Tags</Label>
              <Input
                id="bulkTag"
                value={bulkFormTag}
                onChange={(e) => setBulkFormTag(e.target.value)}
                placeholder="e.g. interface | common"
                className="h-8 text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBulkMetadataOpen(false)} className="text-xs h-8">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs h-8 font-semibold" disabled={!bulkFormTitle.trim() && !bulkFormType.trim() && !bulkFormCategory.trim() && !bulkFormTag.trim()}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unified Asset Sources, Figma Links, Git Setup & View Options Drawer (shadcn/ui Drawer) */}
      <Drawer direction="right" open={isSettingsDrawerOpen} onOpenChange={setIsSettingsDrawerOpen}>
        <DrawerContent className="h-full max-h-none w-full max-w-xl border-y border-l-0 border-r border-border bg-background shadow-2xl p-0 flex flex-col">
          <DrawerHeader className="shrink-0 px-6 pt-5 pb-3 border-b border-border/60 space-y-2 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <DrawerTitle className="text-base font-bold text-foreground">Asset Sources &amp; Settings</DrawerTitle>
                <DrawerDescription className="text-xs text-muted-foreground mt-0.5">
                  Manage your Figma frame links, Git version control, and icon view preferences.
                </DrawerDescription>
              </div>
            </div>

            {/* In-Drawer Tabs: Figma & View Options | Git Repository */}
            <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border mt-2">
              <button
                type="button"
                onClick={() => setDrawerActiveTab("figma")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  drawerActiveTab === "figma"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Figma className="w-3.5 h-3.5 text-violet-500" />
                <span>Figma &amp; View Options</span>
                {assetFigmaConfig?.sources && assetFigmaConfig.sources.length > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono rounded-full">
                    {assetFigmaConfig.sources.length}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setDrawerActiveTab("git")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  drawerActiveTab === "git"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Git Repository</span>
                {hasGitConfigured && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </button>
            </div>
          </DrawerHeader>

          {/* Drawer Scrollable Content */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
            {drawerActiveTab === "figma" ? (
              <div className="space-y-4">
                {/* Section 1: View & Display Options */}
                <div className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    <span>View &amp; Display Options</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div>
                      <Label htmlFor="drawer-source-badges" className="text-xs font-medium cursor-pointer">
                        Show Source Title Badges
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Display Figma source pills (e.g. 📍 Navigation Icons) on icon cards
                      </p>
                    </div>
                    <input
                      id="drawer-source-badges"
                      type="checkbox"
                      checked={showSourceBadges}
                      onChange={(e) => setShowSourceBadges(e.target.checked)}
                      className="rounded border-border cursor-pointer h-4 w-4"
                    />
                  </div>

                  {assetFigmaConfig?.sources && assetFigmaConfig.sources.length > 1 && (
                    <div className="pt-2.5 border-t border-border/50 space-y-1.5">
                      <Label className="text-[11px] font-medium text-foreground block">
                        Filter Grid by Figma Source
                      </Label>
                      <select
                        value={selectedFigmaSource}
                        onChange={(e) => setSelectedFigmaSource(e.target.value)}
                        className="w-full h-8 text-xs bg-muted/60 border border-border rounded-lg px-2.5 text-foreground cursor-pointer focus:outline-none"
                      >
                        <option value="all">All Sources ({displayAssets.filter((a) => a.source === "figma").length} icons)</option>
                        {assetFigmaConfig.sources.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({displayAssets.filter((a) => a.figmaSourceId === s.id).length} icons)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Section 2: Unified Figma PAT Vault */}
                <div className="p-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
                      <span>Unified Figma Personal Access Token</span>
                    </div>
                    {assetFigmaConfig?.pat ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] border-emerald-500/30 rounded-full">
                        Token Saved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 rounded-full">
                        Token Required
                      </Badge>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Configured once and securely reused across all your connected Figma links.
                  </p>

                  <form onSubmit={handleSaveFigmaPat} className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Input
                        type={showFigmaPat ? "text" : "password"}
                        value={figmaPatInput}
                        onChange={(e) => setFigmaPatInput(e.target.value)}
                        placeholder="figd_..."
                        className="h-8 text-xs font-mono pr-8 bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFigmaPat(!showFigmaPat)}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showFigmaPat ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSavingFigmaPat}
                      className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1 font-semibold cursor-pointer"
                    >
                      {isSavingFigmaPat ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      <span>Save</span>
                    </Button>
                    {assetFigmaConfig?.pat && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await setFigmaPat("");
                          setFigmaPatInput("");
                        }}
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Clear Token"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </form>
                </div>

                {/* Section 3: Add New Figma Link Form */}
                <form onSubmit={handleAddNewFigmaSource} className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <PlusCircle className="w-3.5 h-3.5 text-violet-500" />
                    <span>Add Figma Frame / Section Link</span>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="newFigmaTitle" className="text-[11px] font-semibold">
                        Source Title / Name
                      </Label>
                      <Input
                        id="newFigmaTitle"
                        value={newFigmaTitle}
                        onChange={(e) => setNewFigmaTitle(e.target.value)}
                        placeholder="e.g. Navigation Icons"
                        required
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newFigmaUrl" className="text-[11px] font-semibold">
                        Figma Frame Link (URL)
                      </Label>
                      <Input
                        id="newFigmaUrl"
                        value={newFigmaUrl}
                        onChange={(e) => setNewFigmaUrl(e.target.value)}
                        placeholder="https://www.figma.com/design/.../Icons?node-id=..."
                        required
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground">
                      Right click in Figma &rarr; <span className="font-medium text-foreground">&quot;Copy link to selection&quot;</span>
                    </span>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isAddingFigmaSource || isSyncingFigmaAssets}
                      className="h-8 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold cursor-pointer"
                    >
                      {isAddingFigmaSource ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Add &amp; Sync Link</span>
                    </Button>
                  </div>
                </form>

                {/* Section 4: Connected Figma Links List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground px-0.5">
                    <span>Connected Sources ({assetFigmaConfig?.sources?.length || 0})</span>
                    {assetFigmaConfig?.sources && assetFigmaConfig.sources.length > 0 && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={togglePauseFigmaSync}
                          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                        >
                          {assetFigmaConfig.isPaused ? (
                            <Play className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Pause className="w-3 h-3 text-amber-500" />
                          )}
                          <span>{assetFigmaConfig.isPaused ? "Resume All" : "Pause All"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => syncAllFigmaSources()}
                          disabled={isSyncingFigmaAssets}
                          className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isSyncingFigmaAssets ? "animate-spin" : ""}`} />
                          <span>Sync All</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {(!assetFigmaConfig?.sources || assetFigmaConfig.sources.length === 0) ? (
                    <div className="text-center py-6 border border-dashed border-border rounded-2xl text-xs text-muted-foreground space-y-1">
                      <div className="font-semibold text-foreground">No Figma Links Connected</div>
                      <div>Paste your first frame or section link above to sync icon components.</div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 pr-1">
                      {assetFigmaConfig.sources.map((src) => {
                        const iconCount = displayAssets.filter((a) => a.figmaSourceId === src.id).length;
                        const isSrcPaused = src.isPaused || src.enabled === false;
                        return (
                          <div
                            key={src.id}
                            className={`p-3.5 rounded-2xl border text-xs transition-all ${
                              isSrcPaused
                                ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10"
                                : "border-border bg-card shadow-2xs hover:border-violet-500/30"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-foreground text-xs">{src.name}</span>
                                  {isSrcPaused ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 rounded-full"
                                    >
                                      <Pause className="w-2.5 h-2.5" />
                                      <span>Paused</span>
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 rounded-full"
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                      <span>Active</span>
                                    </Badge>
                                  )}
                                  {src.nodeId && (
                                    <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      Node: {src.nodeId}
                                    </span>
                                  )}
                                </div>

                                <div className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
                                  <span>{iconCount} icons</span>
                                  {src.lastSyncedAt && (
                                    <span>
                                      &bull; Synced{" "}
                                      {new Date(src.lastSyncedAt).toLocaleString([], {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Quick Open in Figma */}
                              {src.fileUrl && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(src.fileUrl, "_blank")}
                                  className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                  title="Open in Figma"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span className="hidden sm:inline">Figma</span>
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenFigmaSourceEdit(src)}
                                className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                title="Edit source name and link"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            </div>

                            {/* Actions Row: Explicit Toggle Pause & Remove Buttons */}
                            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/40 gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => togglePauseFigmaSource(src.id)}
                                  className={`h-7 px-2.5 text-[11px] gap-1.5 font-medium cursor-pointer ${
                                    isSrcPaused
                                      ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                      : "border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                  }`}
                                  title={isSrcPaused ? "Resume sync for this Figma link" : "Pause sync for this Figma link"}
                                >
                                  {isSrcPaused ? (
                                    <>
                                      <Play className="w-3 h-3 text-emerald-500" />
                                      <span>Resume Link</span>
                                    </>
                                  ) : (
                                    <>
                                      <Pause className="w-3 h-3 text-amber-500" />
                                      <span>Pause Link</span>
                                    </>
                                  )}
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={syncingSourceId === src.id || isSyncingFigmaAssets || isSrcPaused}
                                  onClick={() => handleSyncSource(src.id)}
                                  className="h-7 px-2.5 text-[11px] gap-1.5 font-medium cursor-pointer text-violet-600 hover:text-violet-700 hover:bg-violet-500/10 border-violet-500/30"
                                  title="Sync this link now"
                                >
                                  <RefreshCw className={`w-3 h-3 ${syncingSourceId === src.id ? "animate-spin" : ""}`} />
                                  <span>{syncingSourceId === src.id ? "Syncing..." : "Sync Now"}</span>
                                </Button>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removeFigmaSource(
                                    src.id,
                                    confirm(
                                      `Delete all ${iconCount} icons imported from "${src.name}" as well?\n\nClick OK to delete icons, or Cancel to keep icons but remove the link.`
                                    )
                                  )
                                }
                                className="h-7 px-2 text-[11px] gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer font-medium"
                                title="Remove this Figma link"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remove</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* TAB 2: GIT REPOSITORY CONFIGURATION */
              <form onSubmit={handleSaveGitConfig} className="space-y-4">
                {assetGitConfig?.repo && (
                  <div className="p-4 rounded-2xl border border-border bg-card space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <FolderGit2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-foreground block">
                            {assetGitConfig.owner}/{assetGitConfig.repo}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Branch: {assetGitConfig.branch} &bull; Folder: {assetGitConfig.assetFolder || "icons"}
                          </span>
                        </div>
                      </div>

                      {assetGitConfig.isPaused ? (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 rounded-full">
                          <Pause className="w-2.5 h-2.5" />
                          <span>Paused</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 rounded-full">
                          <Check className="w-2.5 h-2.5" />
                          <span>Active</span>
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={togglePauseAssetGit}
                        className="h-7 text-[11px] gap-1.5 cursor-pointer flex-1"
                      >
                        {assetGitConfig.isPaused ? (
                          <>
                            <Play className="w-3 h-3 text-emerald-500" />
                            <span>Resume Sync</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-3 h-3 text-amber-500" />
                            <span>Pause Sync</span>
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (confirm("Are you sure you want to disconnect and remove this Git configuration?")) {
                            await disconnectAssetGit();
                          }
                        }}
                        className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Unlink className="w-3 h-3" />
                        <span>Disconnect</span>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Git Platform Provider</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["github", "gitlab", "azure", "bitbucket"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setGitProvider(p)}
                        className={`px-2 py-2.5 rounded-xl border text-xs font-medium capitalize transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          gitProvider === p
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>{p === "github" ? "🐙" : p === "gitlab" ? "🦊" : p === "azure" ? "🔷" : "🪣"}</span>
                        <span className="text-[10px]">{p}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="gitOwner" className="text-xs font-semibold">
                      {gitProvider === "azure" ? "Organization" : "Owner / Org"}
                    </Label>
                    <Input
                      id="gitOwner"
                      placeholder="e.g. acme-corp"
                      value={gitOwner}
                      onChange={(e) => setGitOwner(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="gitRepo" className="text-xs font-semibold">
                      Repository Name
                    </Label>
                    <Input
                      id="gitRepo"
                      placeholder="e.g. design-system-icons"
                      value={gitRepo}
                      onChange={(e) => setGitRepo(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {gitProvider === "azure" && (
                  <div className="space-y-1">
                    <Label htmlFor="gitProject" className="text-xs font-semibold">
                      Azure Project Name
                    </Label>
                    <Input
                      id="gitProject"
                      placeholder="e.g. CoreUI"
                      value={gitProject}
                      onChange={(e) => setGitProject(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="gitBranch" className="text-xs font-semibold">
                      Branch
                    </Label>
                    <Input
                      id="gitBranch"
                      placeholder="main"
                      value={gitBranch}
                      onChange={(e) => setGitBranch(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="gitFolder" className="text-xs font-semibold">
                      Icons Folder Path
                    </Label>
                    <Input
                      id="gitFolder"
                      placeholder="icons (or assets/icons)"
                      value={gitFolder}
                      onChange={(e) => setGitFolder(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="gitPat" className="text-xs font-semibold">
                    Personal Access Token (PAT)
                  </Label>
                  <Input
                    id="gitPat"
                    type="password"
                    placeholder="ghp_... or glpat-..."
                    value={gitPat}
                    onChange={(e) => setGitPat(e.target.value)}
                    required
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSavingGitConfig || isSyncingAssets}
                    className="text-xs h-8 gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer rounded-xl"
                  >
                    {isSavingGitConfig || isSyncingAssets ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FolderGit2 className="w-3.5 h-3.5" />
                    )}
                    <span>Save &amp; Sync Git</span>
                  </Button>
                </div>
              </form>
            )}
          </div>

          <DrawerFooter className="shrink-0 px-6 py-4 border-t border-border/60 flex flex-col gap-2">
            <DrawerClose asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 rounded-full font-semibold text-xs border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog
        open={Boolean(editingFigmaSource)}
        onOpenChange={(open) => {
          if (!open && !isSavingFigmaSource) setEditingFigmaSource(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Edit Figma Source</DialogTitle>
            <DialogDescription className="text-xs">
              Update the source name and Figma frame or section link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveFigmaSource} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="editFigmaSourceName" className="text-xs font-semibold">
                Source Title / Name
              </Label>
              <Input
                id="editFigmaSourceName"
                value={editFigmaSourceName}
                onChange={(e) => setEditFigmaSourceName(e.target.value)}
                placeholder="e.g. Navigation Icons"
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editFigmaSourceUrl" className="text-xs font-semibold">
                Figma Frame Link (URL)
              </Label>
              <Input
                id="editFigmaSourceUrl"
                value={editFigmaSourceUrl}
                onChange={(e) => setEditFigmaSourceUrl(e.target.value)}
                placeholder="https://www.figma.com/design/..."
                required
                className="h-9 text-xs font-mono"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingFigmaSource(null)}
                disabled={isSavingFigmaSource}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingFigmaSource} className="text-xs gap-1.5">
                {isSavingFigmaSource && <RefreshCw className="w-3 h-3 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Name / Title / Type / Category / Tag Modal */}
      {editingAsset && (
        <Dialog open={Boolean(editingAsset)} onOpenChange={() => setEditingAsset(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">Edit Icon Metadata</DialogTitle>
              <DialogDescription className="text-xs">
                Update the display title, icon type, category, code identifier, and search tags.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="editTitle" className="text-xs font-semibold">
                  Display Title
                </Label>
                <Input
                  id="editTitle"
                  value={editFormTitle}
                  onChange={(e) => setEditFormTitle(e.target.value)}
                  placeholder="e.g. Unavailable"
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editType" className="text-xs font-semibold">
                    Icon Type
                  </Label>
                  <Input
                    id="editType"
                    value={editFormType}
                    onChange={(e) => setEditFormType(e.target.value)}
                    placeholder="e.g. Stroke, Two Tone, Solid"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="editCategory" className="text-xs font-semibold">
                    Category
                  </Label>
                  <Input
                    id="editCategory"
                    value={editFormCategory}
                    onChange={(e) => setEditFormCategory(e.target.value)}
                    placeholder="e.g. add-remove-delete"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editName" className="text-xs font-semibold">
                    Code Identifier (Name)
                  </Label>
                  <Input
                    id="editName"
                    value={editFormName}
                    onChange={(e) => setEditFormName(e.target.value)}
                    placeholder="e.g. IconUnavailable"
                    required
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="editTag" className="text-xs font-semibold">
                    Search Tags
                  </Label>
                  <Input
                    id="editTag"
                    value={editFormTag}
                    onChange={(e) => setEditFormTag(e.target.value)}
                    placeholder="e.g. unavailable | forbidden"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAsset(null)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs h-8 font-semibold">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
