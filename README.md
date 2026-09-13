# Tokens Platform 🎨

A web-based design tokens platform and companion plugin for **Tokens Studio & Figma** design tokens, supporting dual-state alias resolution, deep multi-mode theme matrices (Theme, Mode, Brand, Typography), multi-platform compilation (Tailwind, CSS, React, Flutter, Swift, Android), and real-time Git synchronization (GitHub & Azure DevOps).

---

## Features

- **1:1 Tokens Studio Theme Matrix Grid**: View and edit design token overrides across dynamic modes (`Light`, `Dark`, `Brand`, `Typography`).
- **Live Color Swatches & Composite Typography Previews**: Computed swatches with alpha checkerboard and interactive typography inspectors.
- **Dual-State Engine**: Preserves raw `{...}` token alias syntax while computing live resolved values.
- **Multi-Set & Recursive Auto-Discovery**: Automatically discovers all token files, sets, and `$themes.json` configurations from repository folders.
- **Two-Way Git Sync**: Direct pull & push commits with branch switching for GitHub and Azure DevOps.

---

## Vercel Deployment

Deploy this project on [Vercel](https://vercel.com) with standard Next.js settings:

1. **Framework Preset**: Next.js
2. **Build Command**: `npm run build` (or `next build`)
3. **Output Directory**: `.next`
4. **Install Command**: `npm install`

No special environment variables are required to deploy. Users provide their Git Personal Access Tokens (PATs) securely within the client session.

---

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Documentation

- **[System Architecture](docs/ARCHITECTURE.md)**: High-level overview, data flows, and directory responsibilities.
- **[Design System Guidelines](docs/DESIGN.md)**: Dark theme tokens, color palettes, typography hierarchy, and dialog standards.
- **[Developer & Skills Cheat Sheet](docs/SKILLS.md)**: Token scaling, schema catalog operations, and Figma plugin build commands.
- **[Schema Registry Deployment Plan](docs/SCHEMA_REGISTRY_DEPLOYMENT_PLAN.md)**: Step-by-step guide for hosting dedicated schemas on GitHub, Vercel, and custom domains.
- **[AI Agent Guide](AGENTS.md)**: Architectural invariants, guardrails, and testing standards for coding assistants.
- **[Changelog](CHANGELOG.md)**: Complete version history and release notes.
