export interface SystemDocOption {
  name: string;
  location?: string;
  description: string;
}

export interface SystemDocSection {
  id: string;
  title: string;
  category: string;
  summary: string;
  iconName: string;
  badge?: string;
  screenshotUrl?: string;
  screenshotCaption?: string;
  highlights: string[];
  options?: SystemDocOption[];
  quickLink?: {
    label: string;
    tab:
      | "dashboard"
      | "projects"
      | "workspaces"
      | "variables"
      | "tokens"
      | "themes"
      | "branches"
      | "documentation"
      | "assets"
      | "exports"
      | "releases"
      | "activity"
      | "integrations"
      | "mcp"
      | "project-settings"
      | "members"
      | "org-settings"
      | "changelog"
      | "extensions";
  };
}
