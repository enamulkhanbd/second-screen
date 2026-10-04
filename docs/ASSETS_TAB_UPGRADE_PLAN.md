# Assets Tab Upgrade Plan

Based on the design and workflow demonstration in `video/Assets - 2026-09-19 215632.mp4`, this plan details the modernization of the Second Screen **Assets** workspace from a legacy icon-centric view to a full **Digital Asset Management (DAM) & Asset Studio**.

---

## 1. Executive Summary & Vision

The video demonstrates a complete, professional digital asset management workflow:
1. **Collections System**: Replace basic folders with rich **Asset Collections** supporting allowed asset types (Image, Icon, Illustration, Document) and custom dynamic metadata schemas.
2. **Streamlined Uploading**: Dedicated multi-file drag-and-drop modal with target collection selection, live thumbnails, file size indicator, upload progress, and toast feedback.
3. **Dual View Modes (Grid & List)**:
   - **Grid View**: Clean aspect-ratio cards with crisp rendering, asset names, metadata, and quick action 3-dot menus.
   - **List View**: Data table with thumbnail previews, collection badges, file types, file sizes, creation timestamps, and actions.
4. **Interactive Asset Detail Studio**:
   - Canvas with zoom controls (Zoom In, Zoom Out, Zoom to Fit, Percentage).
   - Bottom floating AI & transformation menu (Original, Layer Extraction, Smart Variations, Vector Conversion, Upscaling, Regenerate).
   - Inspector sidebar with two tabs:
     - **Details**: Editable description, technical specs (dimensions, aspect ratio, color space, format, file size, custom metadata), similar assets drawer, and file provenance (upload date, author, original filename).
     - **History**: Chronological version history and revision tracking.
5. **Advanced Filtering & Sorting Popover**: Filter by file extensions (PNG, JPG, SVG, WebP, GIF, PDF), tags, date ranges, and sorting by date, name, or size (ASC/DESC).
6. **Backward Compatibility**: Fully preserve existing Cloudflare R2 storage, Git sync, and Figma sync integrations.

---

## 2. Video Analysis & Feature Mapping

| Timestamp | Video Feature / Workflow | Target Implementation |
|---|---|---|
| **00:00 - 00:03** | Empty state with "No collections yet", "Organize your collections for convenient access", and "+ New Collection" action. | Brand-aligned empty state with icon, subtitle, and primary call-to-action button opening the collection creation modal. |
| **00:04 - 00:19** | **Create Asset Collection Modal**: Name, Description, Allowed Asset Types (Image, Icon, Illustration, Document), and dynamic Custom Metadata Fields (+ Add Field with Label, Type, Required checkbox, Delete). | New `CreateCollectionDialog` component with validation, custom field builder, and toast notification (`Collection "[Name]" created`). |
| **00:20 - 00:34** | **Upload Assets Modal**: Target collection selector, drag-and-drop zone with cloud icon, file queue preview with thumbnail, filename, size, progress, and upload button. | Modern `UploadAssetsModal` supporting single and multi-file drag-and-drop, direct R2 upload via `/api/assets/upload`, and progress indicators. |
| **00:35 - 00:49** | **Collection Navigation & Grid Cards**: Breadcrumb navigation (`Assets > Marketing`), search, filter button, view mode switch, asset card with 3-dot menu (Rename, Move, Download, Delete). | Collection tab bar / breadcrumb switcher, asset card with hover states, 3-dot dropdown menu, and click handler opening the Asset Studio. |
| **00:50 - 01:12** | **Asset Detail View (Studio)**: Full preview canvas with bottom zoom controls, bottom AI floating menu (Original, Layer Extraction, Smart Variations, Vector Conversion, Upscaling), right inspector with Description editing, technical specs (1080x1920, 9:16, sRGB, JPEG, 184.4 KB), similar assets, and file provenance. | New `AssetDetailStudio` overlay/view with canvas pan/zoom, floating tool menu, inline description editor, technical specs extractor, and similar assets section. |
| **01:00** | **History Tab**: Version history timeline showing "Asset created - version 1 - [date]". | History tab inside the inspector panel rendering a timeline of asset events and versions. |
| **01:13 - 02:08** | **Second Collection ("Icons")**: Create icon collection with custom category field, upload icon, and inspect vector technical specs. | Support for different asset types (SVG vector properties, dimensions, code preview/copy). |
| **02:09 - 02:38** | **List View & Filter Popover**: Switching to table list view and opening filter popover (File type checkboxes, Tags, Sort by Date/Name/Size). | Table list view component with sort headers and multi-criteria filter popover with quick clear and apply actions. |

---

## 3. Data Model & Architecture Updates

### 3.1. Collection & Custom Metadata Schema (`types/tenant.ts`)
```typescript
export type AssetType = "icon" | "image" | "illustration" | "document" | "video" | "other";

export interface CustomMetadataField {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "boolean";
  options?: string[]; // for select type
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
```

### 3.2. Extended Asset Model (`types/tenant.ts`)
```typescript
export interface AssetVersionHistory {
  id: string;
  version: number;
  title: string;
  timestamp: string;
  author?: string;
  notes?: string;
}

export interface ProjectAsset {
  id: string;
  name: string;
  title?: string;
  description?: string;
  collectionId?: string; // Maps to or aliases folderId for backward compatibility
  folderId?: string;     // Retained for seamless backward compatibility
  assetType?: AssetType;
  url?: string;
  contentType?: string;
  size?: number;
  dimensions?: { width: number; height: number; aspect?: string };
  colorSpace?: string;  // e.g. "sRGB", "Display P3"
  format?: string;      // e.g. "JPEG", "PNG", "SVG", "WEBP"
  version?: number;
  customMetadata?: Record<string, any>;
  history?: AssetVersionHistory[];
  svg?: string;
  path?: string;
  createdAt?: string;
  updatedAt: string;
  source: "upload" | "git" | "figma";
  uploadedBy?: string;
  figmaNodeId?: string;
  figmaUrl?: string;
  figmaSourceId?: string;
  figmaSourceName?: string;
}
```

### 3.3. Store Actions (`store/useTokenStore.ts`)
- `assetCollections`: State array (aliased or synchronized with `assetFolders`).
- `createCollection(data: Partial<AssetCollection>)`: Validates name, assigns ID, timestamps, saves to project config.
- `updateCollection(id: string, data: Partial<AssetCollection>)`: Updates collection name, description, allowed types, or custom metadata fields.
- `deleteCollection(id: string)`: Safely removes collection and reassigns or unassigns assets.
- `updateAssetDetails(id: string, updates: Partial<ProjectAsset>)`: Updates description, custom metadata, or triggers version increment.

---

## 4. UI Component Architecture

To maintain high maintainability and prevent monolithic bloat in `AssetsView.tsx`, the upgraded Assets tab will be modularized:

```
components/assets/
├── AssetsWorkspace.tsx          # Main orchestrator (header, collection tabs, search/filters, view toggle)
├── AssetCollectionsNav.tsx      # Top collection pill tabs + "All Assets" + count badges
├── AssetEmptyState.tsx          # "No collections yet" / "No assets in this collection"
├── CreateCollectionModal.tsx    # "Create Asset Collection" modal with custom field builder
├── UploadAssetsModal.tsx        # Drag & drop upload modal with target collection picker
├── AssetGridView.tsx            # Responsive card grid with hover cards & 3-dot dropdowns
├── AssetListView.tsx            # Data table with thumbnail, collection, type, size, date, actions
├── AssetCard.tsx                # Individual asset card with clean preview & context menu
├── AssetFilterPopover.tsx       # Filter by file type, tags, and multi-field sorting
└── studio/
    ├── AssetDetailStudio.tsx    # Full-screen/modal studio view
    ├── StudioCanvas.tsx         # Pan/zoom canvas with bottom zoom controls
    ├── StudioAiToolbar.tsx      # Bottom floating AI actions (Layer Extraction, Upscale, etc.)
    ├── StudioInspector.tsx      # Right panel containing Details & History tabs
    ├── StudioDetailsTab.tsx     # Editable description, specs, custom metadata, similar assets
    └── StudioHistoryTab.tsx     # Version history timeline & event audit
```

---

## 5. Step-by-Step Implementation Phases

### Phase 1: Data Types & Store Foundation
- Extend `types/tenant.ts` with `AssetCollection`, `CustomMetadataField`, `AssetVersionHistory`, and updated `ProjectAsset`.
- Update `store/useTokenStore.ts` with collection CRUD operations, backwards-compatible mapping between `folders` and `collections`, and asset metadata update actions.

### Phase 2: Create Collection & Upload Assets Modals
- Implement `CreateCollectionModal.tsx` matching 00:04 - 00:19 in the video:
  - Collection Name & optional description.
  - Allowed Asset Types checklist (Image, Icon, Illustration, Document).
  - Dynamic Custom Metadata field builder (Label, Type, Required checkbox, Delete action).
- Implement `UploadAssetsModal.tsx` matching 00:20 - 00:34 in the video:
  - Target collection dropdown.
  - Drag-and-drop dropzone with file picker.
  - Upload file queue with thumbnail preview, file size, progress bar, and removal button.
  - Automatic extraction of image dimensions (width, height, aspect ratio) and format.
  - Direct integration with `/api/assets/upload` (Cloudflare R2).

### Phase 3: Grid View, List View & Navigation
- Build `AssetCollectionsNav.tsx` with collection counts and active indicators.
- Build `AssetGridView.tsx` with clean aspect ratio cards, filename, specs badge, and 3-dots menu (Rename, Move, Download, Delete).
- Build `AssetListView.tsx` matching 02:18 - 02:38 with table columns: Checkbox, Name + Preview, Collection, Type, Size, Created Date, Actions.
- Implement `AssetFilterPopover.tsx` with multi-select file extensions (PNG, JPG, SVG, WebP, GIF, PDF), tag filtering, and sorting (Created Date, Name, Size).

### Phase 4: Asset Detail Studio & Inspector
- Implement `AssetDetailStudio.tsx` matching 00:50 - 01:12:
  - Top bar with back button, breadcrumb navigation (`Assets > [Collection] > [Asset]`), inline asset rename, Download, Delete, and Close.
  - Canvas with pan and zoom controls (Zoom in, Zoom out, 100%, Zoom to fit).
  - Floating AI / Asset Actions popover button:
    - Original
    - Layer Extraction (Sparkles)
    - Smart Variations (Sparkles)
    - Vector Conversion (Sparkles)
    - Upscale (2x / 4x) (Sparkles)
    - Regenerate variations (Sparkles)
  - Right Inspector Panel:
    - **Details Tab**:
      - Editable Description with Save/Cancel.
      - Technical Specifications card: Version badge ("Version 1"), Width, Height, Aspect ratio, Color space (sRGB), Format, File size.
      - Custom Metadata fields based on the parent collection schema.
      - Similar Assets list / empty state.
      - File Provenance card: Upload date, uploaded by, original filename.
    - **History Tab**:
      - Version timeline logging creation and updates.

### Phase 5: Verification & Testing
- Strict adherence to `AGENTS.md`:
  - Hook order verification (no early returns before hooks).
  - Standard styling classes without exclamation-prefixed overrides.
  - Progressive rendering and memoization for large asset sets.
- Execute `npx tsc --noEmit` to confirm zero TypeScript compilation errors.
- Execute `npm run build` to ensure all pages build without errors.

---

## 6. Review & Approval

Please review this plan. Upon your approval, we will proceed to execute the implementation phase-by-phase according to these specifications.
