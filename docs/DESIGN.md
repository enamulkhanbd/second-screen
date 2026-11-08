# Design System & Tokens Architecture (`DESIGN.md`)

> **Implementation Status:** ✅ **Developed & Active (v1.7.0)** — The 3-tier dark/light surface hierarchy, typography scale, `shadcn/ui` primitives, modal geometry standards, and DTCG 2025.10 token structures defined here are fully implemented across the studio and companion plugin.

This document serves as the foundational design system reference and visual guidelines for the **Second Screen / Tokens Platform** web application, Figma companion plugin, and living documentation ecosystem.

---

## 1. Core Principles

1. **Rich & Intentional Aesthetics**: Sleek, high-contrast dark modes with curated neutral palettes (deep slate/zinc `#09090d` and `#121316`) balanced by functional accent colors (Emerald for status/success, Violet/Indigo for brand primary, Blue for functions, Rose/Red for destructive actions).
2. **Predictable Typography**: Strict typographic scale utilizing system and modern sans-serif typefaces (Inter / SF Pro / Roboto), paired with monospace fonts for token names, aliases, and JSON payloads.
3. **No Decorative Distractions**: Subtle borders (`#1f2126` to `#27292e`), smooth backdrop blurs (`backdrop-blur-md`), and micro-interactions on hover and focus without visual clutter.
4. **100% DTCG & Multi-Format Parity**: Token definitions strictly honor Design Tokens Community Group (DTCG 2025.10) specifications, W3C standards, and custom extensible format projections (Figma variables, CSS custom properties, SCSS, SwiftUI, Jetpack Compose, Flutter, Android XML).

---

## 2. Color Palette & Functional Roles

### Dark Mode Base Tokens
| Role | Hex / Value | Usage |
|------|-------------|-------|
| **Background (Deep)** | `#09090d` | Main window and page background |
| **Surface / Card** | `#121316` | Cards, modals, dialog surfaces, inspector panels |
| **Surface Inset** | `#0c0d10` | Code blocks, link boxes, input backgrounds |
| **Border (Subtle)** | `#1f2126` | Card dividers, section boundaries |
| **Border (Standard)** | `#27292e` | Interactive borders, modal strokes |
| **Text Primary** | `#ffffff` / `#f4f4f5` | Headings, active values, high-contrast labels |
| **Text Muted** | `#a1a1aa` / `#71717a` | Descriptions, metadata, placeholders |

### Functional Accents
* **Success & Available**: Background `#142918`, Border `#234d28`, Text `#4ade80` (Emerald 400).
* **Enabled & Active**: Background `#183920`, Border `#2ea347`, Text `#4ade80`.
* **Utility & Core**: Background `#18191d`, Border `#2a2c33`, Text `#e4e4e7`.
* **Color Spaces**: Background `#2e1065` (Purple 950), Border `#581c87`, Text `#d8b4fe`.
* **Functions & Math**: Background `#172554` (Blue 950), Border `#1e40af`, Text `#93c5fd`.
* **Destructive / Danger**: Background `#450a0a` (Red 950), Border `#991b1b`, Text `#f87171`.

---

## 3. Typography Hierarchy

```
Display / H1:   24px (1.5rem)   | Font-Weight: 700 (Bold)       | Tracking: -0.02em
Section / H2:   18px (1.125rem) | Font-Weight: 700 (Bold)       | Tracking: -0.015em
Card Title:     14px (0.875rem) | Font-Weight: 600 (Semi-bold)  | Tracking: -0.01em
Body Text:      13px - 14px     | Font-Weight: 400 (Regular)    | Line-Height: 1.5
Captions/Badges: 11px - 12px    | Font-Weight: 500 (Medium)     | Tracking: 0.01em
Code / Monospace: 12px (0.75rem)| Font-Family: ui-monospace, Menlo, Consolas
```

---

## 4. Spacing & Grid System

- **Base Increment**: 4px grid (`0.25rem`).
- **Padding Hierarchy**:
  - Modal content: `p-6 sm:p-7` (24px to 28px).
  - Cards: `p-4` (16px).
  - Compact controls / Inset boxes: `p-2.5` to `p-3` (10px to 12px).
- **Radius Scale**:
  - Small pills: `rounded-full`
  - Inset boxes / Buttons: `rounded-lg` (8px)
  - Cards: `rounded-xl` (12px)
  - Dialogs & Modals: `rounded-2xl` (16px)

---

## 5. Modal & Dialog Design Standards

Reference implementation: [`components/ExtensionDetailModal.tsx`](file:///d:/GitHub/second-screen/components/ExtensionDetailModal.tsx)

1. **Geometry & Centering**:
   - Always specify fixed bounds (`max-w-xl`, `w-full`).
   - Use `flex flex-col` layout instead of pure grid to prevent unexpected column expansion on unbroken strings.
   - Enforce `overflow-hidden` at the root dialog container so no unwanted scrollbars clip borders.
2. **Header Area**:
   - Clean title with `text-xl font-bold text-white tracking-tight`.
   - Subtle close icon (`X`) positioned at `top-4 right-4` with muted opacity.
3. **Pill Badges**:
   - Positioned beneath title and description.
   - Consistent padding: `px-3 py-0.5 text-xs font-medium rounded-full`.
4. **Link / Code Boxes**:
   - Deep-dark inset background (`bg-[#0c0d10]`).
   - Monospace font with `min-w-0 flex-1 truncate` to prevent overflow.
   - Distinct icons for copy (`Check` / `Copy`) and external navigation (`ArrowUpRight`).
5. **Footer Actions**:
   - Separated by a clean `border-t border-[#23252a] mt-6 pt-4`.
   - Actions aligned right (`justify-end gap-2.5`).

---

## 6. Token Structure & Governance

Every token managed by the studio strictly follows the format:

```json
{
  "color": {
    "brand": {
      "primary": {
        "$type": "color",
        "$value": "#6366f1",
        "$description": "Primary brand accent token"
      }
    }
  }
}
```

- **Reference Aliases**: Written with curly braces: `{color.brand.primary}`.
- **Set Scoping**: Managed dynamically via `$metadata.json` and `$themes.json`.
- **Extension Schemas**: Governed on a per-project basis (`enabledSchemas`) through the Schema Marketplace.
