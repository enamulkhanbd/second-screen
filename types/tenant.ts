import { GitCredentials, RawTokensDocument, ThemeGroup, ProjectBranch } from "./tokens";

export type UserRole = "owner" | "admin" | "editor" | "viewer";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface OrganizationMember {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  joinedAt: string;
}

export interface OrganizationInvitation {
  id: string;
  token: string;
  orgId: string;
  orgName: string;
  invitedByUid: string;
  invitedByName: string;
  invitedByEmail: string;
  inviteeEmail: string;
  role: UserRole;
  status: "pending" | "accepted" | "declined" | "revoked";
  createdAt: string;
  expiresAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  icon?: string;
  color?: string;
  logoUrl?: string;
  ownerUid: string;
  members: OrganizationMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAsset {
  id: string;
  name: string;
  title?: string;
  type?: string;
  tag?: string;
  category?: string;
  svg: string;
  path?: string;
  updatedAt: string;
  source: "upload" | "git" | "figma";
  figmaNodeId?: string;
  figmaUrl?: string;
  figmaSourceId?: string;
  figmaSourceName?: string;
}

export interface AssetGitConfig {
  provider: "github" | "azure" | "gitlab" | "bitbucket";
  owner: string;
  project?: string;
  repo: string;
  branch: string;
  assetFolder?: string; // e.g. "icons" or "assets/icons"
  pat: string;
  isPaused?: boolean;
}

export interface FigmaSourceLink {
  id: string;
  name: string; // User-defined or auto-detected title (e.g. "Navigation Icons")
  fileUrl: string; // Full Figma URL
  fileKey: string; // Extracted file key
  nodeId?: string; // Target frame/section/component set node ID (e.g. "102:450")
  nodeName?: string; // Figma API returned frame/section name
  lastSyncedAt?: string;
  assetCount?: number;
  enabled?: boolean;
  isPaused?: boolean;
}

export interface AssetFigmaConfig {
  pat: string; // Unified Personal Access Token
  sources: FigmaSourceLink[]; // Array of multiple Figma source links
  lastSyncedAt?: string;
  isPaused?: boolean;
  showSourceBadge?: boolean;
  // Legacy single-source fields for backward compatibility:
  fileUrl?: string;
  fileKey?: string;
  nodeId?: string;
  nodeName?: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  logoUrl?: string;
  gitConfig?: GitCredentials | null;
  assetGitConfig?: AssetGitConfig | null;
  assetFigmaConfig?: AssetFigmaConfig | null;
  assets?: ProjectAsset[];
  hasChunkedAssets?: boolean;
  assetsCount?: number;
  rawTokens?: RawTokensDocument;
  themeGroups?: ThemeGroup[];
  figmaVariables?: RawTokensDocument;
  figmaUpdatedAt?: string;
  figmaMeta?: Record<string, any>;
  documentation?: import("./documentation").ProjectDocumentation | null;
  branches?: ProjectBranch[];
  activeBranch?: string;
  enabledSchemas?: string[];
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
}

export interface RolePermissionDetails {
  title: string;
  description: string;
  badgeColor: "violet" | "secondary" | "success" | "outline";
  icon: string;
  canManageOrg: boolean;
  canInviteMembers: boolean;
  canEditTokens: boolean;
  canPushGit: boolean;
  canPublishReleases: boolean;
  canViewTokens: boolean;
}

export const ROLE_DEFINITIONS: Record<UserRole, RolePermissionDetails> = {
  owner: {
    title: "Owner",
    description: "Full administrative control, project management, billing, and member roles.",
    badgeColor: "violet",
    icon: "👑",
    canManageOrg: true,
    canInviteMembers: true,
    canEditTokens: true,
    canPushGit: true,
    canPublishReleases: true,
    canViewTokens: true,
  },
  admin: {
    title: "Admin",
    description: "Can manage projects, configure Git repositories, manage member roles, and invite teammates.",
    badgeColor: "violet",
    icon: "🛡️",
    canManageOrg: true,
    canInviteMembers: true,
    canEditTokens: true,
    canPushGit: true,
    canPublishReleases: true,
    canViewTokens: true,
  },
  editor: {
    title: "Editor",
    description: "Can edit design tokens, modify theme matrices, push branches, create releases, and invite teammates.",
    badgeColor: "secondary",
    icon: "✏️",
    canManageOrg: false,
    canInviteMembers: true,
    canEditTokens: true,
    canPushGit: true,
    canPublishReleases: true,
    canViewTokens: true,
  },
  viewer: {
    title: "Viewer",
    description: "Read-only access. Can view token matrices, explore flow, copy code, and download packages.",
    badgeColor: "outline",
    icon: "👁️",
    canManageOrg: false,
    canInviteMembers: false,
    canEditTokens: false,
    canPushGit: false,
    canPublishReleases: false,
    canViewTokens: true,
  },
};
