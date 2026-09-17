"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SecondarySidebar } from "@/components/SecondarySidebar";
import { ThemeConfigurationView } from "@/components/ThemeConfigurationView";
import { TokensWorkspace } from "@/components/TokensWorkspace";
import { CredentialsModal } from "@/components/CredentialsModal";
import { WorkspacesProjectsView } from "@/components/WorkspacesProjectsView";
import { WorkspacesListView } from "@/components/WorkspacesListView";
import { DashboardView } from "@/components/DashboardView";
import { SyncProvidersView } from "@/components/SyncProvidersView";
import { VariablesView } from "@/components/VariablesView";
import { ReleasesWorkspace } from "@/components/ReleasesWorkspace";
import { DocumentationView } from "@/components/DocumentationView";
import { AssetsView } from "@/components/AssetsView";
import { ExportsView } from "@/components/ExportsView";
import { ActivityView } from "@/components/ActivityView";
import { BranchesView } from "@/components/BranchesView";
import { McpCliView } from "@/components/McpCliView";
import { ProjectSettingsView } from "@/components/ProjectSettingsView";
import { MembersView } from "@/components/MembersView";
import { OrgSettingsView } from "@/components/OrgSettingsView";
import { ExtensionsView } from "@/components/ExtensionsView";
import { SystemChangelogView } from "@/components/SystemChangelogView";
import { SystemDocsView } from "@/components/SystemDocsView";
import { OnboardingWizardModal } from "@/components/OnboardingWizardModal";
import { AcceptInviteModal } from "@/components/AcceptInviteModal";
import { AuthGatewayView } from "@/components/AuthGatewayView";
import { ToastContainer } from "@/components/Toast";
import { useTokenStore } from "@/store/useTokenStore";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

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
        {sidebarTab === "workspaces" ? (
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
        ) : sidebarTab === "integrations" || (sidebarTab as string) === "sync" ? (
          <SyncProvidersView />
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
          <ThemeConfigurationView />
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
