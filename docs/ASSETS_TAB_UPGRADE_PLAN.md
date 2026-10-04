# Unified Assets Tab Architecture & Upgrade Plan

> **Status:** Awaiting User Approval  
> **Source Video:** `video/Assets - 2026-09-19 215632.mp4`  
> **Target:** Complete unification of existing features (Cloudflare R2, Figma Multi-Source Sync, Git Sync, SVG Engine, Bulk Actions, ZIP Export) with the video's modern DAM (Asset Collections, Custom Metadata Schemas, Upload Modal with Queue, Dual Grid/List View, Asset Detail Studio with Pan/Zoom & AI Tools, History & Specs Inspector).

---

## 1. Executive Summary & Unification Strategy

Our existing Assets tab contains powerful infrastructure (Cloudflare R2 cloud storage, multi-source Figma synchronization with PAT token auth, multi-provider Git repository sync, SVGO SVG markup extraction, and ZIP export), but suffers from an icon-centric legacy UI with basic folder management and limited preview capabilities.

The video demonstrates a state-of-the-art **Digital Asset Management (DAM) & Asset Studio**:
- Dynamic **Asset Collections** with customizable schema fields and allowed asset types.
- Multi-file **Upload Modal** with live queue, thumbnails, file size indicators, and progress tracking.
- Seamless **Dual View Modes (Grid & List)** with high-density data tables.
- An **Asset Detail Studio** featuring pan/zoom preview canvas, bottom floating AI/transformation actions, and a two-tab inspector (**Details** with technical specs & custom metadata, and **History** with version audit logs).
- An **Advanced Filter Popover** for multi-format filtering and sorting.

### The Unified Vision:
We are **not** replacing or removing our existing backend pipelines. We are **unifying** them:
1. **Folders ➔ Collections**: Existing folder IDs seamlessly map to Collections, upgraded with allowed types (`image`, `icon`, `illustration`, `document`, `video`) and custom metadata fields.
2. **Sources & Integrations Preserved**: The **Asset Sources & Settings Drawer** (Figma sync, Git sync, R2 config) remains accessible from the header, allowing assets from Figma and Git to flow directly into Collections.
3. **Universal Asset Studio**: The Studio supports raster media (PNG, JPG, WebP), vector graphics (SVG with live code copy and canvas background toggles), and documents (PDF).
4. **Zero-Regression Enterprise Support**: Full preservation of bulk operations, ZIP export, role-based access control (RBAC), and progressive batch rendering for 10,000+ assets.

---

## 2. Analysis: Current Setup vs. Video Additions

| Capability | Current Existing Setup | Video Specification | Fully Unified Target |
|---|---|---|---|
| **Organization** | Basic `AssetFolder` (id, name, color, icon) | **Asset Collections** (Name, description, allowed asset types, custom metadata schema) | **Unified Collections**: Existing folders upgraded to collections. Schema builder allows custom typed fields (Text, Number, Select, Date, Boolean, Required). Empty state when 0 collections exist. |
| **Asset Types** | Inferred `icon`, `image`, `video`, `document`, `other` (heavily biased to icons) | `Image`, `Icon`, `Illustration`, `Document` | **Full Multi-Type DAM**: First-class support for Images, Vector Icons, Illustrations, Videos, and Documents with type badges and format-specific tools. |
| **Uploading** | Native file input or basic dropzone | **Upload Modal** with collection picker, drag-and-drop zone, file queue with thumbnail previews, sizes, progress, and batch upload button | **Modern Upload Modal**: Drag & drop queue, instant client-side dimension & format extraction, R2 presigned/direct upload, progress bars, and toast notifications. |
| **Browsing** | Grid with fixed aspect ratio, folder chips | **Grid View & List View** with collection pills, count badges, quick actions | **Dual View System**: Toggle between rich aspect-ratio Grid cards and a high-density List View table (Name, Collection, Type, Size, Created Date, Actions). |
| **Filtering & Search** | Simple search input & inline category chips | Advanced **Filter Popover** (Multi-select file types, tags, sorting by date, name, size) | **Unified Filter Popover**: Extension filters (PNG, JPG, SVG, WebP, GIF, PDF), tag filters, source filters (Upload, Git, Figma), and bidirectional sorting. |
| **Asset Detail / Inspection** | Lightweight dialog modal showing preview & metadata editing | **Asset Detail Studio**: Pan/zoom canvas (+, -, 100%, Fit), floating AI tools popover, right inspector with Details (specs, description, custom fields, similar assets) and History | **Universal Asset Studio**: Full-screen/drawer studio. For images: pan/zoom & AI transform menu. For SVGs: pan/zoom, vector specs, and copy SVG/JSX. Right panel: Details tab + History tab. |
| **External Sync** | Figma multi-source sync & Git sync | Not shown in video (focused on direct DAM upload) | **Preserved & Elevated**: Dedicated "Asset Sources & Settings" trigger in header; synced assets display source badges and link back to Figma frames or Git files. |
| **Bulk Actions & Export** | Bulk select, delete, move, edit metadata, export ZIP | Not shown in video | **Seamlessly Preserved**: Bulk selection bar activates when assets are selected, offering ZIP download, bulk move, metadata editing, and batch deletion. |

---

## 3. Data Model & Architecture Design

### 3.1. Unified Types (`types/tenant.ts`)

```typescript
export type AssetType = "image" | "icon" | "illustration" | "document" | "video" | "other";

export interface CustomMetadataField {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "boolean";
  options?: string[]; // for select dropdown
  required?: boolean;
}

export interface AssetCollection {
  id: string;
  name: string;
  description?: string;
  allowedAssetTypes?: AssetType[];
  customFields?: CustomMetadataField[];
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AssetVersionHistory {
  id: string;
  version: number;
  title: string;
  timestamp: string;
  author?: string;
  notes?: string;
  changes?: Record<string, any>;
}

export interface ProjectAsset {
  id: string;
  name: string;
  title?: string;
  description?: string;
  /** Collection identifier (retains folderId as alias for 100% backward compatibility) */
  collectionId?: string;
  folderId?: string;
  assetType?: AssetType;
  url?: string;
  contentType?: string;
  size?: number;
  dimensions?: { width: number; height: number; aspect?: string };
  colorSpace?: string;  // e.g., "sRGB", "Display P3"
  format?: string;      // e.g., "JPEG", "PNG", "SVG", "WEBP", "PDF"
  version?: number;
  customMetadata?: Record<string, any>;
  history?: AssetVersionHistory[];
  
  // Vector & SVG capabilities
  svg?: string;
  path?: string;
  category?: string;
  tag?: string;
  type?: string;

  // Provenance & External Integrations
  source: "upload" | "git" | "figma";
  uploadedBy?: string;
  createdAt?: string;
  updatedAt: string;
  figmaNodeId?: string;
  figmaUrl?: string;
  figmaSourceId?: string;
  figmaSourceName?: string;
}
```

### 3.2. Store Actions & Backward Compatibility (`store/useTokenStore.ts`)
- **Collection State**:
  - `assetCollections`: Unified array. On initialization or project load, map any existing `assetFolders` into `assetCollections` so zero user data is lost.
  - CRUD: `createCollection`, `updateCollection`, `deleteCollection`.
- **API Sync**:
  - `/api/assets/config` already writes both `folders` and `collections` keys to Cloudflare R2 and Supabase.
- **Asset CRUD**:
  - `updateAssetDetails(assetId, updates)`: Updates title, description, custom metadata, and appends a version entry to `history`.
  - Batch upload retains R2 chunking (`BATCH_SIZE = 10`) while updating in-memory state with freshly uploaded assets.

---

## 4. UI Component Hierarchy & Architecture

To avoid a single unmaintainable monolithic file, the Assets workspace will be refactored into modular components under `components/assets/`:

```
components/assets/
├── AssetsWorkspace.tsx             # Main container (header, tabs, search, filters, view modes, bulk bar)
├── AssetCollectionsNav.tsx         # Collection pills ("All Assets", "Marketing", "Icons") + counts + "+ New"
├── AssetEmptyState.tsx             # Empty states: "No collections yet" / "No assets in this collection"
├── CreateCollectionModal.tsx       # "Create Asset Collection" modal with dynamic custom metadata builder
├── UploadAssetsModal.tsx           # Multi-file drag & drop modal with queue, thumbnails, sizes, and R2 upload
├── AssetGridView.tsx               # Responsive aspect-ratio grid with card hover controls & 3-dot menus
├── AssetListView.tsx               # High-density data table (Checkbox, Thumbnail, Name, Collection, Type, Size, Date, Actions)
├── AssetCard.tsx                   # Individual grid card with preview, badges, and context menu
├── AssetFilterPopover.tsx          # Multi-select file type filter, tags, source filter, sorting controls
├── BulkActionsBar.tsx              # Floating bottom bar for bulk move, metadata edit, ZIP export, delete
├── AssetSourcesDrawer.tsx          # Extracted "Asset Sources & Settings" drawer (Figma multi-source & Git sync)
└── studio/
    ├── AssetDetailStudio.tsx       # Full overlay/modal Studio experience
    ├── StudioHeader.tsx            # Back button, breadcrumbs, inline rename, Download, Delete, Close
    ├── StudioCanvas.tsx            # Interactive pan/zoom canvas with bottom zoom controls (+, -, 100%, Fit)
    ├── StudioAiToolbar.tsx         # Bottom floating AI/Transform popover (Layer Extraction, Upscale, etc.)
    ├── StudioInspector.tsx         # Right sidebar housing Details and History tabs
    ├── StudioDetailsTab.tsx        # Description editor, Technical Specs card, Custom Metadata fields, Similar Assets, Provenance
    └── StudioHistoryTab.tsx        # Version history timeline & event audit log
```

`components/AssetsView.tsx` will remain the top-level export, rendering `AssetsWorkspace` to guarantee zero breaking changes across the rest of the application (`app/page.tsx`, etc.).

---

## 5. Detailed Component Specifications

### 5.1. Header & Navigation Bar
- **Breadcrumbs**: Dynamic path (`Assets > All Assets` or `Assets > Marketing`).
- **Collection Tabs / Pills**:
  - `All Assets (totalCount)`
  - Individual collection pills with asset counts (e.g. `Marketing (12)`, `Icons (84)`).
  - Active collection styling with smooth transition.
- **Search Bar**: Instant filter across name, title, tags, description, and custom metadata.
- **Filter Trigger**: Opens `AssetFilterPopover` with active filter count badge.
- **View Mode Switcher**: Icon toggle for **Grid View** (`LayoutGrid`) and **List View** (`List`).
- **Settings Trigger**: Gear icon opening `AssetSourcesDrawer` (Figma & Git sync).
- **Primary Buttons**:
  - `+ Upload Asset` (opens `UploadAssetsModal`).
  - `+ New Collection` (opens `CreateCollectionModal`).

### 5.2. Create Collection Modal (`CreateCollectionModal.tsx`)
- Matching video `00:04 - 00:19`:
  - **Name \***: Input with placeholder *"e.g. Hero Section, Icons, Images"*.
  - **Description**: Textarea for optional collection description.
  - **Allowed Asset Types**: Checkboxes for `Image`, `Icon`, `Illustration`, `Document`.
  - **Custom Metadata Fields**:
    - `+ Add Field` button.
    - Rows containing:
      - Field Label (e.g., *"Campaign Name"* or *"Style"*).
      - Field Type dropdown (`Text`, `Number`, `Select`, `Date`, `Boolean`).
      - If `Select`: comma-separated options input.
      - `Required` checkbox.
      - Trash icon to delete field.
  - **Footer**: `Cancel` and `Create Collection` (purple primary button).
  - Toast confirmation upon creation.

### 5.3. Upload Assets Modal (`UploadAssetsModal.tsx`)
- Matching video `00:20 - 00:34`:
  - **Target Collection Selector**: Dropdown pre-selected to the active collection or letting the user pick.
  - **Drag & Drop Area**:
    - Cloud upload icon.
    - *"Drag files here or click to browse"*.
    - *"Choose Files"* button.
  - **File Queue**:
    - Square thumbnail preview (instant `URL.createObjectURL` client preview).
    - Filename and formatted file size (e.g. `184.4 KB`).
    - Client-side pre-extraction of image dimensions (`HTMLImageElement.naturalWidth/naturalHeight`) and MIME type.
    - Upload progress bar per item.
    - Remove button (`X`) per item.
  - **Footer**:
    - `Cancel` button.
    - `Upload X File(s)` primary button.
  - Direct upload to `/api/assets/upload` (persisting to Cloudflare R2), updating store state and showing success toast.

### 5.4. Dual View Modes
- **Grid View (`AssetGridView.tsx`)**:
  - Responsive auto-fill grid (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`).
  - Preserved aspect ratio card with subtle background.
  - Hover action: 3-dots menu button with **Rename**, **Move to collection**, **Download**, and **Delete**.
  - Sync badge if sourced from Figma or Git.
  - Clicking card opens `AssetDetailStudio`.
- **List View (`AssetListView.tsx`)**:
  - Matching video `02:18 - 02:38`:
  - Table columns:
    1. Checkbox for selection.
    2. Preview thumbnail + Asset Name.
    3. Collection badge.
    4. Asset Type / Format badge (e.g., `JPEG`, `SVG`, `PNG`).
    5. File Size (formatted bytes).
    6. Created / Uploaded Date.
    7. Actions (3-dots dropdown menu).

### 5.5. Advanced Filter Popover (`AssetFilterPopover.tsx`)
- Matching video `02:22 - 02:35`:
  - **File Type**: Multi-select checkboxes (`PNG`, `JPG`, `SVG`, `WebP`, `GIF`, `PDF`, etc.).
  - **Asset Categories / Tags**: Searchable tags filter.
  - **Source**: Filter by Uploaded, Figma synced, Git synced.
  - **Sort By**: Dropdown (`Created Date`, `Name`, `Size`) + Order toggle (`Ascending` / `Descending`).
  - **Actions**: `Reset Filters` and `Apply Filters`.

### 5.6. Asset Detail Studio (`studio/AssetDetailStudio.tsx`)
- Matching video `00:50 - 01:12` and `01:46 - 02:08`:
- **Top Header Bar**:
  - Back button (chevron left) / Breadcrumb (`Assets > [Collection] > [Asset Name]`).
  - Inline title edit.
  - Action buttons: `Download`, `Delete`, and `Close` (X).
- **Main Canvas (Left 70%)**:
  - Interactive preview viewport with zoom and pan.
  - **Bottom Floating Zoom Controls**:
    - `Zoom In` (+)
    - `Zoom Out` (-)
    - `Zoom Level` percentage display (e.g., `100%`, click to reset).
    - `Fit to Screen` icon.
  - **Bottom Floating AI & Transform Popover (Sparkles Menu)**:
    - `Original` (active indicator)
    - `Layer Extraction` ✨
    - `Smart Variations` ✨
    - `Vector Conversion` ✨
    - `Upscale (2x / 4x)` ✨
    - `Regenerate variations` ✨
  - For SVG assets: Toggle background mode (`subtle`, `light`, `dark`) and quick actions (`Copy SVG Markup`, `Copy React Component`).
- **Right Inspector Panel (Right 30%)**:
  - Two top tabs: **Details** and **History**.
  - **Details Tab**:
    1. **Description**: Editable textarea with `Edit`, `Save`, and `Cancel` buttons.
    2. **Technical Specifications**:
       - Version badge (e.g., `Version 1`).
       - Dimensions (`Width: 1080px`, `Height: 1920px`, `Aspect: 9:16`).
       - Color space (`sRGB`).
       - Format (`JPEG`, `PNG`, `SVG`, etc.).
       - File size (`184.4 KB`).
       - If SVG: Path count, viewBox.
    3. **Custom Metadata**:
       - Dynamic fields defined by the parent Collection (e.g. Campaign Name, Category, Style, etc.) with inline editing.
    4. **Similar Assets**:
       - Shows assets sharing identical tags, format, or collection, or clean empty state (*"No similar assets found. Similar assets will appear here once more are uploaded."*).
    5. **File Information**:
       - Upload date (*"Uploaded on Sep 19, 2026"*).
       - Uploaded by (user profile / author).
       - Original filename.
       - Source info (Figma frame link or Git commit link if synced).
  - **History Tab**:
    - Chronological timeline of asset events (*"Asset created - version 1 - Sep 19, 2026"*, description edits, replacements).

### 5.7. Asset Sources & Settings Drawer (`AssetSourcesDrawer.tsx`)
- Preserves the existing `isSettingsDrawerOpen` functionality:
  - **Figma Multi-Source Sync**: Add/edit/delete Figma source links, token configuration, pause/resume sync, and sync individual or all sources.
  - **Git Sync**: Configure Git provider (GitHub, GitLab, Bitbucket, Azure), PAT, repository, branch, and asset folder with instant sync.
  - **Storage Status**: Visual indicator of Cloudflare R2 connection health.

---

## 6. Implementation Phasing & Execution Plan

### Phase 1: Foundation & Types
- Update [`types/tenant.ts`](file:///d:/GitHub/second-screen/types/tenant.ts) with `AssetCollection`, `CustomMetadataField`, `AssetVersionHistory`, and updated `ProjectAsset`.
- Update [`store/useTokenStore.ts`](file:///d:/GitHub/second-screen/store/useTokenStore.ts):
  - Add `assetCollections` store slice with backward-compatible hydration from `assetFolders`.
  - Add collection CRUD actions: `createCollection`, `updateCollection`, `deleteCollection`.
  - Add asset studio actions: `updateAssetDetails`, `addAssetVersion`.

### Phase 2: Modals & Upload Pipeline
- Build `CreateCollectionModal.tsx` matching the video design with dynamic custom field schema builder.
- Build `UploadAssetsModal.tsx` with drag-and-drop dropzone, queue preview cards, live dimension calculation, and R2 upload integration.

### Phase 3: Workspace Navigation, Grid & List Views
- Build `AssetCollectionsNav.tsx` with counts and active collection pills.
- Build `AssetGridView.tsx` and `AssetCard.tsx` with aspect-ratio previews, badges, and 3-dots dropdown.
- Build `AssetListView.tsx` with high-density data table matching the video.
- Build `AssetFilterPopover.tsx` with format multi-select, tags, source, and sorting.
- Build `BulkActionsBar.tsx` preserving ZIP export, bulk move, bulk metadata editing, and bulk deletion.

### Phase 4: Asset Detail Studio & Inspector
- Build `studio/AssetDetailStudio.tsx` and subcomponents:
  - `StudioCanvas.tsx` with pan/zoom engine and bottom zoom controls.
  - `StudioAiToolbar.tsx` with floating AI tool popovers.
  - `StudioInspector.tsx` with `StudioDetailsTab.tsx` (Description, Specs, Custom Metadata, Similar Assets, Provenance) and `StudioHistoryTab.tsx` (Version timeline).

### Phase 5: Verification & Architectural Rules
- Follow `AGENTS.md` strictly:
  - Verify hook execution order (zero early returns before hooks).
  - Ensure standard Tailwind utility classes without exclamation prefixes in `cn()`.
  - Zero external schema links.
  - Validate high-scale performance for thousands of assets.
- Run `npx tsc --noEmit` and confirm exit code 0.
- Run `npm run build` and ensure complete compilation without errors.

---

## 7. Approval & Next Steps

This plan merges 100% of the video's functionality with 100% of our existing capabilities into a unified, modular, enterprise-ready digital asset management experience.

Please let me know if you approve this unified plan so we can proceed with execution!
