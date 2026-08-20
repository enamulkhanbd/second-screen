# 🌟 Second Screen — Design Token Management Platform
## Complete Features Specification & System Architecture Blueprint

This document outlines the end-to-end feature specification, architecture, roadmap, and planned capabilities for **Second Screen** — a modern, web-first design token platform and companion private Figma plugin.

---

## 📑 Table of Contents
1. [Core Platform Vision](#1-core-platform-vision)
2. [Onboarding & Workspace Setup](#2-onboarding--workspace-setup)
3. [Tokens Workspace (Web Studio)](#3-tokens-workspace-web-studio)
4. [Theme Matrix & Multi-Dimensional Themes](#4-theme-matrix--multi-dimensional-themes)
5. [Token Flow Graph (Interactive Dependency Visualizer)](#5-token-flow-graph)
6. [Live Analytics & Token Health Linter](#6-live-analytics--token-health-linter)
7. [Releases & Automated Build Distribution](#7-releases--automated-build-distribution)
8. [Second Screen Cloud & API Engine](#8-second-screen-cloud--api-engine)
9. [Companion Private Figma Plugin](#9-companion-private-figma-plugin)
10. [CI/CD, Webhooks & Developer Integrations](#10-cicd-webhooks--developer-integrations)
11. [Implementation Roadmap](#11-implementation-roadmap)

---

## 1. Core Platform Vision

**Second Screen** is an enterprise-grade, web-native design token management ecosystem that serves as a high-performance alternative to Tokens Studio. It empowers designers and developers to create, resolve, lint, document, and distribute design tokens seamlessly across Figma, Web, iOS, and Android.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SECOND SCREEN PLATFORM (WEB)                          │
├──────────────────────────┬──────────────────────────┬───────────────────────┤
│    ONBOARDING WIZARD     │    WEB TOKEN STUDIO      │  CLOUD SYNC & API     │
│  • New Project Template  │  • Set & Folder Manager  │  • API Keys / PATs    │
│  • Connect Git (Azure/GH)│  • Visual Theme Builder  │  • Bi-directional REST│
│  • Import JSON / DTCG    │  • Live Linter & Audit   │  • Git Bridge Engine  │
└────────────┬─────────────┴────────────┬─────────────┴───────────┬───────────┘
             │                          │                         │
             ▼                          ▼                         ▼
   ┌──────────────────┐       ┌──────────────────┐      ┌──────────────────┐
   │ GIT REPOSITORIES │       │ RELEASES ENGINE  │      │ PRIVATE FIGMA    │
   │ • Azure DevOps   │       │ • CSS Variables  │      │ PLUGIN           │
   │ • GitHub / GitLab│       │ • Style Dict ZIP │      │ • Cloud PAT Sync │
   │ • $themes.json   │       │ • iOS / Android  │      │ • Variables Sync │
   └──────────────────┘       └──────────────────┘      └──────────────────┘
```

---

## 2. Onboarding & Workspace Setup

When a user lands on Second Screen for the first time or creates a new project:

### 2.1 Onboarding Paths
- **Path A: Start from Template (Zero Configuration)**
  - Pre-packaged design system starters:
    - *SaaS Modern*: Full color palette, modular typography, spacing scale, light/dark themes.
    - *E-Commerce*: Rich merchandising colors, accessible surface tokens, dense layout sizing.
    - *Mobile-First*: iOS & Android native dimension tokens, touch target sizing.
    - *Accessible High-Contrast*: Strict WCAG AAA compliant color pairs and contrast ratios.
  - Automatically initializes standard structure: `global.json`, `$themes.json`, and `$metadata.json`.
- **Path B: Connect Existing Git Provider**
  - Interactive connector for **Azure DevOps**, **GitHub**, **GitLab**, and **Bitbucket**.
  - Direct repository and branch selector with secure in-memory or persisted PAT storage.
- **Path C: Import Existing Tokens**
  - Drag-and-drop support for `tokens.json` single-file export or a `.zip` archive of multi-file sets.
  - Automatic migration from legacy Tokens Studio / Figma Tokens structures.

### 2.2 Workspace Shell & Web App Versioning
- **Web App Version Indicator**:
  - Persistent version badge (`v0.1.0-beta`) in the primary navigation sidebar footer with release update checks.
- **Environment & Git Status**:
  - Displays connected branch, sync health, and active theme group.

---

## 3. Tokens Workspace (Web Studio)

A dual-mode workspace combining visual token management with raw JSON code editing.

### 3.1 Dual View Modes
- **Preview Mode (Table & Card View)**:
  - Search filter and category chips (*All, Color, Typography, Spacing, Sizing, Radius, Shadow, Opacity*).
  - Clean, flexible table layout with responsive column widths.
  - 3-dots (`•••`) context action menu per row with quick actions.
- **JSON Code Mode**:
  - High-performance Monaco/Textarea code editor with real-time JSON validation.
  - Line numbers, syntax error banner, formatting (<kbd>Ctrl+S</kbd>), and discard/save actions.

### 3.2 Rich Visual Previews & Token Types
- **Composite Typography**:
  - Raw value formatted as clean, structured object text without bulky chips.
  - Visual preview displays clean metadata: `Font Family - Font Weight - Font Size - Line Height` (e.g. `Inter, Arial - Regular - 16 - 24`).
  - Automatic resolution of `roundTo(val, step)` expressions and percentage line-heights.
- **Colors**:
  - Interactive swatch preview with 1-click clipboard copy.
  - Live WCAG contrast ratio badge against light and dark surfaces.
- **Border Radius**:
  - Visual preview rendering dynamic corner curvature.
- **Spacing / Sizing**:
  - Proportional spatial dimension bars showing scale relative to base grid.
- **Box Shadows**:
  - Live elevated card surface displaying blur, spread, and color shadows.

### 3.3 Slide-Over Edit Drawer
- Clicking **Edit** from the row menu slides open a dedicated right drawer.
- Specialized form controls tailored to the token category (Family, Weight, Size, Line Height, Hex Picker).
- Real-time live specimen card updating as you type before committing changes.

---

## 4. Theme Matrix & Multi-Dimensional Themes

Full multi-dimensional theming compliant with Tokens Studio `$themes.json` schema.

### 4.1 Group & Option Management
- **Theme Groups**: Group by *Color Mode* (Light / Dark), *Brand* (Brand A / Brand B), *Platform* (Web / iOS / Android), or *Density* (Compact / Comfortable).
- **Theme Options**: Create, edit, duplicate, and delete options with custom hex color badges.
- **3-State Token Set Controls**:
  - `Source`: Set is available for alias reference resolution, but not exported as active styles.
  - `Enabled`: Set is active and overrides earlier matching tokens.
  - `Disabled`: Set is completely ignored in this theme option.

---

## 5. Token Flow Graph

Interactive 60/120 FPS node graph visualizing token dependency hierarchies.

### 5.1 Architecture & Performance
- **3-Tier Categorization**: Visual separation of *Foundation*, *Semantic Alias*, and *Component* tiers.
- **Dependency Highlighting**:
  - Clicking any token highlights its upstream ancestors (where it gets values from) and downstream consumers (what components rely on it).
  - Glowing animated bezier curve wires connecting token nodes.
- **GPU Acceleration & Damped Navigation**:
  - Synchronized via `requestAnimationFrame` and `translate3d` hardware acceleration.
  - Initial load defaults to **100% Zoom** (`1.0`) for maximum legibility.
  - Exponential damped wheel/pinch zoom centered on cursor.

---

## 6. Live Analytics & Token Health Linter

Real-time diagnostic engine calculating system quality scores.

### 6.1 Diagnostic Engines
- **Token Health Scanner**:
  - Detects broken, unresolved, or circular alias references.
  - Evaluates semantic adherence rate (ratio of aliased tokens vs hardcoded raw values).
  - Identifies duplicate raw hex codes for token consolidation.
- **WCAG 2.1 Accessibility Auditor**:
  - Evaluates AA (4.5:1) and AAA (7:1) contrast pass rates across foreground/background color pairs.
  - Color Vision Deficiency (CVD) simulation strip (*Protanopia, Deuteranopia, Tritanopia*).
- **Multi-Theme Coverage Scanner**:
  - Calculates override completion percentages across all defined theme options.

---

## 7. Releases & Automated Build Distribution

A dedicated **Releases** tab allowing versioned design token packaging and multi-platform compilation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CREATE NEW RELEASE WIZARD                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Version: [ v1.2.0 ] (Major / Minor / Patch SemVer)                        │
│ • Release Notes & Changelog Summary                                         │
│ • Selected Systems: [☑ Web (CSS/Tailwind)  ☑ iOS (Swift)  ☑ Android (XML)]  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DISTRIBUTION ARTIFACTS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. CSS Variables Bundle (`tokens.css`):                                     │
│    • :root { --colors-brand: #3b82f6; --font-size-lg: 20px; }               │
│    • .theme-dark { --colors-surface: #121218; }                             │
│                                                                             │
│ 2. Style Dictionary Build Distribution (.zip):                              │
│    • `config.json` (Style Dictionary build configuration)                   │
│    • `dist/web/tokens.css` & `dist/web/tokens.scss`                         │
│    • `dist/web/tokens.js` & `dist/web/tokens.d.ts` (ESM / TypeScript)       │
│    • `dist/tailwind/tailwind.config.js`                                     │
│    • `dist/ios/Tokens.swift`                                                │
│    • `dist/android/colors.xml` & `dimens.xml`                               │
│                                                                             │
│ 3. Release History & Visual Changelog:                                      │
│    • Archive of past versions with 1-click artifact download                │
│    • Visual token diff showing added, modified, and removed tokens          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Second Screen Cloud & API Engine

Backend services enabling seamless collaboration and private plugin integration.

### 8.1 Capabilities
- **Personal Access Tokens (PAT)**:
  - Generate secure API keys from the web dashboard with granular read/write scopes.
- **REST Sync API**:
  - `GET /api/v1/tokens`: Fetch current resolved tokens, `$themes.json`, and `$metadata.json`.
  - `POST /api/v1/tokens/push`: Submit token updates with automated Git commits or cloud storage persistence.
  - `GET /api/v1/releases`: Retrieve release packages and compiled assets.
- **Webhooks**:
  - Trigger CI/CD pipelines, Slack/Teams notifications, or Style Dictionary builds whenever tokens are published.

---

## 9. Companion Private Figma Plugin

A custom Figma plugin connecting Figma directly to the Second Screen platform.

### 9.1 Plugin Features
- **Second Screen Cloud Provider**:
  - Select "Second Screen Cloud" as the sync provider, enter platform URL + generated PAT.
- **Figma Variables Synchronization**:
  - Automatically creates and updates Figma Variable Collections and Modes (e.g. *Color Mode / Light & Dark*).
  - Maps Color, Dimension, and Float variables natively.
- **Figma Styles Synchronization**:
  - Creates Color Styles, Text Styles, and Effect Styles for properties not yet supported by Figma Variables (like shadows and typography composites).
- **Bi-Directional Sync**:
  - **Pull from Web**: Fetch latest tokens from the web platform and apply to Figma canvas.
  - **Push from Figma**: Author tokens in Figma and push back to Second Screen with commit messages.

---

## 10. CI/CD, Webhooks & Developer Integrations

- **Automated NPM Package Publishing**:
  - Publish tokens directly to private or public NPM registries (e.g. `@company/design-tokens`).
- **Pull Request Automation**:
  - Automatically open Pull Requests in Azure DevOps / GitHub with visual markdown diff summaries whenever a release is created.
- **Component Playground**:
  - In-app interactive preview testing design tokens against live UI components (Buttons, Inputs, Modals, Cards) across all theme combinations.

---

## 11. Implementation Roadmap

| Phase | Milestone | Key Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | **Core Studio & Theming** | ✅ Split-view sidebar, dual-mode tokens workspace, theme matrix, flow graph, accessibility linter, math & `roundTo()` evaluator, web app version badge. |
| **Phase 2** | **Releases & Code Compilers** | ✅ Dedicated Releases tab, CSS Variables generator (System Selector), Style Dictionary multi-platform bundle builder, 1-click ZIP distribution, version history. |
| **Phase 3** | **Onboarding & Creation Wizard** | ✅ Onboarding modal (3 launch paths), 4 production starter templates (SaaS, E-Commerce, Mobile, AAA), visual Add Token wizard, Add Set/Folder creator, Duplicate & Delete token actions. |
| **Phase 4** | **Second Screen Cloud API & Auth** | ✅ PAT key generation & management, SHA-256 token hashing, `/api/v1/tokens` GET & POST endpoints, `/api/v1/releases` endpoint, Project Settings Cloud API tab. |
| **Phase 5** | **Private Figma Plugin** | ✅ Companion Figma plugin workspace (`plugin/`), Figma manifest v2, native Figma Variables & Styles sync engine, 1-click plugin ZIP distribution. |

---

*Document created and maintained for the Second Screen Design Token Ecosystem.*
