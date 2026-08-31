"use client";

import React, { useState, useMemo, useRef } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { ProjectAsset, AssetGitConfig } from "@/types/tenant";
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
    deleteAsset,
    deleteAssets,
    assetGitConfig,
    setAssetGitConfig,
    syncAssetsFromGit,
    isSyncingAssets,
    addToast,
    canUserEdit,
  } = useTokenStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selection & Bulk Actions State
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [singleDeleteAsset, setSingleDeleteAsset] = useState<ProjectAsset | null>(null);

  // Drag and Drop Zone State
  const [isDragOver, setIsDragOver] = useState(false);

  // File Upload Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replacingAssetId, setReplacingAssetId] = useState<string | null>(null);

  // Modals State
  const [isGitConfigOpen, setIsGitConfigOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ProjectAsset | null>(null);
  const [editFormName, setEditFormName] = useState("");
  const [editFormTitle, setEditFormTitle] = useState("");
  const [editFormType, setEditFormType] = useState("");
  const [editFormCategory, setEditFormCategory] = useState("");
  const [editFormTag, setEditFormTag] = useState("");

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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = icon.title?.toLowerCase().includes(q) || false;
        const matchName = icon.name.toLowerCase().includes(q);
        const matchType = icon.type?.toLowerCase().includes(q) || false;
        const matchCat = icon.category?.toLowerCase().includes(q) || false;
        const matchTag = icon.tag?.toLowerCase().includes(q) || false;
        return matchTitle || matchName || matchType || matchCat || matchTag;
      }
      return true;
    });
  }, [displayAssets, selectedType, selectedCategory, searchQuery]);

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

  // Copy SVG string
  const handleCopySvg = (svg: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(svg);
      setCopiedId(id);
      addToast({
        type: "success",
        title: "SVG Copied",
        message: "SVG markup copied to clipboard.",
      });
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  // Download single SVG file
  const handleDownloadSingleSvg = (asset: ProjectAsset) => {
    const blob = new Blob([asset.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${asset.name || asset.title || "icon"}.svg`;
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
        const fileName = `${asset.name || asset.title || "icon"}.svg`;
        zip.file(`${typeFolder}/${catFolder}/${fileName}`, asset.svg);
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
      setIsGitConfigOpen(false);
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
        onClick={() => handleCopySvg(icon.svg, icon.id)}
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

        {/* Icon Metadata: Title as primary, optional type/git pill below without category */}
        <div className="w-full truncate mt-2 px-1">
          <span className="font-semibold text-xs text-foreground block truncate" title={displayTitle}>
            {displayTitle}
          </span>
          {(icon.type || icon.source === "git") && (
            <div className="flex items-center justify-center gap-1 mt-1">
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
            <p className="text-[11px] text-muted-foreground">
              Vector SVG icon library &amp; independent Git folder synchronization
            </p>
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

          {/* Quick Sync Button if Git is already configured */}
          {assetGitConfig && assetGitConfig.repo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncAssetsFromGit()}
              disabled={isSyncingAssets}
              className="gap-1.5 h-8 text-xs font-semibold bg-background hover:bg-muted cursor-pointer"
              title={`Sync icons from ${assetGitConfig.repo}/${assetGitConfig.assetFolder || ""}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isSyncingAssets ? "animate-spin" : ""}`} />
              <span>{isSyncingAssets ? "Syncing..." : "Sync from Git"}</span>
            </Button>
          )}

          {/* Git Settings / Connection Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setGitProvider(assetGitConfig?.provider || "github");
              setGitOwner(assetGitConfig?.owner || "");
              setGitProject(assetGitConfig?.project || "");
              setGitRepo(assetGitConfig?.repo || "");
              setGitBranch(assetGitConfig?.branch || "main");
              setGitFolder(assetGitConfig?.assetFolder || "icons");
              setGitPat(assetGitConfig?.pat || "");
              setIsGitConfigOpen(true);
            }}
            className="gap-1.5 h-8 text-xs font-medium bg-background hover:bg-muted cursor-pointer"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{assetGitConfig?.repo ? "Git Config" : "Connect Git"}</span>
          </Button>

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
              /* High-Value Onboarding Empty State */
              <div className="max-w-4xl mx-auto py-8 space-y-8 animate-in fade-in duration-300">
                <div className="text-center space-y-2 max-w-xl mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">
                    No Vector Assets in Project
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload SVG vector icons, folders, or ZIP archives along with a single unified <code className="text-primary font-mono font-semibold">metadata.json</code>, or synchronize automatically from any Git repository.
                  </p>
                </div>

                {/* Two Onboarding Workflow Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* 1. Direct Multi-Layer SVG / ZIP / Folder Dropzone Card */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col justify-between group text-center space-y-4 ${
                      isDragOver
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-border/80 bg-card hover:border-primary/50 hover:bg-card/80 shadow-xs"
                    }`}
                  >
                    <div className="space-y-3 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Upload SVG, Folder, or ZIP</h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                          Drag and drop nested type folders (e.g. <code className="font-mono text-primary">stroke/</code>, <code className="font-mono text-primary">twotone/</code>), a <code className="font-mono text-primary">.zip</code> archive, and <code className="font-mono text-primary">metadata.json</code>.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 text-xs font-semibold gap-1.5 shadow-xs pointer-events-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Select Files or ZIP</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          folderInputRef.current?.click();
                        }}
                        className="text-xs font-semibold gap-1.5"
                      >
                        <FolderUp className="w-3.5 h-3.5" />
                        <span>Folder</span>
                      </Button>
                    </div>
                  </div>

                  {/* 2. Configure Git Sync Provider Card */}
                  <div
                    onClick={() => {
                      setGitProvider(assetGitConfig?.provider || "github");
                      setGitOwner(assetGitConfig?.owner || "");
                      setGitProject(assetGitConfig?.project || "");
                      setGitRepo(assetGitConfig?.repo || "");
                      setGitBranch(assetGitConfig?.branch || "main");
                      setGitFolder(assetGitConfig?.assetFolder || "icons");
                      setGitPat(assetGitConfig?.pat || "");
                      setIsGitConfigOpen(true);
                    }}
                    className="p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between group space-y-4 shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FolderGit2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">Connect Git Folder</h3>
                          <Badge variant="outline" className="text-[9px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                            Independent
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sync from GitHub, GitLab, Azure, or Bitbucket. Pull all multi-layer icon types and <code className="font-mono text-foreground">metadata.json</code> from your repository directory.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-semibold gap-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors pointer-events-none"
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>Configure Asset Sync Provider</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Quick Best Practices Bar */}
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Supports multi-type folders (<code className="font-mono text-foreground font-semibold">stroke/</code>, <code className="font-mono text-foreground font-semibold">twotone/</code>) mapped to a single <code className="font-mono text-foreground font-semibold">metadata.json</code>.</span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground/80">
                    Supports GitHub • GitLab • Azure DevOps • Bitbucket
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

      {/* Independent Git Sync Configuration Modal */}
      <Dialog open={isGitConfigOpen} onOpenChange={setIsGitConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FolderGit2 className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Asset Git Sync Provider</DialogTitle>
                <DialogDescription className="text-xs">
                  Connect a dedicated Git repository folder for vector SVG icons and <code className="font-mono">metadata.json</code>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveGitConfig} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Git Provider</Label>
              <Select
                value={gitProvider}
                onValueChange={(val: any) => setGitProvider(val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="gitlab">GitLab</SelectItem>
                  <SelectItem value="azure">Azure DevOps</SelectItem>
                  <SelectItem value="bitbucket">Bitbucket</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
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

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsGitConfigOpen(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingGitConfig || isSyncingAssets}
                className="text-xs h-8 gap-1.5 font-semibold"
              >
                {isSavingGitConfig || isSyncingAssets ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FolderGit2 className="w-3.5 h-3.5" />
                )}
                <span>Save &amp; Sync Now</span>
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
