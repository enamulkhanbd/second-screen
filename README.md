# Tokens Studio Second Screen 🎨

A web-based second-screen viewer and editor for **Tokens Studio for Figma** design tokens, supporting dual-state alias resolution, deep multi-mode theme matrices (Theme, Mode, Brand, Typography), and real-time Git synchronization (GitHub & Azure DevOps).

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
