import { GitCredentials, RawTokensDocument, ThemeGroup } from "./tokens";

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

export interface Organization {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  ownerUid: string;
  members: OrganizationMember[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description?: string;
  gitConfig?: GitCredentials;
  rawTokens?: RawTokensDocument;
  themeGroups?: ThemeGroup[];
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
}
