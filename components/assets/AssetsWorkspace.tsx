"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { shallow } from "zustand/shallow";
import { ProjectAsset, AssetFolder, AssetCollection, AssetType, AssetGitConfig, FigmaSourceLink } from "@/types/tenant";
import { detectContentType, deriveAssetType, extensionFromContentType } from "@/lib/r2";
import { formatBytes } from "@/utils/assetFormatting";
import { CreateCollectionModal } from "@/components/assets/CreateCollectionModal";
import { UploadAssetsModal } from "@/components/assets/UploadAssetsModal";
import { AssetListView } from "@/components/assets/AssetListView";
import { AssetDetailStudio } from "@/components/assets/studio/AssetDetailStudio";

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
  FolderPlus,
  FolderInput,
  Layers,
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
  Film,
  Sparkles,
  Settings,
  Shield,
  Heart,
  Globe,
  Grid,
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
  Loader2,
  List,
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
  "bold", "curved", "light", "thin", "duotone", "duo-tone", "duo tone", "regular", "glyph", "sharp", "flat",
  "color", "colour", "colored", "coloured", "fullcolor", "full-color", "multicolor", "multicolour",
  "monochrome", "monochromic", "monochromatic", "mono", "brand"
]);

const ASSET_COLLATOR = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
const ASSET_BATCH_SIZE = 48;

/**
 * Formats a category or type name by replacing hyphens and underscores with spaces and applying Title Case.
 * e.g. "add-remove-delete" -> "Add Remove Delete", "two-tone" -> "Two Tone"
 */
export function formatCategoryName(category?: string): string {
  if (!category) return "";
  if (category.toLowerCase() === "general") return "";
  const formatted = category
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
  return formatted || category;
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
function parseRawPathMeta(relativePath: string): { derivedType?: string; derivedCategory?: string; stem: string } {
  const clean = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  let parts = clean.split("/").filter(Boolean);
  const fileName = parts.pop() || "";
  const stem = fileName.replace(/\.svg$/i, "");

  // Strip generic root prefixes if present (e.g. "icons", "logos", "assets", "svg", "dist", "src")
  while (parts.length > 0 && /^(icons?|logos?|assets?|svgs?|dist|src|build|exports?)$/i.test(parts[0])) {
    parts = parts.slice(1);
  }

  let derivedType: string | undefined = undefined;
  let derivedCategory: string | undefined = undefined;

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
    derivedCategory = catParts.length > 0 ? catParts.join("-") : undefined;
  } else if (parts.length >= 2) {
    derivedType = parts[0];
    derivedCategory = parts.slice(1).join("-");
  } else if (parts.length === 1) {
    const single = parts[0];
    const normSingle = normalizeKey(single);
    if (KNOWN_TYPE_NAMES.has(normSingle) || KNOWN_TYPE_NAMES.has(single.toLowerCase())) {
      derivedType = single;
      derivedCategory = undefined;
    } else {
      derivedCategory = single;
    }
  }

  return { derivedType, derivedCategory, stem };
}

/**
 * Converts a browser File into a pure Base64 string for R2 binary uploads.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.includes(",") ? res.split(",")[1] : res;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Determines the semantic AssetType (icon, image, video, document, other)
 * from asset metadata, MIME contentType, and filename.
 */
export function getInferredAssetType(asset: ProjectAsset, folderName?: string): AssetType {
  if (asset.assetType) return asset.assetType;
  const mime = (asset.contentType || "").toLowerCase();
  const name = asset.name.toLowerCase();
  const title = (asset.title || "").toLowerCase();
  const url = (asset.url || "").toLowerCase();
  const folder = (folderName || "").toLowerCase();
  const path = (asset.path || "").toLowerCase();
  const category = (asset.category || "").toLowerCase();

  // If inside an illustrations folder, category, path, or named as illustration
  if (
    folder.includes("illustration") ||
    category.includes("illustration") ||
    path.includes("illustration") ||
    name.includes("illustration") ||
    title.includes("illustration")
  ) {
    return "illustration";
  }

  if (mime.includes("svg") || name.endsWith(".svg") || url.endsWith(".svg")) return "icon";
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|ico|bmp|avif)$/i.test(name) || /\.(png|jpe?g|webp|gif|ico)$/i.test(url)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(name) || /\.(mp4|webm|mov)$/i.test(url)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name)) return "audio";
  if (/\.(woff2?|ttf|otf|eot)$/i.test(name)) return "font";
  if (/\.(lottie|tgs)$/i.test(name) || (/lottie/i.test(name) && /\.json$/i.test(name))) return "lottie";
  if (mime.includes("pdf") || mime.includes("document") || /\.(pdf|docx?|pptx?|txt)$/i.test(name) || url.endsWith(".pdf")) return "document";
  return "icon";
}

function isSvgAsset(asset: ProjectAsset): boolean {
  const name = asset.name.toLowerCase();
  const url = (asset.url || "").split(/[?#]/, 1)[0].toLowerCase();
  return !!asset.svg || (asset.contentType || "").toLowerCase().includes("svg") || name.endsWith(".svg") || url.endsWith(".svg");
}

function getAssetFormat(asset: ProjectAsset): string {
  const rawFormat = asset.format || asset.contentType?.split("/").pop() || asset.name.split(".").pop() || "";
  const format = rawFormat.toLowerCase().replace("jpeg", "jpg");
  return format === "svg+xml" ? "svg" : format;
}

async function getImageDimensions(file: Blob, contentType = file.type): Promise<ProjectAsset["dimensions"]> {
  if (!contentType.startsWith("image/") || contentType.includes("svg")) return undefined;
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close();
  let left = width;
  let right = height;
  while (right !== 0) [left, right] = [right, left % right];
  return { width, height, aspect: `${width / left}:${height / left}` };
}

export function isColorSvgAsset(asset: ProjectAsset, folderName?: string): boolean {
  // 1. Semantic asset type
  const itemType = asset.assetType || getInferredAssetType(asset, folderName);
  if (itemType === "illustration" || itemType === "image") return true;

  // 2. Folder / Collection context
  const folder = (folderName || "").toLowerCase();
  if (/(illustration|logo|brand|graphic|badge|color)/i.test(folder)) return true;

  // 3. Inspect metadata, names, tags, types with camelCase / PascalCase boundary splitting
  const rawFields = [asset.type, asset.category, asset.tag, asset.name, asset.title, asset.path].filter(Boolean) as string[];
  const normalizedText = rawFields
    .map((str) => str.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase())
    .join(" ");

  const colorKeywordPattern = /\b(color|colour|colored|coloured|fullcolor|full[-_ ]?color|multicolor|multi[-_ ]?color|duotone|duo[-_ ]?tone|twotone|two[-_ ]?tone|brand|logo|badge|illustration|visa|paypal|mastercard|google|slack|discord|youtube|twitter|facebook|twitch|whatsapp|telegram|instagram)\b/i;
  if (colorKeywordPattern.test(normalizedText)) {
    return true;
  }

  // 4. Inline SVG markup inspection
  if (asset.svg) {
    if (/<(linearGradient|radialGradient|pattern|image)/i.test(asset.svg)) return true;
    const colorMatches = asset.svg.match(/(?:fill|stroke)=["']([^"']+)["']/gi) || [];
    const nonNeutralColors = new Set<string>();
    for (const match of colorMatches) {
      const val = match.replace(/^(?:fill|stroke)=["']|["']$/gi, "").trim().toLowerCase();
      if (!val || ["none", "currentcolor", "inherit", "transparent", "#000", "#000000", "#fff", "#ffffff", "black", "white"].includes(val)) {
        continue;
      }
      nonNeutralColors.add(val);
    }
    if (nonNeutralColors.size > 0) return true;
  }

  return false;
}

function hasFixedSvgVariant(asset: ProjectAsset, folderName?: string): boolean {
  return isColorSvgAsset(asset, folderName);
}

/**
 * Formats file size in bytes to human-readable string.
 */
export { formatBytes };

/**
 * Maps folder icon identifier to corresponding Lucide icon component.
 */
export function getFolderIconComponent(iconName?: string) {
  switch (iconName?.toLowerCase()) {
    case "image":
    case "images":
    case "photo":
    case "photos":
      return ImageIcon;
    case "video":
    case "videos":
    case "motion":
    case "film":
      return Film;
    case "filetext":
    case "doc":
    case "document":
    case "documents":
    case "pdf":
      return FileText;
    case "sparkles":
      return Sparkles;
    case "briefcase":
      return Briefcase;
    case "shield":
      return Shield;
    case "heart":
      return Heart;
    case "globe":
      return Globe;
    case "building":
      return Building;
    case "layers":
      return Layers;
    case "award":
      return Award;
    default:
      return Folder;
  }
}

export type CanvasBgMode = "subtle" | "light" | "dark";

export const getCanvasPreviewStyle = (mode: CanvasBgMode = "subtle"): React.CSSProperties => {
  if (mode === "dark") {
    return {
      backgroundColor: "#111215",
      backgroundImage: "none",
    };
  }
  if (mode === "light") {
    return {
      backgroundColor: "#ffffff",
      backgroundImage: "none",
    };
  }
  // "subtle" (default) - very subtle neutral background with micro-checkerboard
  return {
    backgroundColor: "hsl(var(--muted) / 0.65)",
    backgroundImage: `
      linear-gradient(45deg, hsl(var(--foreground) / 0.04) 25%, transparent 25%),
      linear-gradient(-45deg, hsl(var(--foreground) / 0.04) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, hsl(var(--foreground) / 0.04) 75%),
      linear-gradient(-45deg, transparent 75%, hsl(var(--foreground) / 0.04) 75%)
    `,
    backgroundSize: "12px 12px",
    backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
  };
};

interface AssetPreviewThumbnailProps {
  icon: ProjectAsset;
  displayTitle: string;
}

const AssetPreviewThumbnail: React.FC<AssetPreviewThumbnailProps> = React.memo(({ icon, displayTitle }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [icon.url]);

  const previewStyle = getCanvasPreviewStyle("subtle");

  // Monochrome SVGs invert in dark mode for contrast; colored SVGs and illustrations keep their authored colors.
  const isColored = isColorSvgAsset(icon);
  const shouldInvertMonochrome = isSvgAsset(icon) && !isColored;
  const shouldInvertInDarkMode =
    !isSvgAsset(icon) &&
    icon.source === "git" &&
    !icon.name.toLowerCase().includes("dark") &&
    !icon.name.toLowerCase().includes("color");

  return (
    <div
      className="w-full h-22 rounded-lg border border-border/50 relative flex items-center justify-center p-2.5 overflow-hidden transition-all duration-200"
      style={previewStyle}
    >
      {!isLoaded && !hasError && icon.url && (
        <div className="absolute inset-0 bg-muted/40 animate-pulse pointer-events-none" />
      )}

      {hasError ? (
        <div className="flex flex-col items-center justify-center text-muted-foreground/50 text-xs">
          <ImageIcon className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Error</span>
        </div>
      ) : icon.svg ? (
        <div
          className={`max-h-14 max-w-[85%] flex items-center justify-center [&>svg]:w-auto [&>svg]:h-auto [&>svg]:max-w-full [&>svg]:max-h-14 ${shouldInvertMonochrome ? "dark:invert dark:opacity-90" : ""}`}
          dangerouslySetInnerHTML={{ __html: icon.svg }}
        />
      ) : icon.url ? (
        <img
          src={icon.url}
          alt={displayTitle}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`max-h-14 max-w-[85%] object-contain transition-opacity duration-150 ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${
            shouldInvertMonochrome || shouldInvertInDarkMode
              ? "dark:invert dark:opacity-90"
              : ""
          }`}
          loading="lazy"
        />
      ) : (
        <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
      )}
    </div>
  );
});

AssetPreviewThumbnail.displayName = "AssetPreviewThumbnail";

const ImagePreviewThumbnail: React.FC<AssetPreviewThumbnailProps> = React.memo(({ icon, displayTitle }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [icon.url]);

  const previewStyle = getCanvasPreviewStyle("subtle");

  return (
    <div
      className="w-full h-22 rounded-lg border border-border/50 overflow-hidden flex items-center justify-center relative transition-all duration-200 p-2"
      style={previewStyle}
    >
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-muted/40 animate-pulse pointer-events-none" />
      )}
      {hasError ? (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 text-xs">
          <ImageIcon className="w-6 h-6" />
        </div>
      ) : (
        <img
          src={icon.url}
          alt={displayTitle}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`max-h-full max-w-full object-contain transition-opacity duration-150 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
        />
      )}
    </div>
  );
});

ImagePreviewThumbnail.displayName = "ImagePreviewThumbnail";

export const AssetsWorkspace: React.FC = () => {
  const {
    currentOrg,
    currentProject,
    assets: storeAssets,
    assetFolders = [],
    activeFolderId = null,
    setActiveFolderId,
    createCollection,
    updateCollection,
    deleteCollection,
    moveAssetsToFolder,
    uploadAssets,
    uploadAssetsDirect,
    applyMetadataToAssets,
    updateAsset,
    updateAssetDetails,
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
    isLoadingAssets,
    r2StorageError,
    refreshAssets,
    addToast,
    canUserEdit,
  } = useTokenStore(
    (state) => ({
      currentOrg: state.currentOrg,
      currentProject: state.currentProject,
      assets: state.assets,
      assetFolders: state.assetFolders,
      activeFolderId: state.activeFolderId,
      setActiveFolderId: state.setActiveFolderId,
      createCollection: state.createCollection,
      updateCollection: state.updateCollection,
      deleteCollection: state.deleteCollection,
      moveAssetsToFolder: state.moveAssetsToFolder,
      uploadAssets: state.uploadAssets,
      uploadAssetsDirect: state.uploadAssetsDirect,
      applyMetadataToAssets: state.applyMetadataToAssets,
      updateAsset: state.updateAsset,
      updateAssetDetails: state.updateAssetDetails,
      updateAssets: state.updateAssets,
      deleteAsset: state.deleteAsset,
      deleteAssets: state.deleteAssets,
      assetGitConfig: state.assetGitConfig,
      setAssetGitConfig: state.setAssetGitConfig,
      syncAssetsFromGit: state.syncAssetsFromGit,
      togglePauseAssetGit: state.togglePauseAssetGit,
      disconnectAssetGit: state.disconnectAssetGit,
      isSyncingAssets: state.isSyncingAssets,
      assetFigmaConfig: state.assetFigmaConfig,
      setAssetFigmaConfig: state.setAssetFigmaConfig,
      setFigmaPat: state.setFigmaPat,
      addFigmaSource: state.addFigmaSource,
      updateFigmaSource: state.updateFigmaSource,
      removeFigmaSource: state.removeFigmaSource,
      togglePauseFigmaSource: state.togglePauseFigmaSource,
      syncSingleFigmaSource: state.syncSingleFigmaSource,
      syncAllFigmaSources: state.syncAllFigmaSources,
      togglePauseFigmaSync: state.togglePauseFigmaSync,
      syncAssetsFromFigma: state.syncAssetsFromFigma,
      isSyncingFigmaAssets: state.isSyncingFigmaAssets,
      isLoadingAssets: state.isLoadingAssets,
      r2StorageError: state.r2StorageError,
      refreshAssets: state.refreshAssets,
      addToast: state.addToast,
      canUserEdit: state.canUserEdit,
    }),
    shallow
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAssetType, setSelectedAssetType] = useState<"all" | "icon" | "image" | "illustration" | "video" | "document">("all");
  const [selectedFigmaSource, setSelectedFigmaSource] = useState<string>("all");
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(new Set());
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showSourceBadges, setShowSourceBadges] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selection & Bulk Actions State
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkMetadataOpen, setIsBulkMetadataOpen] = useState(false);
  const [singleDeleteAsset, setSingleDeleteAsset] = useState<ProjectAsset | null>(null);
  const emptyCollectionInputRef = useRef<HTMLInputElement | null>(null);

  // Drag and Drop Zone State
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragTargetFolderId, setDragTargetFolderId] = useState<string | null>(null);

  // Folder management modals state
  const [isEditFolderOpen, setIsEditFolderOpen] = useState(false);
  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false);
  const [isMoveAssetsOpen, setIsMoveAssetsOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<AssetFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<AssetFolder | null>(null);
  const [folderFormName, setFolderFormName] = useState("");
  const [folderFormDesc, setFolderFormDesc] = useState("");
  const [folderFormIcon, setFolderFormIcon] = useState("Folder");
  const [folderFormColor, setFolderFormColor] = useState("blue");
  const [targetMoveFolderId, setTargetMoveFolderId] = useState<string | null>(null);
  const [assetToMoveId, setAssetToMoveId] = useState<string | null>(null);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(null);

  // Media preview modal / drawer state (for video / full image / doc preview)
  const [previewMediaAsset, setPreviewMediaAsset] = useState<ProjectAsset | null>(null);
  const [detailAsset, setDetailAsset] = useState<ProjectAsset | null>(null);
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [isUploadQueueOpen, setIsUploadQueueOpen] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  // Canvas background mode removed — always uses "subtle"

  // File Upload Refs
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
  const [editFormFolderId, setEditFormFolderId] = useState<string | undefined>(undefined);
  const [bulkFormTitle, setBulkFormTitle] = useState("");
  const [bulkFormType, setBulkFormType] = useState("");
  const [bulkFormCategory, setBulkFormCategory] = useState("");
  const [bulkFormTag, setBulkFormTag] = useState("");

  // Configuration status helper flags
  const hasFigmaConfigured = Boolean(
    assetFigmaConfig?.pat && assetFigmaConfig?.sources && assetFigmaConfig.sources.length > 0
  );
  const hasGitConfigured = Boolean(assetGitConfig?.repo && assetGitConfig?.pat);

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
  const [sourceToRemove, setSourceToRemove] = useState<FigmaSourceLink | null>(null);

  // Syncing single source state
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);

  // Effective assets list
  const displayAssets: ProjectAsset[] = useMemo(() => {
    return storeAssets || [];
  }, [storeAssets]);

  // Precomputed folder counts
  const folderCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    displayAssets.forEach((a) => {
      const collectionId = a.collectionId || a.folderId;
      if (collectionId) {
        counts.set(collectionId, (counts.get(collectionId) || 0) + 1);
      }
    });
    return counts;
  }, [displayAssets]);

  // Asset type counts (scoped to active folder if selected, or overall)
  const assetTypeCounts = useMemo(() => {
    const counts = { all: 0, icon: 0, image: 0, video: 0, document: 0, other: 0 };
    const pool = activeFolderId ? displayAssets.filter((a) => (a.collectionId || a.folderId) === activeFolderId) : displayAssets;
    counts.all = pool.length;
    pool.forEach((a) => {
      const type = getInferredAssetType(a);
      if (counts[type as keyof typeof counts] !== undefined) {
        counts[type as keyof typeof counts]++;
      } else {
        counts.other++;
      }
    });
    return counts;
  }, [displayAssets, activeFolderId]);

  // Active folder details
  const currentActiveFolder = useMemo(() => {
    if (!activeFolderId) return null;
    return assetFolders.find((f) => f.id === activeFolderId) || null;
  }, [assetFolders, activeFolderId]);

  // Unique icon types found in metadata or folder structure
  const iconTypes = useMemo(() => {
    const set = new Set<string>();
    const pool = activeFolderId ? displayAssets.filter((a) => (a.collectionId || a.folderId) === activeFolderId) : displayAssets;
    pool.forEach((a) => {
      if (a.type) set.add(a.type.toLowerCase());
    });
    return Array.from(set).sort();
  }, [displayAssets, activeFolderId]);

  const assetFormats = useMemo(() => Array.from(new Set(displayAssets.map(getAssetFormat).filter(Boolean))).sort(), [displayAssets]);
  const assetTags = useMemo(() => {
    const tags = new Set<string>();
    displayAssets.forEach((asset) => asset.tag?.split(",").forEach((tag) => {
      const normalizedTag = tag.trim().toLowerCase();
      if (normalizedTag) tags.add(normalizedTag);
    }));
    return Array.from(tags).sort((a, b) => ASSET_COLLATOR.compare(a, b));
  }, [displayAssets]);

  // Precomputed category counts in a single O(N) pass (strictly scoped to active folder)
  const categoryCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    const pool = activeFolderId ? displayAssets.filter((a) => (a.collectionId || a.folderId) === activeFolderId) : displayAssets;
    pool.forEach((a) => {
      if (a.category && a.category.trim() && a.category.toLowerCase() !== "general") {
        const cat = a.category.trim().toLowerCase();
        counts.set(cat, (counts.get(cat) || 0) + 1);
      }
    });
    return counts;
  }, [displayAssets, activeFolderId]);

  // Unique categories (strictly scoped to active folder)
  const categories = useMemo(() => {
    const set = new Set<string>();
    const pool = activeFolderId ? displayAssets.filter((a) => (a.collectionId || a.folderId) === activeFolderId) : displayAssets;
    pool.forEach((a) => {
      if (a.category && a.category.trim() && a.category.toLowerCase() !== "general") {
        set.add(a.category.trim().toLowerCase());
      }
    });
    return Array.from(set).sort((a, b) => ASSET_COLLATOR.compare(a, b));
  }, [displayAssets, activeFolderId]);

  // Automatically reset category filter when active folder changes
  useEffect(() => {
    setSelectedCategory("all");
  }, [activeFolderId]);

  // Filtered categories in left sidebar
  const filteredCategoryList = useMemo(() => {
    if (!categorySearchQuery.trim()) return categories;
    const q = categorySearchQuery.toLowerCase();
    return categories.filter((c) => c.toLowerCase().includes(q) || formatCategoryName(c).toLowerCase().includes(q));
  }, [categories, categorySearchQuery]);

  // Filtered assets with Folder & Asset Type & Icon Type & Category filtering + Tag-Based Search Metadata
  const filteredAssets = useMemo(() => {
    return displayAssets.filter((icon) => {
      if (activeFolderId !== null && (icon.collectionId || icon.folderId) !== activeFolderId) {
        return false;
      }
      if (selectedAssetType !== "all") {
        const itemType = getInferredAssetType(icon);
        if (itemType !== selectedAssetType) return false;
      }
      if (selectedType !== "all" && icon.type?.toLowerCase() !== selectedType) {
        return false;
      }
      if (selectedCategory !== "all" && icon.category?.toLowerCase() !== selectedCategory) {
        return false;
      }
      if (selectedFigmaSource !== "all" && icon.figmaSourceId !== selectedFigmaSource) {
        return false;
      }
      if (selectedFormats.size > 0 && !selectedFormats.has(getAssetFormat(icon))) {
        return false;
      }
      if (selectedTag !== "all" && !icon.tag?.split(",").map((tag) => tag.trim().toLowerCase()).includes(selectedTag)) {
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
    }).sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortBy === "date") return direction * ((Date.parse(a.createdAt || a.updatedAt) || 0) - (Date.parse(b.createdAt || b.updatedAt) || 0));
      if (sortBy === "size") return direction * ((a.size || 0) - (b.size || 0));
      return direction * ASSET_COLLATOR.compare(a.title || a.name, b.title || b.name);
    });
  }, [displayAssets, activeFolderId, selectedAssetType, selectedType, selectedCategory, selectedFigmaSource, searchQuery, selectedFormats, selectedTag, sortBy, sortDirection]);

  const isUnfilteredEmptyCollection = Boolean(
    !isLoadingAssets &&
    currentActiveFolder &&
    filteredAssets.length === 0 &&
    searchQuery === "" &&
    selectedType === "all" &&
    selectedCategory === "all" &&
    selectedAssetType === "all" &&
    selectedFigmaSource === "all" &&
    selectedFormats.size === 0 &&
    selectedTag === "all"
  );

  // Progressive loading: only render visibleCount icons at once to prevent DOM freezing
  const [visibleCount, setVisibleCount] = useState(ASSET_BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset visibleCount whenever filters change
  React.useEffect(() => {
    setVisibleCount(ASSET_BATCH_SIZE);
  }, [activeFolderId, selectedAssetType, selectedType, selectedCategory, selectedFigmaSource, searchQuery, selectedFormats, selectedTag, sortBy, sortDirection]);

  // Ensure assets are fetched if currently empty and not loading
  React.useEffect(() => {
    if (currentOrg && currentProject && storeAssets.length === 0 && !isLoadingAssets && !r2StorageError) {
      refreshAssets();
    }
  }, [currentOrg?.id, currentProject?.id]);

  // Assets are persisted to R2 through store actions.

  // Infinite scroll intersection observer to smoothly load the next batch
  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + ASSET_BATCH_SIZE, filteredAssets.length));
        }
      },
      { rootMargin: "350px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredAssets.length, viewMode]);

  // Precompute total counts per type for section headers
  const totalCountByType = useMemo(() => {
    const map = new Map<string, number>();
    const fallbackName = currentActiveFolder ? currentActiveFolder.name : "All Assets";
    filteredAssets.forEach((asset) => {
      let type = asset.type || fallbackName;
      if (type.toLowerCase() === "general") type = fallbackName;
      map.set(type, (map.get(type) || 0) + 1);
    });
    return map;
  }, [filteredAssets, currentActiveFolder]);

  // Group filtered assets directly by Type, slicing to visibleCount for smooth DOM performance
  const groupedAssetsByType = useMemo(() => {
    const visibleSlice = filteredAssets.slice(0, visibleCount);
    const map = new Map<string, ProjectAsset[]>();
    const fallbackName = currentActiveFolder ? currentActiveFolder.name : "All Assets";
    visibleSlice.forEach((asset) => {
      let type = asset.type || fallbackName;
      if (type.toLowerCase() === "general") type = fallbackName;
      if (!map.has(type)) map.set(type, []);
      map.get(type)!.push(asset);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => ASSET_COLLATOR.compare(a, b))
      .map(([typeName, icons]) => ({
        typeName,
        icons,
      }));
  }, [filteredAssets, visibleCount, currentActiveFolder]);

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
   * Unified Processor for multi-layer SVG files, binary media assets, and metadata.json
   */
  const processRawFileList = async (
    rawFiles: Array<{ path: string; content: string; isBinary?: boolean; contentType?: string; size?: number; dimensions?: ProjectAsset["dimensions"] }>,
    targetFolderId?: string | null
  ) => {
    let metadataMap = new Map<string, RawMetadataItem>();
    const svgItems: Array<{ path: string; content: string }> = [];
    const mediaItems: Array<{ path: string; content: string; isBinary?: boolean; contentType?: string; size?: number; dimensions?: ProjectAsset["dimensions"] }> = [];

    const effectiveFolderId = targetFolderId !== undefined ? (targetFolderId || undefined) : (activeFolderId || undefined);

    // Step 1: Extract all metadata JSON files and partition files
    for (const item of rawFiles) {
      const lower = item.path.toLowerCase();
      if (lower.endsWith(".json")) {
        const parsedMap = parseMetadataJson(item.content);
        parsedMap.forEach((v, k) => metadataMap.set(k, v));
      } else if (lower.endsWith(".svg")) {
        svgItems.push({ path: item.path, content: item.content });
      } else {
        mediaItems.push(item);
      }
    }

    // If metadata.json was uploaded without any asset files, apply it to existing project assets
    if (metadataMap.size > 0 && svgItems.length === 0 && mediaItems.length === 0) {
      await applyMetadataToAssets(metadataMap);
      return;
    }

    const newAssets: Array<{
      name: string;
      title?: string;
      type?: string;
      tag?: string;
      category?: string;
      folderId?: string;
      assetType?: AssetType;
      svg?: string;
      content?: string;
      contentType?: string;
      dimensions?: ProjectAsset["dimensions"];
      colorSpace?: string;
      format?: string;
    }> = [];

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
        const resolvedCategory = matchedMeta?.category || (derivedCategory && derivedCategory !== "general" ? derivedCategory : undefined) || (selectedCategory !== "all" ? selectedCategory : undefined);

        const collection = effectiveFolderId ? assetFolders.find((f) => f.id === effectiveFolderId) : null;
        const isIllustrationContext = Boolean(
          collection?.name.toLowerCase().includes("illustration") ||
          (effectiveFolderId && effectiveFolderId.toLowerCase().includes("illustration")) ||
          stem.toLowerCase().includes("illustration") ||
          item.path.toLowerCase().includes("illustration")
        );
        const resolvedAssetType: AssetType = isIllustrationContext ? "illustration" : "icon";

        newAssets.push({
          name: matchedMeta?.name || stem,
          title: matchedMeta?.title || stem,
          type: resolvedType,
          tag: matchedMeta?.tag || undefined,
          category: resolvedCategory,
          folderId: effectiveFolderId,
          assetType: resolvedAssetType,
          svg: cleanedSvg,
          content: cleanedSvg,
          contentType: "image/svg+xml",
        });
      }
    }

    // Step 3: Process non-SVG binary media items (images, videos, documents)
    for (const item of mediaItems) {
      const clean = item.path.replace(/\\/g, "/").replace(/^\/+/, "");
      const parts = clean.split("/").filter(Boolean);
      const fileName = parts.pop() || "asset";
      const stem = fileName.replace(/\.[^/.]+$/, "");
      const mime = item.contentType || detectContentType(fileName);
      const derivedType = deriveAssetType(mime, fileName);
      const resolvedCategory = parts.length > 0 ? parts.join("-") : (selectedCategory !== "all" ? selectedCategory : undefined);

      newAssets.push({
        name: stem,
        title: stem,
        type: derivedType,
        category: resolvedCategory,
        folderId: effectiveFolderId,
        assetType: derivedType,
        content: item.content,
        contentType: mime,
        dimensions: item.dimensions,
        colorSpace: item.dimensions ? "sRGB" : undefined,
        format: mime.split("/").pop()?.replace("jpeg", "jpg").toUpperCase(),
      });
    }

    if (newAssets.length > 0) {
      await uploadAssets(newAssets);
    }
  };

  /**
   * Reads standard FileList, unzipping any .zip archives or extracting folder paths
   */
  const handleProcessIncomingFiles = async (
    files: FileList | File[],
    targetFolderId?: string | null,
    dimensionsByFileKey?: Map<string, NonNullable<ProjectAsset["dimensions"]>>
  ) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    if (!canUserEdit()) {
      addToast({
        type: "info",
        title: "Read-Only Mode",
        message: "Viewer role cannot upload assets.",
      });
      return;
    }

    if (fileList.length > 1) {
      addToast({
        type: "info",
        title: "Uploading Multiple Assets",
        message: `Processing ${fileList.length} assets for upload...`,
      });
    }

    const rawFiles: Array<{ path: string; content: string; isBinary?: boolean; contentType?: string; size?: number; dimensions?: ProjectAsset["dimensions"] }> = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const relativePath = (file as any).webkitRelativePath || file.name;
      const lower = file.name.toLowerCase();

      if (lower.endsWith(".zip")) {
        try {
          const zip = await JSZip.loadAsync(file);
          const zipEntries: Array<Promise<void>> = [];

          zip.forEach((path, entry) => {
            if (!entry.dir) {
              const entryLower = path.toLowerCase();
              if (entryLower.endsWith(".json") || entryLower.endsWith(".svg")) {
                zipEntries.push(
                  entry.async("text").then((text) => {
                    rawFiles.push({ path, content: text, isBinary: false, contentType: entryLower.endsWith(".svg") ? "image/svg+xml" : "application/json" });
                  })
                );
              } else {
                zipEntries.push((async () => {
                  const contentType = detectContentType(path);
                  if (contentType.startsWith("image/")) {
                    const blob = await entry.async("blob");
                    const dimensions = await getImageDimensions(blob, contentType);
                    const file = new File([blob], path.split("/").pop() || "asset", { type: contentType });
                    rawFiles.push({
                      path,
                      content: await fileToBase64(file),
                      isBinary: true,
                      contentType,
                      dimensions,
                      size: blob.size,
                    });
                    return;
                  }
                  rawFiles.push({
                    path,
                    content: await entry.async("base64"),
                    isBinary: true,
                    contentType,
                  });
                })());
              }
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
      } else if (lower.endsWith(".svg") || lower.endsWith(".json")) {
        try {
          const text = await file.text();
          rawFiles.push({ path: relativePath, content: text, isBinary: false, contentType: lower.endsWith(".svg") ? "image/svg+xml" : "application/json" });
        } catch (err) {
          console.warn("Failed reading file:", file.name, err);
        }
      } else {
        // Binary files: images, videos, documents
        try {
          const base64 = await fileToBase64(file);
          rawFiles.push({
            path: relativePath,
            content: base64,
            isBinary: true,
            contentType: file.type || detectContentType(file.name),
            size: file.size,
            dimensions: dimensionsByFileKey?.get(`${file.name}:${file.size}:${file.lastModified}`),
          });
        } catch (err) {
          console.warn("Failed reading file:", file.name, err);
        }
      }
    }

    if (rawFiles.length > 0) {
      await processRawFileList(rawFiles, targetFolderId !== undefined ? targetFolderId : uploadTargetFolderId ?? undefined);
      setUploadTargetFolderId(null);
    }
  };

  const handleCreateCollection = async (
    collection: Omit<AssetCollection, "id" | "createdAt" | "updatedAt">
  ) => {
    const created = await createCollection(collection);
    setActiveFolderId(created.id);
  };

  const handleQueueUpload = async (
    files: File[],
    collectionId: string | null,
    dimensions: Map<string, NonNullable<ProjectAsset["dimensions"]>>
  ) => {
    const collection = assetFolders.find((item) => item.id === collectionId);
    const allowedTypes = collection?.allowedAssetTypes;
    if (allowedTypes?.length) {
      const incompatible = files.filter((file) => {
        if (file.name.toLowerCase().endsWith(".zip")) return false;
        const type = deriveAssetType(file.type || detectContentType(file.name), file.name);
        return !allowedTypes.includes(type);
      });
      if (incompatible.length > 0) {
        throw new Error(`This collection does not allow: ${incompatible.map((file) => file.name).join(", ")}.`);
      }
    }
    const supportsDirectUpload = files.every((file) =>
      file.size >= 5 * 1024 * 1024 &&
      !file.name.toLowerCase().endsWith(".zip") &&
      !file.name.toLowerCase().endsWith(".json")
    );
    if (supportsDirectUpload) {
      const uploads = files.map((file) => {
        const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        const normalizedPath = path.replace(/\\/g, "/");
        const parts = normalizedPath.split("/").filter(Boolean);
        const fileName = parts.pop() || file.name;
        const name = fileName.replace(/\.[^/.]+$/, "");
        const contentType = file.type || detectContentType(file.name);
        const isIllustrationFolder = Boolean(
          collection?.name.toLowerCase().includes("illustration") ||
          (collectionId && collectionId.toLowerCase().includes("illustration")) ||
          normalizedPath.toLowerCase().includes("illustration")
        );
        const assetType: AssetType = isIllustrationFolder && (contentType.includes("svg") || file.name.endsWith(".svg"))
          ? "illustration"
          : deriveAssetType(contentType, file.name);
        const folderCategory = parts.join("-").toLowerCase();
        return {
          file,
          name,
          title: name,
          type: assetType,
          category: folderCategory || (selectedCategory !== "all" ? selectedCategory : undefined),
          folderId: collectionId || undefined,
          assetType,
          contentType,
          dimensions: dimensions.get(`${file.name}:${file.size}:${file.lastModified}`),
          colorSpace: contentType.startsWith("image/") ? "sRGB" : undefined,
          format: contentType.split("/").pop()?.replace("jpeg", "jpg").toUpperCase(),
          path,
        };
      });
      await uploadAssetsDirect(uploads);
      return;
    }
    setUploadTargetFolderId(collectionId);
    await handleProcessIncomingFiles(files, collectionId, dimensions);
  };

  const uploadEmptyCollectionFiles = async (files: File[], collectionId: string) => {
    if (!canUserEdit()) {
      addToast({
        type: "info",
        title: "Read-Only Mode",
        message: "Viewer role cannot upload assets.",
      });
      return;
    }

    const dimensions = new Map<string, NonNullable<ProjectAsset["dimensions"]>>();
    const imageFiles = files.filter((file) => file.type.startsWith("image/") && !file.type.includes("svg"));
    const results = await Promise.all(imageFiles.map(async (file) => {
      try {
        return { file, size: await getImageDimensions(file) };
      } catch (cause) {
        return { file, size: undefined, cause };
      }
    }));
    const failedDimensions = results.filter((result) => "cause" in result).map(({ file }) => file.name);
    if (failedDimensions.length > 0) {
      addToast({
        type: "info",
        title: "Image dimensions unavailable",
        message: `Could not read dimensions for ${failedDimensions.join(", ")}. The files will still be uploaded.`,
      });
    }
    for (const { file, size } of results) {
      if (size) dimensions.set(`${file.name}:${file.size}:${file.lastModified}`, size);
    }

    try {
      await handleQueueUpload(files, collectionId, dimensions);
    } catch (cause) {
      addToast({
        type: "error",
        title: "Upload failed",
        message: cause instanceof Error ? cause.message : "The files could not be uploaded.",
      });
    }
  };

  // Drag and Drop handlers with recursive folder reader
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUnfilteredEmptyCollection) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent, fromEmptyCollectionDropZone = false) => {
    e.preventDefault();
    setIsDragOver(false);

    if (isUnfilteredEmptyCollection && !dragTargetFolderId && !fromEmptyCollectionDropZone) return;

    const folderTarget = dragTargetFolderId || activeFolderId || undefined;
    setDragTargetFolderId(null);

    // Check if DataTransfer items support webkitGetAsEntry for recursive folder drop
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const entries: any[] = [];
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) entries.push(entry);
      }

      if (entries.length > 0 && entries.some((entry) => entry.isDirectory)) {
        const rawFiles: Array<{ path: string; content: string; isBinary?: boolean; contentType?: string; dimensions?: ProjectAsset["dimensions"] }> = [];

        const readEntry = async (entry: any, currentPath = ""): Promise<void> => {
          if (entry.isFile) {
            const file: File = await new Promise((resolve, reject) => entry.file(resolve, reject));
            const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
            const lower = file.name.toLowerCase();
            if (lower.endsWith(".svg") || lower.endsWith(".json")) {
              const text = await file.text();
              rawFiles.push({ path: fullPath, content: text, isBinary: false, contentType: lower.endsWith(".svg") ? "image/svg+xml" : "application/json" });
            } else {
              const base64 = await fileToBase64(file);
              const contentType = file.type || detectContentType(file.name);
              rawFiles.push({
                path: fullPath,
                content: base64,
                isBinary: true,
                contentType,
                dimensions: await getImageDimensions(file, contentType),
              });
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
          await processRawFileList(rawFiles, folderTarget);
          return;
        }
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const targetFolderId = folderTarget || activeFolderId;
      if (isUnfilteredEmptyCollection && targetFolderId) {
        await uploadEmptyCollectionFiles(files, targetFolderId);
      } else {
        setUploadTargetFolderId(targetFolderId || null);
        setPendingUploadFiles(files);
        setIsUploadQueueOpen(true);
      }
    }
  };

  // Folder submission handlers
  const handleEditFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToEdit || !folderFormName.trim()) return;
    await updateCollection(folderToEdit.id, {
      name: folderFormName.trim(),
      description: folderFormDesc.trim() || undefined,
      icon: folderFormIcon,
      color: folderFormColor,
    });
    setIsEditFolderOpen(false);
    setFolderToEdit(null);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    await deleteCollection(folderToDelete.id);
    setIsDeleteFolderOpen(false);
    setFolderToDelete(null);
  };

  const handleConfirmMoveAssets = async (destinationFolderId: string | null) => {
    const ids = assetToMoveId ? [assetToMoveId] : Array.from(selectedAssetIds);
    if (ids.length === 0) return;
    try {
      await moveAssetsToFolder(ids, destinationFolderId);
      setAssetToMoveId(null);
      setIsMoveAssetsOpen(false);
      if (!assetToMoveId) {
        setSelectedAssetIds(new Set());
      }
    } catch (cause) {
      addToast({
        type: "error",
        title: "Move Failed",
        message: cause instanceof Error ? cause.message : "Could not move the selected assets.",
      });
    }
  };

  // Handle replacing an individual asset file (SVG or binary)
  const handleReplaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingAssetId) return;

    try {
      const existingAsset = displayAssets.find((asset) => asset.id === replacingAssetId);
      if (!existingAsset) throw new Error("The asset to replace could not be found.");
      const isSvg = file.name.toLowerCase().endsWith(".svg");
      let content: string;
      let mime: string;
      let svg: string | undefined;
      if (isSvg) {
        const text = await file.text();
        const cleanedSvg = text
          .replace(/<\?xml[^>]*\?>/gi, "")
          .replace(/<!DOCTYPE[^>]*>/gi, "")
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .trim();

        if (!cleanedSvg.includes("<svg")) throw new Error("The selected file is not a valid SVG.");
        content = cleanedSvg;
        svg = cleanedSvg;
        mime = "image/svg+xml";
      } else {
        content = await fileToBase64(file);
        mime = file.type || detectContentType(file.name);
      }

      const itemType = deriveAssetType(mime, file.name);
      const dimensions = await getImageDimensions(file, mime);
      const nextName = isSvg ? existingAsset.name : file.name.replace(/\.[^/.]+$/, "");
      const nextTitle = isSvg ? existingAsset.title || existingAsset.name : nextName;
      const { currentOrg, currentProject } = useTokenStore.getState();
      if (!currentOrg || !currentProject) throw new Error("Select a project before replacing an asset.");
      const response = await fetch("/api/assets/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: currentOrg.id,
          projectId: currentProject.id,
          assets: [{
            ...existingAsset,
            name: nextName,
            title: nextTitle,
            content,
            contentType: mime,
            assetType: itemType,
            dimensions,
            colorSpace: dimensions ? "sRGB" : undefined,
            format: mime.split("/").pop()?.replace("jpeg", "jpg").toUpperCase(),
            size: file.size,
            svg,
          }],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Could not replace asset (${response.status}).`);
      }
      const uploaded = data.assets?.[0];
      await updateAssetDetails(replacingAssetId, {
        name: nextName,
        title: nextTitle,
        url: uploaded?.url || existingAsset.url,
        svg,
        contentType: mime,
        assetType: itemType,
        size: file.size,
        dimensions,
        colorSpace: dimensions ? "sRGB" : undefined,
        format: mime.split("/").pop()?.replace("jpeg", "jpg").toUpperCase(),
        updatedAt: new Date().toISOString(),
      });
      addToast({
        type: "success",
        title: "Asset Replaced",
        message: `Updated asset "${nextName}".`,
      });
    } catch (err) {
      console.warn("Failed replacing asset:", err);
      addToast({
        type: "error",
        title: "Replace Failed",
        message: err instanceof Error ? err.message : "Could not replace asset file.",
      });
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

  /**
   * Safely fetches raw SVG content using same-origin proxy with fallback to direct CDN.
   * Immune to CORS, opaque cache collisions, and browser ad-blockers.
   */
  const fetchSvgContentSafely = async (url: string, inlineSvg?: string): Promise<string> => {
    if (inlineSvg && inlineSvg.trim().startsWith("<svg")) {
      return inlineSvg;
    }
    if (!url) return "";

    // 1. Try same-origin content proxy first (zero CORS issues, consistent)
    try {
      const proxyUrl = `/api/assets/content?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const text = await res.text();
        if (text.includes("<svg")) return text;
      }
    } catch (err) {
      console.warn("[AssetsView] Proxy fetch failed, attempting direct fetch:", err);
    }

    // 2. Fallback to direct fetch with cache buster to avoid poisoned opaque cache
    try {
      const separator = url.includes("?") ? "&" : "?";
      const directUrl = `${url}${separator}_cb=${Date.now()}`;
      const res = await fetch(directUrl);
      if (res.ok) {
        const text = await res.text();
        if (text.includes("<svg")) return text;
      }
    } catch (err) {
      console.error("[AssetsView] Direct fetch failed:", err);
    }

    throw new Error("Could not fetch SVG from CDN or server.");
  };

  /**
   * Safely fetches asset as a Blob using same-origin proxy with fallback to direct CDN.
   */
  const fetchAssetBlobSafely = async (url: string): Promise<Blob> => {
    // 1. Try same-origin content proxy first
    try {
      const proxyUrl = `/api/assets/content?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        return await res.blob();
      }
    } catch (err) {
      console.warn("[AssetsView] Proxy blob fetch failed, attempting direct fetch:", err);
    }

    // 2. Direct fetch fallback
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
  };

  /**
   * Safely fetches asset as ArrayBuffer using same-origin proxy with fallback to direct CDN.
   */
  const fetchAssetArrayBufferSafely = async (url: string): Promise<ArrayBuffer> => {
    // 1. Try same-origin content proxy first
    try {
      const proxyUrl = `/api/assets/content?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        return await res.arrayBuffer();
      }
    } catch (err) {
      console.warn("[AssetsView] Proxy arrayBuffer fetch failed, attempting direct fetch:", err);
    }

    // 2. Direct fetch fallback
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.arrayBuffer();
  };

  // Copy SVG string enriched with icon name for Figma layer naming
  const handleCopySvg = async (svgOrUrl: string | undefined, id: string, name?: string, url?: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const iconName = name || "icon";

      let svgContent = "";
      try {
        svgContent = await fetchSvgContentSafely(url || "", svgOrUrl);
      } catch {
        addToast({ type: "error", title: "Copy Failed", message: "Could not fetch SVG from CDN or server." });
        return;
      }
      if (!svgContent) {
        addToast({ type: "error", title: "Copy Failed", message: "SVG content is empty." });
        return;
      }

      const enriched = enrichSvgWithName(svgContent, iconName);

      try {
        if (navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
          const textBlob = new Blob([enriched], { type: "text/plain" });
          const htmlBlob = new Blob([enriched], { type: "text/html" });
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/plain": textBlob,
              "text/html": htmlBlob,
            }),
          ]);
        } else {
          await navigator.clipboard.writeText(enriched);
        }
      } catch {
        try {
          await navigator.clipboard.writeText(enriched);
        } catch {
          addToast({ type: "error", title: "Copy Failed", message: "Clipboard permission denied." });
          return;
        }
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

  // Download single asset file (SVG, image, video, document)
  const handleDownloadSingleAsset = async (asset: ProjectAsset) => {
    const assetName = asset.name || asset.title || "asset";
    const itemType = getInferredAssetType(asset);
    const isSvg = itemType === "icon" || !!asset.svg || asset.contentType?.includes("svg") || asset.name.toLowerCase().endsWith(".svg") || asset.url?.toLowerCase().includes(".svg");

    if (isSvg) {
      let svgContent = "";
      try {
        svgContent = await fetchSvgContentSafely(asset.url || "", asset.svg);
      } catch {
        addToast({ type: "error", title: "Download Failed", message: "Could not load SVG content." });
        return;
      }
      if (!svgContent) return;

      const enriched = enrichSvgWithName(svgContent, assetName);
      const blob = new Blob([enriched], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = assetName.toLowerCase().endsWith(".svg") ? assetName : `${assetName}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    if (asset.url) {
      try {
        const blob = await fetchAssetBlobSafely(asset.url);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = extensionFromContentType(asset.contentType || "") || asset.url.split(".").pop()?.split("?")[0] || "dat";
        a.download = assetName.includes(".") ? assetName : `${assetName}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        window.open(asset.url, "_blank");
      }
    }
  };

  const handleDownloadSingleSvg = handleDownloadSingleAsset;

  // Export / Download selected assets as a multi-layer hierarchical .ZIP archive
  const handleDownloadSelectedZip = async () => {
    const targetAssets =
      selectedAssetIds.size > 0
        ? filteredAssets.filter((a) => selectedAssetIds.has(a.id))
        : filteredAssets;

    if (targetAssets.length === 0) return;

    try {
      const zip = new JSZip();
      const filePromises = targetAssets.map(async (asset) => {
        const typeFolder = asset.type || "general";
        const catFolder = asset.category || "general";
        const assetName = asset.name || asset.title || "asset";
        const itemType = getInferredAssetType(asset);
        const isSvg = itemType === "icon" || !!asset.svg || asset.contentType?.includes("svg") || asset.name.toLowerCase().endsWith(".svg") || asset.url?.toLowerCase().includes(".svg");

        if (isSvg) {
          try {
            const svgContent = await fetchSvgContentSafely(asset.url || "", asset.svg);
            if (!svgContent) return null;

            const enriched = enrichSvgWithName(svgContent, assetName);
            const fileName = assetName.toLowerCase().endsWith(".svg") ? assetName : `${assetName}.svg`;
            return {
              path: `${typeFolder}/${catFolder}/${fileName}`,
              content: enriched,
            };
          } catch {
            return null;
          }
        } else if (asset.url) {
          try {
            const arrayBuffer = await fetchAssetArrayBufferSafely(asset.url);
            const ext = extensionFromContentType(asset.contentType || "") || asset.url.split(".").pop()?.split("?")[0] || "dat";
            const fileName = assetName.includes(".") ? assetName : `${assetName}.${ext}`;
            return {
              path: `${typeFolder}/${catFolder}/${fileName}`,
              content: arrayBuffer,
            };
          } catch {
            return null;
          }
        }
        return null;
      });

      const files = await Promise.all(filePromises);
      for (const file of files) {
        if (file) {
          zip.file(file.path, file.content);
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentProject?.slug || "design-system"}-assets.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({
        type: "success",
        title: "Assets Exported",
        message: `Downloaded ${targetAssets.length} asset${targetAssets.length === 1 ? "" : "s"} with folder hierarchy.`,
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
    setEditFormCategory(asset.category && asset.category !== "general" ? asset.category : "");
    setEditFormTag(asset.tag || "");
    setEditFormFolderId(asset.folderId);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset || !editFormName.trim()) return;

    await updateAsset(editingAsset.id, {
      name: editFormName.trim(),
      title: editFormTitle.trim() || editFormName.trim(),
      type: editFormType.trim() || undefined,
      category: editFormCategory.trim() ? editFormCategory.trim().toLowerCase() : undefined,
      tag: editFormTag.trim() || undefined,
      folderId: editFormFolderId !== undefined ? (editFormFolderId || undefined) : editingAsset.folderId,
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
    const category = bulkFormCategory.trim() ? bulkFormCategory.trim().toLowerCase() : undefined;
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

  // Helper to render an individual asset card (icon, image, video, document)
  const renderIconCard = (icon: ProjectAsset) => {
    const isCopied = copiedId === icon.id;
    const isSelected = selectedAssetIds.has(icon.id);
    const displayTitle = icon.title || icon.name;
    const folder = (icon.folderId || icon.collectionId)
      ? assetFolders.find((f) => f.id === (icon.folderId || icon.collectionId))
      : null;
    const folderName = folder?.name || currentActiveFolder?.name || "";
    const itemType = getInferredAssetType(icon, folderName);
    const isSvg = itemType === "icon" || isSvgAsset(icon);
    const isColoredSvg = isColorSvgAsset(icon, folderName);
    const handleCardClick = () => {
      setDetailAsset(icon);
    };

    return (
      <div
        key={icon.id}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleCardClick();
          }
        }}
        className={`w-[120px] flex-shrink-0 cursor-pointer group relative ${
          isSelected ? "" : ""
        }`}
        title={icon.tag ? `Tags: ${icon.tag}` : undefined}
      >
        {/* Preview Area */}
        <div
          className={`relative w-full aspect-square rounded-2xl border overflow-hidden flex items-center justify-center transition-all duration-200 ${
            isSelected
              ? "border-primary ring-2 ring-primary/20 bg-muted/30"
              : "border-border/60 bg-muted/20"
          }`}
        >
          {/* Selection Checkbox */}
          <div
            className={`absolute top-1.5 left-1.5 z-10 transition-opacity ${
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            onClick={(e) => toggleAssetSelect(icon.id, e)}
          >
            <div
              className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/80 border border-border text-transparent"
              }`}
            >
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          </div>

          {/* Options Menu */}
          <div
            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-5 h-5 rounded-md bg-background/80 hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
                  <MoreVertical className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                {itemType !== "icon" && (
                  <DropdownMenuItem
                    onClick={() => setPreviewMediaAsset(icon)}
                    className="gap-2 cursor-pointer text-xs font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span>Preview Asset</span>
                  </DropdownMenuItem>
                )}
                {canUserEdit() && (
                  <DropdownMenuItem
                    onClick={() => {
                      setAssetToMoveId(icon.id);
                      setIsMoveAssetsOpen(true);
                    }}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <FolderInput className="w-3.5 h-3.5 text-blue-500" />
                    <span>Move to Collection...</span>
                  </DropdownMenuItem>
                )}
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
                      <span>Replace File</span>
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
                {isSvg && (
                  <DropdownMenuItem
                    onClick={() => handleCopySvg(icon.svg, icon.id, displayTitle, icon.url)}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Copy SVG</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => handleDownloadSingleAsset(icon)}
                  className="gap-2 cursor-pointer text-xs"
                >
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Download File</span>
                </DropdownMenuItem>
                {icon.url && (
                  <DropdownMenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(icon.url || "");
                      addToast({
                        type: "success",
                        title: "URL Copied",
                        message: "Copied direct CDN URL to clipboard.",
                      });
                    }}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Copy CDN URL</span>
                  </DropdownMenuItem>
                )}
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
                      <span>Delete Asset</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Asset Content */}
          {itemType === "video" ? (
            <div className="w-full h-full bg-black/80 flex items-center justify-center">
              <Film className="w-7 h-7 text-sky-400 opacity-80" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                </div>
              </div>
            </div>
          ) : itemType === "document" ? (
            <div className="flex flex-col items-center justify-center text-rose-500">
              <FileText className="w-7 h-7 mb-0.5" />
              <span className="text-[9px] font-mono uppercase font-bold">PDF</span>
            </div>
          ) : itemType === "image" ? (
            <img
              src={icon.url}
              alt={displayTitle}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
            />
          ) : itemType === "illustration" ? (
            <img
              src={icon.url || (icon.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(icon.svg)}` : undefined)}
              alt={displayTitle}
              className="max-h-[85%] max-w-[85%] object-contain"
              loading="lazy"
            />
          ) : (
            <img
              src={icon.url || (icon.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(icon.svg)}` : undefined)}
              alt={displayTitle}
              className={`max-h-[60%] max-w-[60%] object-contain ${!isColoredSvg ? "dark:invert dark:opacity-90" : ""}`}
              loading="lazy"
            />
          )}

          {/* Hover Action Pill - bottom right */}
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isSvg ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCopySvg(icon.svg, icon.id, displayTitle, icon.url);
                }}
                className="rounded-lg border border-border/50 bg-background/90 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm"
              >
                {isCopied ? "Copied!" : "Click to copy"}
              </button>
            ) : (
              <span className="rounded-lg border border-border/50 bg-background/90 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
                {itemType === "video" ? "Open studio" : "Preview"}
              </span>
            )}
          </div>
        </div>

        {/* Asset Title - below the preview area */}
        <p className="text-[11px] text-muted-foreground mt-1.5 truncate w-full" title={displayTitle}>
          {displayTitle}
        </p>
      </div>
    );
  };

  // Skeleton card placeholder for smooth progressive loading
  const renderSkeletonCard = (index: number) => (
    <div
      key={`skeleton-${index}`}
      className="w-[120px] flex-shrink-0 animate-pulse pointer-events-none select-none"
      style={{ animationDelay: `${(index % 8) * 60}ms` }}
    >
      <div className="w-full aspect-square rounded-2xl bg-muted/30 border border-border/40" />
      <div className="w-14 h-2.5 bg-muted/40 rounded-md mt-1.5" />
    </div>
  );

  return (
    <div
      className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden select-none relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Full-surface drag-and-drop visual dropzone indicator */}
      {isDragOver && !isUnfilteredEmptyCollection && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-xs border-2 border-dashed border-primary flex flex-col items-center justify-center pointer-events-none transition-all animate-in fade-in duration-150">
          <div className="bg-card border border-primary/30 shadow-2xl rounded-2xl p-6 flex flex-col items-center gap-3 text-center max-w-sm pointer-events-none">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center animate-bounce">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-foreground">Drop files to upload</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Drop multiple files or folders here to upload {currentActiveFolder ? `into "${currentActiveFolder.name}"` : "into your library"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Single Replace Input */}
      <input
        ref={replaceInputRef}
        type="file"
        accept=".svg,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.pdf"
        onChange={handleReplaceFileSelected}
        className="hidden"
      />

      {/* Top Header */}
      <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-card/60 backdrop-blur-md flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted text-foreground flex items-center justify-center border border-border/70 shadow-2xs">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">Assets</h1>
              <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 border-border/80 text-muted-foreground bg-muted/40">
                {displayAssets.length} {displayAssets.length === 1 ? "asset" : "assets"}
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

          {displayAssets.length > 0 && (
            <>
              <details className="relative">
                <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground hover:bg-muted">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                  {(selectedFormats.size > 0 || selectedTag !== "all") && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </summary>
                <div className="absolute right-0 top-10 z-30 w-64 space-y-3 rounded-lg border border-border bg-card p-3 shadow-xl">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Format</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {["png", "jpg", "svg", "webp", "gif", "pdf"].map((format) => (
                        <label key={format} className="flex items-center gap-2 text-xs uppercase">
                          <input
                            type="checkbox"
                            checked={selectedFormats.has(format)}
                            onChange={() => setSelectedFormats((current) => {
                              const next = new Set(current);
                              if (next.has(format)) next.delete(format);
                              else next.add(format);
                              return next;
                            })}
                          />
                          {format}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="block space-y-1 text-xs">
                    <span className="font-semibold text-muted-foreground">Tag</span>
                    <select value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2">
                      <option value="all">All tags</option>
                      {assetTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-xs">
                      <span className="font-semibold text-muted-foreground">Sort by</span>
                      <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="h-8 w-full rounded-md border border-input bg-background px-2">
                        <option value="date">Date</option>
                        <option value="name">Name</option>
                        <option value="size">Size</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="font-semibold text-muted-foreground">Order</span>
                      <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as typeof sortDirection)} className="h-8 w-full rounded-md border border-input bg-background px-2">
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                    </label>
                  </div>
                </div>
              </details>
              <div className="flex items-center rounded-md border border-border">
                <Button type="button" variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("grid")} aria-label="Grid view" className="h-8 w-8">
                  <Grid className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("list")} aria-label="List view" className="h-8 w-8">
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
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
              <DropdownMenuContent align="end" className="w-64 text-xs">
                <DropdownMenuItem
                  onClick={() => {
                    setUploadTargetFolderId(activeFolderId || null);
                    setIsUploadQueueOpen(true);
                  }}
                  className="gap-2.5 cursor-pointer text-xs py-2"
                >
                  <UploadCloud className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground truncate">
                        {currentActiveFolder ? `Upload to ${currentActiveFolder.name}` : "Upload Multiple Files"}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium shrink-0 ml-1">
                        Multi
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      Multi-select files or .ZIP archive
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setUploadTargetFolderId(activeFolderId || null);
                    setIsUploadQueueOpen(true);
                  }}
                  className="gap-2.5 cursor-pointer text-xs py-2"
                >
                  <FolderUp className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground truncate">Upload Entire Directory</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium shrink-0 ml-1">
                        Folder
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      Preserves nested folder hierarchy
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        {/* Left Sidebar: Folders + Asset Types + Categories */}
        {(displayAssets.length > 0 || assetFolders.length > 0 || canUserEdit()) && (
          <aside className="w-64 border-r border-border bg-card/30 flex flex-col flex-shrink-0 select-none overflow-hidden">
            {/* SECTION 1: COLLECTIONS */}
            <div
              className={`p-3 ${
                categories.length > 0 ? "border-b border-border/40 max-h-[50%]" : "flex-1"
              } flex flex-col overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Collections</span>
                  <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5 ml-0.5">
                    {assetFolders.length}
                  </Badge>
                </div>
                {canUserEdit() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCreateCollectionOpen(true)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    aria-label="Create collection"
                    title="Create collection"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Folder list */}
              <div className="space-y-1 overflow-y-auto flex-1 pr-0.5">
                {/* "All Assets" Item */}
                <button
                  onClick={() => setActiveFolderId(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragTargetFolderId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleProcessIncomingFiles(e.dataTransfer.files, undefined);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer group ${
                    activeFolderId === null
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Grid
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        activeFolderId === null
                          ? "text-sidebar-accent-foreground"
                          : "text-muted-foreground group-hover:text-sidebar-foreground"
                      }`}
                    />
                    <span className="truncate">All Assets</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono ml-2 ${
                      activeFolderId === null
                        ? "text-sidebar-accent-foreground font-semibold"
                        : "text-muted-foreground/80"
                    }`}
                  >
                    {displayAssets.length}
                  </span>
                </button>

                {/* User Folders */}
                {assetFolders.map((folder) => {
                  const count = folderCountMap.get(folder.id) || 0;
                  const isSelected = activeFolderId === folder.id;
                  const FolderIconComp = getFolderIconComponent(folder.icon);
                  const isDropTarget = dragTargetFolderId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragTargetFolderId(folder.id);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setDragTargetFolderId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragTargetFolderId(null);
                        handleProcessIncomingFiles(e.dataTransfer.files, folder.id);
                      }}
                      className={`group/folder relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                          : isDropTarget
                          ? "bg-muted border border-border text-foreground"
                          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
                      }`}
                      onClick={() => setActiveFolderId(folder.id)}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <FolderIconComp
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isSelected
                              ? "text-sidebar-accent-foreground"
                              : "text-muted-foreground group-hover/folder:text-sidebar-foreground"
                          }`}
                        />
                        <span className="truncate" title={folder.description || folder.name}>
                          {folder.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[10px] font-mono ${
                            isSelected
                              ? "text-sidebar-accent-foreground font-semibold"
                              : "text-muted-foreground/80 group-hover/folder:opacity-0"
                          }`}
                        >
                          {count}
                        </span>

                        {canUserEdit() && (
                          <div
                            className="opacity-0 group-hover/folder:opacity-100 transition-opacity absolute right-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer ${
                                    isSelected
                                      ? "text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                  }`}
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 text-xs">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setUploadTargetFolderId(folder.id);
                                    setIsUploadQueueOpen(true);
                                  }}
                                  className="gap-2 cursor-pointer text-xs"
                                >
                                  <UploadCloud className="w-3.5 h-3.5 text-primary" />
                                  <span>Upload Files</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setFolderToEdit(folder);
                                    setFolderFormName(folder.name);
                                    setFolderFormDesc(folder.description || "");
                                    setFolderFormIcon(folder.icon || "Folder");
                                    setFolderFormColor(folder.color || "blue");
                                    setIsEditFolderOpen(true);
                                  }}
                                  className="gap-2 cursor-pointer text-xs"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Edit Collection</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setFolderToDelete(folder);
                                    setIsDeleteFolderOpen(true);
                                  }}
                                  className="gap-2 text-destructive focus:text-destructive cursor-pointer text-xs"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Collection</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: CATEGORIES (Dynamic: only visible if scoped assets have categories) */}
            {categories.length > 0 && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 pb-2 flex items-center justify-between border-b border-border/30">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-bold text-foreground tracking-tight">Categories</h2>
                    <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5">
                      {categories.length}
                    </Badge>
                  </div>
                  {selectedCategory !== "all" && (
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                      title="Clear category filter"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {categories.length > 8 && (
                  <div className="p-2 border-b border-border/30">
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
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {filteredCategoryList.map((cat) => {
                    const count = categoryCountMap.get(cat) || 0;
                    const isSelected = selectedCategory === cat;
                    const IconComponent = getCategoryIcon(cat);
                    const formattedName = formatCategoryName(cat) || cat;

                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(isSelected ? "all" : cat)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer group ${
                          isSelected
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <IconComponent
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              isSelected
                                ? "text-sidebar-accent-foreground"
                                : "text-muted-foreground group-hover:text-sidebar-foreground"
                            }`}
                          />
                          <span className="truncate" title={formattedName}>
                            {formattedName}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono ml-2 ${
                            isSelected ? "text-sidebar-accent-foreground font-semibold" : "text-muted-foreground/80"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Right Content Area: Top Type Filter Bar + Separated Category Sections */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background">

          {/* Top Subheader: Filter Pills */}
          {displayAssets.length > 0 && iconTypes.length > 0 && (
            <div className="px-6 py-2 border-b border-border bg-muted/15 flex items-center justify-between gap-3 text-xs flex-shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1 flex items-center gap-1">
                  <span>Type:</span>
                </span>
                <button
                  onClick={() => setSelectedType("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    selectedType === "all"
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
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
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium"
                      }`}
                    >
                      <span>{formatCategoryName(t) || t}</span>
                      <span className={`text-[10px] ${isSelected ? "text-sidebar-accent-foreground/80 font-semibold" : "text-muted-foreground"}`}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className={`flex-1 min-h-0 ${isUnfilteredEmptyCollection ? "flex items-center justify-center overflow-hidden p-6" : "overflow-y-auto p-6 pb-24 space-y-6"}`}>
            {isLoadingAssets ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/70" />
                    <span className="text-xs font-medium text-muted-foreground">Loading assets...</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  {Array.from({ length: 18 }).map((_, idx) => renderSkeletonCard(idx))}
                </div>
              </div>
            ) : displayAssets.length === 0 && !currentActiveFolder ? (
              /* High-Value Onboarding Setup Guide Empty State */
              <div className="max-w-5xl mx-auto py-8 space-y-8 animate-in fade-in duration-300">
                {r2StorageError && (
                  <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-400 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                    <div className="space-y-1 text-left flex-1">
                      <div className="font-semibold text-sm text-amber-300">
                        Cloudflare R2 Storage Not Configured on this Deployment
                      </div>
                      <p className="text-xs text-amber-200/80 leading-relaxed">
                        {r2StorageError}. To load and synchronize vector assets on Vercel, add your Cloudflare R2 credentials to <strong>Vercel Dashboard &gt; Project Settings &gt; Environment Variables</strong>, then redeploy.
                      </p>
                      <div className="text-[11px] font-mono bg-black/40 p-2.5 rounded-lg border border-amber-500/20 text-amber-300 space-y-0.5 select-all">
                        <div>R2_ACCOUNT_ID</div>
                        <div>R2_ACCESS_KEY_ID</div>
                        <div>R2_SECRET_ACCESS_KEY</div>
                        <div>R2_BUCKET_NAME</div>
                        <div>R2_PUBLIC_URL</div>
                      </div>
                      <div className="pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => refreshAssets()}
                          className="text-xs h-7 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Retry Connection
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

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
                    onClick={() => {
                      setUploadTargetFolderId(activeFolderId || null);
                      setIsUploadQueueOpen(true);
                    }}
                    className={`p-5 rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex flex-col justify-between group text-center space-y-4 ${
                      isDragOver
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border/80 bg-card hover:bg-muted/40 shadow-xs"
                    }`}
                  >
                    <div className="space-y-3 flex flex-col items-center">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
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
                          setUploadTargetFolderId(activeFolderId || null);
                          setIsUploadQueueOpen(true);
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
                    className="p-5 rounded-2xl border border-border bg-card hover:bg-violet-500/5 hover:border-violet-500/30 transition-colors cursor-pointer flex flex-col justify-between group space-y-4 shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
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
                    className="p-5 rounded-2xl border border-border bg-card hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-colors cursor-pointer flex flex-col justify-between group space-y-4 shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
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
              isUnfilteredEmptyCollection ? (
                /* Empty Folder State */
                <div
                  className={`mx-auto flex h-[35vh] min-h-[220px] max-h-[420px] w-full max-w-3xl flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                    isDragOver ? "border-primary bg-primary/10" : "border-muted-foreground/35 bg-muted/20 hover:border-primary/50"
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setIsDragOver(false);
                    }
                  }}
                  onDrop={(event) => {
                    event.stopPropagation();
                    void handleDrop(event, true);
                  }}
                >
                  <input
                    ref={emptyCollectionInputRef}
                    type="file"
                    multiple
                    accept=".svg,.png,.jpg,.jpeg,.webp,.gif,.ico,.avif,.mp4,.webm,.mov,.pdf,.json,.zip"
                    className="hidden"
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      event.currentTarget.value = "";
                      if (currentActiveFolder && files.length > 0) {
                        void uploadEmptyCollectionFiles(files, currentActiveFolder.id);
                      }
                    }}
                  />
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FolderPlus className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {isDragOver ? "Release to add files" : "Collection is empty"}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    {isDragOver
                      ? `Files will be added to ${currentActiveFolder?.name}.`
                      : `Drop files or folders here to add them to ${currentActiveFolder?.name}.`}
                  </p>
                  {currentActiveFolder?.description && !isDragOver && (
                    <p className="mt-2 max-w-sm text-xs text-muted-foreground/80">
                      {currentActiveFolder.description}
                    </p>
                  )}
                  {canUserEdit() && (
                    <Button
                      size="sm"
                      onClick={() => emptyCollectionInputRef.current?.click()}
                      className="mt-5 gap-1.5 text-sm font-semibold cursor-pointer"
                    >
                      <UploadCloud className="h-4 w-4" />
                      <span>Browse files</span>
                    </Button>
                  )}
                </div>
              ) : (
                /* Search / Filter Empty State */
                <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-muted-foreground">
                  <Search className="w-8 h-8 mb-2 text-muted-foreground/40" />
                  <p className="text-sm font-semibold text-foreground">No assets match your filters</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try clearing your search keyword, category, folder, or media type selection.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedType("all");
                      setSelectedCategory("all");
                      setSelectedAssetType("all");
                      setSelectedFormats(new Set());
                      setSelectedTag("all");
                    }}
                    className="mt-3 text-xs h-8 cursor-pointer"
                  >
                    Clear Filters
                  </Button>
                </div>
              )
            ) : viewMode === "list" ? (
              <div className="space-y-4">
                <AssetListView
                  assets={filteredAssets.slice(0, visibleCount)}
                  collections={assetFolders}
                  selectedIds={selectedAssetIds}
                  canEdit={canUserEdit()}
                  onOpen={setDetailAsset}
                  onToggleSelected={(id, event) => toggleAssetSelect(id, event)}
                  onDownload={handleDownloadSingleAsset}
                  onEdit={handleOpenEdit}
                  onMove={(asset) => {
                    setAssetToMoveId(asset.id);
                    setIsMoveAssetsOpen(true);
                  }}
                  onDelete={setSingleDeleteAsset}
                />
                {filteredAssets.length > visibleCount && (
                  <div ref={sentinelRef} className="py-6 text-center text-xs text-muted-foreground">
                    Loading more assets...
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-200">
                {groupedAssetsByType.map(({ typeName, icons }) => (
                  <div key={typeName} className="flex flex-wrap gap-4">
                    {icons.map((icon) => renderIconCard(icon))}
                  </div>
                ))}

                {/* Progressive Loading Skeleton Grid with Sentinel */}
                {filteredAssets.length > visibleCount && (
                  <div ref={sentinelRef} className="pt-2 pb-8 space-y-3">
                    <div className="flex flex-wrap gap-4">
                      {Array.from({ length: Math.min(12, filteredAssets.length - visibleCount) }).map((_, idx) =>
                        renderSkeletonCard(idx)
                      )}
                    </div>
                  </div>
                )}
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
              variant="outline"
              onClick={() => {
                setAssetToMoveId(null);
                setIsMoveAssetsOpen(true);
              }}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              <FolderInput className="w-3.5 h-3.5 text-blue-500" />
              <span>Move to Collection</span>
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
                                : "border-border bg-card shadow-2xs"
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
                                onClick={() => setSourceToRemove(src)}
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

      {/* Remove Figma Source Confirmation Modal */}
      <Dialog
        open={Boolean(sourceToRemove)}
        onOpenChange={(open) => {
          if (!open) setSourceToRemove(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4 text-destructive" />
              <span>Remove Figma Source Link</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose what happens to icons synced from <strong>"{sourceToRemove?.name}"</strong>.
            </DialogDescription>
          </DialogHeader>

          {sourceToRemove && (() => {
            const iconCount = displayAssets.filter((a) => a.figmaSourceId === sourceToRemove.id).length;
            return (
              <div className="space-y-3 py-2">
                <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
                  <div className="font-semibold text-foreground">{sourceToRemove.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {iconCount} {iconCount === 1 ? "icon" : "icons"} currently linked to this Figma source.
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const id = sourceToRemove.id;
                      setSourceToRemove(null);
                      await removeFigmaSource(id, false);
                    }}
                    className="w-full text-xs justify-start h-auto py-2.5 px-3 border-border hover:bg-muted text-foreground cursor-pointer rounded-xl"
                  >
                    <div className="text-left">
                      <div className="font-semibold">Keep icons in library</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        Removes the Figma link connection, but retains existing icons as static assets.
                      </div>
                    </div>
                  </Button>

                  {iconCount > 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={async () => {
                        const id = sourceToRemove.id;
                        setSourceToRemove(null);
                        await removeFigmaSource(id, true);
                      }}
                      className="w-full text-xs justify-start h-auto py-2.5 px-3 cursor-pointer rounded-xl"
                    >
                      <div className="text-left">
                        <div className="font-semibold">Delete link AND all {iconCount} synced icons</div>
                        <div className="text-[10px] opacity-90 font-normal">
                          Removes the link and permanently deletes all {iconCount} icons imported from it.
                        </div>
                      </div>
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setSourceToRemove(null)} className="text-xs cursor-pointer">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Name / Title / Type / Category / Tag / Folder Modal */}
      {editingAsset && (
        <Dialog open={Boolean(editingAsset)} onOpenChange={() => setEditingAsset(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">Edit Asset Metadata</DialogTitle>
              <DialogDescription className="text-xs">
                Update the display title, icon type, category, folder, code identifier, and search tags.
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
                    Type / Variant
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

              {/* Folder Assignment */}
              <div className="space-y-1">
                <Label htmlFor="editFolder" className="text-xs font-semibold">
                  Folder
                </Label>
                <Select
                  value={editFormFolderId || "none"}
                  onValueChange={(val) => setEditFormFolderId(val === "none" ? undefined : val)}
                >
                  <SelectTrigger id="editFolder" className="h-8 text-xs">
                    <SelectValue placeholder="Select folder (or none)" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="none">None (All Assets)</SelectItem>
                    {assetFolders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  className="text-xs h-8 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs h-8 font-semibold cursor-pointer">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Collection Modal */}
      <Dialog open={isEditFolderOpen} onOpenChange={setIsEditFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-primary" />
              <span>Edit Collection</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update collection name, description, and icon.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditFolderSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="editFolderName" className="text-xs font-semibold">
                Collection Name
              </Label>
              <Input
                id="editFolderName"
                value={folderFormName}
                onChange={(e) => setFolderFormName(e.target.value)}
                required
                className="h-8 text-xs"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editFolderDesc" className="text-xs font-semibold">
                Description (Optional)
              </Label>
              <Input
                id="editFolderDesc"
                value={folderFormDesc}
                onChange={(e) => setFolderFormDesc(e.target.value)}
                placeholder="Folder description"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Icon</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {["Folder", "Image", "Video", "FileText", "Sparkles", "Briefcase", "Shield", "Heart", "Globe"].map(
                  (iconKey) => {
                    const IconComp = getFolderIconComponent(iconKey);
                    const isSelected = folderFormIcon.toLowerCase() === iconKey.toLowerCase();
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setFolderFormIcon(iconKey)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                            : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                        title={iconKey}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditFolderOpen(false)}
                className="text-xs h-8 cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs h-8 font-semibold cursor-pointer">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Collection Modal */}
      <Dialog open={isDeleteFolderOpen} onOpenChange={setIsDeleteFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <DialogTitle className="text-sm font-bold">Delete Collection?</DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to delete the collection{" "}
              <strong className="text-foreground">{folderToDelete?.name}</strong>? Contained assets will be moved to{" "}
              <strong>All Assets</strong> and will not be deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteFolderOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteFolder}
              className="text-xs font-semibold cursor-pointer"
            >
              Delete Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Assets to Folder Modal */}
      <Dialog open={isMoveAssetsOpen} onOpenChange={setIsMoveAssetsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <FolderInput className="w-4 h-4 text-primary" />
              <span>Move to Collection</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select destination collection for{" "}
              {assetToMoveId ? "this asset" : `${selectedAssetIds.size} selected assets`}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3 max-h-72 overflow-y-auto">
            {/* All Assets (Root) option */}
            <button
              onClick={() => handleConfirmMoveAssets(null)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors text-left text-xs cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Grid className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                <div>
                  <div className="font-semibold text-foreground">All Assets (Root)</div>
                  <div className="text-[10px] text-muted-foreground">Remove from assigned collection</div>
                </div>
              </div>
            </button>

            {assetFolders.map((f) => {
              const IconComp = getFolderIconComponent(f.icon);
              const count = folderCountMap.get(f.id) || 0;
              return (
                <button
                  key={f.id}
                  onClick={() => handleConfirmMoveAssets(f.id)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors text-left text-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className="w-4 h-4 text-primary" />
                    <div>
                      <div className="font-semibold text-foreground">{f.name}</div>
                      {f.description && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                          {f.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {count} items
                  </Badge>
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMoveAssetsOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Preview Modal (Images, Videos, Documents) */}
      {previewMediaAsset && (
        <Dialog open={Boolean(previewMediaAsset)} onOpenChange={() => setPreviewMediaAsset(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card border-border">
            <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
              <div className="space-y-0.5">
                <DialogTitle className="text-sm font-bold flex items-center gap-2">
                  <span>{previewMediaAsset.title || previewMediaAsset.name}</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono py-0 px-1.5">
                    {getInferredAssetType(previewMediaAsset)}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[11px]">
                  {previewMediaAsset.contentType} • {formatBytes(previewMediaAsset.size)}
                </DialogDescription>
              </div>

            </DialogHeader>

            <div
              className="flex-1 min-h-[360px] max-h-[60vh] flex items-center justify-center p-6 overflow-auto border-b border-border/40 transition-colors"
              style={getCanvasPreviewStyle("subtle")}
            >
              {getInferredAssetType(previewMediaAsset) === "video" ? (
                <video
                  src={previewMediaAsset.url}
                  controls
                  autoPlay
                  className="max-h-[55vh] max-w-full rounded-lg shadow-md bg-black"
                />
              ) : getInferredAssetType(previewMediaAsset) === "document" ? (
                <div className="flex flex-col items-center justify-center space-y-3 py-12">
                  <FileText className="w-16 h-16 text-rose-500" />
                  <div className="text-sm font-semibold text-foreground">{previewMediaAsset.name}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => previewMediaAsset.url && window.open(previewMediaAsset.url, "_blank")}
                    className="text-xs gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Document in New Tab</span>
                  </Button>
                </div>
              ) : (
                <img
                  src={previewMediaAsset.url}
                  alt={previewMediaAsset.title || previewMediaAsset.name}

                  className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              )}
            </div>

            <DialogFooter className="p-3 border-t border-border flex items-center justify-between sm:justify-between bg-card">
              <div className="text-xs text-muted-foreground font-mono truncate max-w-[280px]">
                {previewMediaAsset.path || previewMediaAsset.name}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => previewMediaAsset && handleDownloadSingleAsset(previewMediaAsset)}
                  className="text-xs gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setPreviewMediaAsset(null)}
                  className="text-xs cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <CreateCollectionModal
        open={isCreateCollectionOpen}
        onOpenChange={setIsCreateCollectionOpen}
        onCreate={handleCreateCollection}
      />
      <UploadAssetsModal
        open={isUploadQueueOpen}
        onOpenChange={(open) => {
          setIsUploadQueueOpen(open);
          if (!open) setPendingUploadFiles([]);
        }}
        collections={assetFolders}
        initialCollectionId={uploadTargetFolderId}
        initialFiles={pendingUploadFiles}
        onUpload={handleQueueUpload}
      />
      <AssetDetailStudio
        asset={detailAsset}
        collections={assetFolders}
        assets={displayAssets}
        canEdit={canUserEdit()}
        onClose={() => setDetailAsset(null)}
        onSelectAsset={setDetailAsset}
        onUpdate={updateAssetDetails}
        onDownload={handleDownloadSingleAsset}
        onDelete={(asset) => {
          setDetailAsset(null);
          setSingleDeleteAsset(asset);
        }}
      />
    </div>
  );
};
