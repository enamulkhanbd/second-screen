"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SecondarySidebar } from "@/components/SecondarySidebar";
import { ThemeMatrix } from "@/components/ThemeMatrix";
import { TokensWorkspace } from "@/components/TokensWorkspace";
import { CredentialsModal } from "@/components/CredentialsModal";
import { WorkspacesProjectsView } from "@/components/WorkspacesProjectsView";
import { WorkspacesListView } from "@/components/WorkspacesListView";
import { DashboardView } from "@/components/DashboardView";
import { VariablesView } from "@/components/VariablesView";
import { OnboardingWizardModal } from "@/components/OnboardingWizardModal";
import { AcceptInviteModal } from "@/components/AcceptInviteModal";
import { AuthGatewayView } from "@/components/AuthGatewayView";
import { ToastContainer } from "@/components/Toast";
import { useTokenStore } from "@/store/useTokenStore";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

function WorkspaceLoading() {
  return (
    <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
      Loading workspace...
    </div>
  );
}

const ReleasesWorkspace = dynamic(
  () => import("@/components/ReleasesWorkspace").then((module) => module.ReleasesWorkspace),
  { ssr: false, loading: WorkspaceLoading }
);
const DocumentationView = dynamic(
  () => import("@/components/DocumentationView").then((module) => module.DocumentationView),
  { ssr: false, loading: WorkspaceLoading }
);
const AssetsView = dynamic(
  () => import("@/components/AssetsView").then((module) => module.AssetsView),
  { ssr: false, loading: WorkspaceLoading }
);
const ExportsView = dynamic(
  () => import("@/components/ExportsView").then((module) => module.ExportsView),
  { ssr: false, loading: WorkspaceLoading }
);
const ActivityView = dynamic(
  () => import("@/components/ActivityView").then((module) => module.ActivityView),
  { ssr: false, loading: WorkspaceLoading }
);
const BranchesView = dynamic(
  () => import("@/components/BranchesView").then((module) => module.BranchesView),
  { ssr: false, loading: WorkspaceLoading }
);
const McpCliView = dynamic(
  () => import("@/components/McpCliView").then((module) => module.McpCliView),
  { ssr: false, loading: WorkspaceLoading }
);
const ProjectSettingsView = dynamic(
  () => import("@/components/ProjectSettingsView").then((module) => module.ProjectSettingsView),
  { ssr: false, loading: WorkspaceLoading }
);
const MembersView = dynamic(
  () => import("@/components/MembersView").then((module) => module.MembersView),
  { ssr: false, loading: WorkspaceLoading }
);
const OrgSettingsView = dynamic(
  () => import("@/components/OrgSettingsView").then((module) => module.OrgSettingsView),
  { ssr: false, loading: WorkspaceLoading }
);
const ExtensionsView = dynamic(
  () => import("@/components/ExtensionsView").then((module) => module.ExtensionsView),
  { ssr: false, loading: WorkspaceLoading }
);
const SystemChangelogView = dynamic(
  () => import("@/components/SystemChangelogView").then((module) => module.SystemChangelogView),
  { ssr: false, loading: WorkspaceLoading }
);
const SystemDocsView = dynamic(
  () => import("@/components/SystemDocsView").then((module) => module.SystemDocsView),
  { ssr: false, loading: WorkspaceLoading }
);

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWizardDismissed, setIsWizardDismissed] = useState(false);
  const [isPrimaryNavOpen, setIsPrimaryNavOpen] = useState(false);
  const [isContextNavOpen, setIsContextNavOpen] = useState(false);
  const {
    initializeFromStorage,
    viewMode,
    sidebarTab,
    credentials,
    rawTokens,
    currentUser,
    isLoadingTenant,
    isLoadingProjectData,
    userOrgs,
    pendingInvitePrompt,
  } = useTokenStore();

  useEffect(() => {
    // Restore tokens, theme matrix, and credentials securely from client storage on reload
    initializeFromStorage();
  }, [initializeFromStorage]);

  useEffect(() => {
    setIsPrimaryNavOpen(false);
    setIsContextNavOpen(false);
  }, [sidebarTab]);

  const hasTokens = Object.keys(rawTokens).length > 0;
  const isGitConnected = Boolean(credentials.owner && credentials.repo);
  const isConfigured = Boolean(currentUser && (hasTokens || isGitConnected));

  const showOnboardingWizard = Boolean(
    currentUser &&
    !isLoadingTenant &&
    userOrgs.length === 0 &&
    !pendingInvitePrompt &&
    !isWizardDismissed
  );

  // Model A: Dedicated Sign In / Welcome Gateway for signed-out users
  if (!currentUser && !isLoadingTenant) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <AuthGatewayView />
        <AcceptInviteModal />
        <ToastContainer />
      </main>
    );
  }

  // Loading Screen while resolving authentication & tenancy
  if (isLoadingTenant) {
    return (
      <main className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground space-y-3 select-none font-sans">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse">
          <div className="w-5 h-5 rounded-md bg-primary" />
        </div>
        <span className="text-xs font-mono text-muted-foreground animate-pulse">
          Loading Tokens Platform...
        </span>
      </main>
    );
  }

  const isWorkspacesView = sidebarTab === "workspaces";

  return (
    <main className="flex h-screen overflow-hidden bg-white dark:bg-[#09090d] text-slate-900 dark:text-zinc-100">
      {/* 1. Primary Navigation Sidebar - Full height to top */}
      {!isWorkspacesView && (
        <>
          <div className="hidden lg:flex h-full flex-shrink-0">
            <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />
          </div>

          <Sheet open={isPrimaryNavOpen} onOpenChange={setIsPrimaryNavOpen}>
            <SheetContent
              side="left"
              className="!w-[min(20rem,calc(100vw-2rem))] p-0 lg:hidden"
            >
              <SheetTitle className="sr-only">Primary navigation</SheetTitle>
              <Sidebar
                mode="drawer"
                className="border-r-0 pt-10"
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </SheetContent>
          </Sheet>
        </>
      )}

      {/* 2. Main Content & Header Column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header: Clean Status, Theme Switcher & Auth */}
        {!isWorkspacesView && (
          <Header
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenNavigation={() => setIsPrimaryNavOpen(true)}
          />
        )}

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">

        {/* 2. Secondary Contextual Sidebar (for Tokens Sets Tree & Themes Mode Groups when in studio) */}
        {(sidebarTab === "tokens" || sidebarTab === "themes") && (
          <>
            <div className="hidden xl:flex h-full">
              <SecondarySidebar />
            </div>
            <Sheet open={isContextNavOpen} onOpenChange={setIsContextNavOpen}>
              <SheetContent
                side="left"
                className="!w-[min(20rem,calc(100vw-2rem))] p-0 xl:hidden"
              >
                <SheetTitle className="sr-only">
                  {sidebarTab === "tokens" ? "Token sets" : "Theme groups"}
                </SheetTitle>
                <SecondarySidebar
                  className="w-full border-r-0 pt-10"
                  onItemSelected={() => setIsContextNavOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </>
        )}

        {/* 3. Main Workspace Page Views */}
        {isLoadingProjectData ? (
          <WorkspaceLoading />
        ) : sidebarTab === "workspaces" ? (
          <WorkspacesListView />
        ) : sidebarTab === "dashboard" ? (
          <DashboardView />
        ) : sidebarTab === "projects" ? (
          <WorkspacesProjectsView />
        ) : sidebarTab === "variables" ? (
          <VariablesView onOpenSettings={() => setIsSettingsOpen(true)} />
        ) : sidebarTab === "documentation" ? (
          <DocumentationView />
        ) : sidebarTab === "assets" ? (
          <AssetsView />
        ) : sidebarTab === "exports" ? (
          <ExportsView />
        ) : sidebarTab === "extensions" ? (
          <ExtensionsView />
        ) : sidebarTab === "releases" ? (
          <ReleasesWorkspace />
        ) : sidebarTab === "branches" ? (
          <BranchesView />
        ) : sidebarTab === "activity" ? (
          <ActivityView onOpenSettings={() => setIsSettingsOpen(true)} />
        ) : sidebarTab === "mcp" ? (
          <McpCliView />
        ) : sidebarTab === "project-settings" ? (
          <ProjectSettingsView />
        ) : sidebarTab === "members" ? (
          <MembersView />
        ) : sidebarTab === "org-settings" ? (
          <OrgSettingsView />
        ) : sidebarTab === "changelog" ? (
          <SystemChangelogView />
        ) : sidebarTab === "system-docs" ? (
          <SystemDocsView />
        ) : sidebarTab === "tokens" ? (
          <TokensWorkspace
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenContextNavigation={() => setIsContextNavOpen(true)}
          />
        ) : sidebarTab === "themes" ? (
          <ThemeMatrix
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenContextNavigation={() => setIsContextNavOpen(true)}
          />
        ) : null}
      </div>
      </div>

      {/* Onboarding Wizard Modal for fresh accounts */}
      <OnboardingWizardModal
        isOpen={showOnboardingWizard}
        onClose={() => setIsWizardDismissed(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Accept Team Invitation Modal for invited members */}
      <AcceptInviteModal />

      {/* Settings Modal & Toast Notifications */}
      <CredentialsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <ToastContainer />
    </main>
  );
}
