export type ChangelogCategory =
  | "feature"
  | "enhancement"
  | "fix"
  | "integration"
  | "ui"
  | "security";

export interface ChangelogItem {
  title: string;
  description: string;
  category: ChangelogCategory;
  tags?: string[];
}

export interface SystemChangelogEntry {
  version: string; // e.g. "v1.2.0"
  releaseDate: string; // e.g. "2026-09-01"
  title: string; // e.g. "Dynamic Git Path Scoping & Git Log Tracking"
  badge: "Major Release" | "Feature Release" | "Enhancement" | "Hotfix" | "Initial Beta";
  badgeVariant?: "default" | "secondary" | "outline" | "violet" | "success" | "warning";
  isLatest?: boolean;
  summary: string;
  highlights?: string[];
  items: ChangelogItem[];
}
