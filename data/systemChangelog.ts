import { SystemChangelogEntry } from "@/types/changelog";

export const SYSTEM_CHANGELOG: SystemChangelogEntry[] = [
  {
    version: "v1.2.1",
    releaseDate: "September 6, 2026",
    title: "Real-Time User Activity Audit Logs & Smart Git Asset Sync",
    badge: "Enhancement",
    badgeVariant: "success",
    isLatest: true,
    summary:
      "Added cross-team real-time User Activity Audit Logging via Firestore, full event tracking across tokens and assets, and dynamic dual-path Git icon synchronization.",
    highlights: [
      "Authentic cross-team User Activity Log powered by Cloud Firestore (`organizations/{orgId}/activities`).",
      "Full event tracking across token mutations, theme creation, releases, vector asset uploads, and member management.",
      "Dynamic Git sync supporting both `assets/icons` and `assets/icons/svg` with parent `metadata.json` automatic resolution.",
      "High-scale asset ingestion expanded to 5,000 items with Azure DevOps chunking.",
      "Modernized UI with Assets filter tab, role pills, project badges, and exact ISO timestamp tooltips.",
    ],
    items: [
      {
        title: "Cross-Team User Activity Audit Logs",
        description:
          "Completely eliminated dummy/mock fallback logs in favor of a shared Firestore audit collection, enabling all team members in an organization to see who modified tokens, created releases, or updated assets in real time.",
        category: "feature",
        tags: ["Audit Log", "Firestore", "Team"],
      },
      {
        title: "Comprehensive Platform Event Triggers",
        description:
          "Instrumented automatic activity logging across token edits, theme option creation, package releases, vector asset uploads/updates/deletions, Git asset syncs, Figma source syncs, and team invitations.",
        category: "enhancement",
        tags: ["Tokens", "Assets", "Git", "Figma", "Releases"],
      },
      {
        title: "Dynamic Dual-Path Git Icon Sync",
        description:
          "Added automatic resolution for both `assets/icons` and `assets/icons/svg` structures with recursive parent folder lookups for `metadata.json` and subfolder format stripping.",
        category: "integration",
        tags: ["Git", "Icons", "Azure DevOps", "GitHub"],
      },
      {
        title: "High-Scale Icon Processing",
        description:
          "Expanded Git asset retrieval limit to 5,000 items with batched Azure DevOps requests to seamlessly handle repositories with 1,380+ vector icons without timeouts.",
        category: "enhancement",
        tags: ["Performance", "Azure DevOps"],
      },
      {
        title: "Modernized Activity Log UX",
        description:
          "Added dedicated Assets category filter, actor role badges, project tags, contextual metadata badges (old vs new values, commit SHAs, release versions), and hover datetime tooltips.",
        category: "ui",
        tags: ["UI", "Accessibility", "UX"],
      },
    ],
  },
  {
    version: "v1.2.0",
    releaseDate: "September 1, 2026",
    title: "Dynamic Git Path Scoping & Git Log Tracking",
    badge: "Feature Release",
    badgeVariant: "violet",
    isLatest: false,
    summary:
      "Added dynamic repository path scoping for Git commit histories, path-filtered change detection, and dedicated system changelog tracking.",
    highlights: [
      "Dynamic path scoping (`assets/tokens/` or custom folder) for Git commit history.",
      "Smart remote update detection scoped to configured token files.",
      "Dedicated System Changelog workspace to track platform releases.",
    ],
    items: [
      {
        title: "Dynamic Path Scoping for Git History",
        description:
          "Commit history and side-by-side file diffs are now filtered dynamically based on the exact path configured in your project Git settings (e.g. `assets/tokens/`, `tokens.json`, or custom subfolders), skipping all non-token commits.",
        category: "feature",
        tags: ["Git", "Tokens", "Performance"],
      },
      {
        title: "Scoped Remote Update Checking",
        description:
          "Remote update notifications ('New Remote Commits Detected') now only trigger when changes happen within your configured token directory.",
        category: "enhancement",
        tags: ["Git", "Notifications"],
      },
      {
        title: "Dedicated System Changelog Workspace",
        description:
          "Explore platform version releases, categorized feature additions, performance enhancements, and bug fixes directly from the sidebar.",
        category: "feature",
        tags: ["Changelog", "UI"],
      },
      {
        title: "Multi-Provider Path Query Normalization",
        description:
          "Standardized path parameters across GitHub, Azure DevOps (`searchCriteria.itemPath`), GitLab, and Bitbucket Cloud.",
        category: "integration",
        tags: ["GitHub", "Azure DevOps", "GitLab", "Bitbucket"],
      },
    ],
  },
  {
    version: "v1.1.0",
    releaseDate: "August 24, 2026",
    title: "Multi-Platform Code Compiler & Distribution Targets",
    badge: "Major Release",
    badgeVariant: "default",
    isLatest: false,
    summary:
      "Automated multi-platform compilation supporting Tailwind CSS, React TypeScript, Flutter Dart, iOS Swift, and Android XML with direct multi-repo distribution.",
    highlights: [
      "Multi-platform token compilation to 6 target systems simultaneously.",
      "Automated distribution targets with direct Git push or PR creation.",
      "Customizable compiler settings: name transforms, units, and class prefixes.",
    ],
    items: [
      {
        title: "Multi-Platform Token Compiler",
        description:
          "Compile tokens into Tailwind CSS configs, CSS variables, React TypeScript types, Flutter Dart classes, iOS Swift structs, and Android XML resources with one click.",
        category: "feature",
        tags: ["Compiler", "Tailwind", "Flutter", "iOS", "Android"],
      },
      {
        title: "Automated Distribution Targets",
        description:
          "Push compiled token artifacts across multiple connected web, iOS, and Android repositories via direct commits or automated Pull Requests.",
        category: "feature",
        tags: ["Distribution", "Multi-Repo", "CI/CD"],
      },
      {
        title: "Configurable Style Dictionary Transforms",
        description:
          "Configure case formatting (kebab, camel, snake, pascal), root font size (rem/px), and alias reference resolution.",
        category: "enhancement",
        tags: ["Compiler", "Style Dictionary"],
      },
      {
        title: "Semantic Versioning Release Packages",
        description:
          "Package tokens into immutable semantic versions (+Major, +Minor, +Patch) with full changelog notes and target system summaries.",
        category: "feature",
        tags: ["Releases", "SemVer"],
      },
    ],
  },
  {
    version: "v1.0.0",
    releaseDate: "August 10, 2026",
    title: "Official Platform Launch: Figma Sync & Visual Token Studio",
    badge: "Major Release",
    badgeVariant: "success",
    isLatest: false,
    summary:
      "Initial production release featuring Figma companion plugin synchronization, two-way Git syncing, theme matrix comparison grid, and visual token dependency graph.",
    highlights: [
      "Two-way synchronization with Figma companion plugin via 6-digit pair codes.",
      "Visual theme matrix comparison grid and token dependency flow graph.",
      "W3C DTCG standard compliance with cross-file alias resolution.",
    ],
    items: [
      {
        title: "Figma Companion Plugin Integration",
        description:
          "Pair your desktop Figma canvas in seconds using a 6-digit code. Push and pull 2,400+ variables with zero manual JSON export.",
        category: "feature",
        tags: ["Figma", "Plugin", "Sync"],
      },
      {
        title: "Two-Way Git Version Control",
        description:
          "Connect GitHub, Azure DevOps, GitLab, and Bitbucket repositories with branch switching, direct push, and side-by-side diff reviews.",
        category: "integration",
        tags: ["Git", "GitHub", "Azure DevOps"],
      },
      {
        title: "Interactive Theme Matrix & Flow Graph",
        description:
          "Compare color palettes across Light, Dark, High Contrast, and Custom brand modes in a real-time matrix or visual dependency flow graph.",
        category: "feature",
        tags: ["Themes", "Flow Graph", "Matrix"],
      },
      {
        title: "W3C DTCG Token Specification",
        description:
          "Full support for colors, typography, dimensions, spacing, border radii, shadows, and multi-level alias references.",
        category: "enhancement",
        tags: ["W3C DTCG", "Tokens"],
      },
    ],
  },
  {
    version: "v0.9.0-beta",
    releaseDate: "July 20, 2026",
    title: "Initial Beta & Cloud Architecture",
    badge: "Initial Beta",
    badgeVariant: "outline",
    isLatest: false,
    summary:
      "Early beta foundation featuring multi-tenant organization workspaces, team role management, and encrypted token storage.",
    highlights: [
      "Multi-tenant workspace architecture with project switching.",
      "Role-based access control: Owner, Admin, Editor, and Viewer.",
      "Firebase authentication and cloud persistence.",
    ],
    items: [
      {
        title: "Multi-Tenant Workspaces & Projects",
        description:
          "Create and manage isolated organizations, design projects, and team permissions with granular role-based controls.",
        category: "security",
        tags: ["Auth", "Tenancy", "RBAC"],
      },
      {
        title: "Encrypted Cloud Storage",
        description:
          "Securely store and retrieve token dictionaries with zero data leakage between organizations.",
        category: "security",
        tags: ["Cloud", "Security"],
      },
    ],
  },
];

export const LATEST_VERSION = SYSTEM_CHANGELOG[0].version;
