"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SecondarySidebar } from "@/components/SecondarySidebar";
import { ThemeMatrix } from "@/components/ThemeMatrix";
import { TokenFlow } from "@/components/TokenFlow";
import { TokensWorkspace } from "@/components/TokensWorkspace";
import { CredentialsModal } from "@/components/CredentialsModal";
import { WorkspacesProjectsView } from "@/components/WorkspacesProjectsView";
import { DashboardView } from "@/components/DashboardView";
import { SyncProvidersView } from "@/components/SyncProvidersView";
import { VariablesView } from "@/components/VariablesView";
import { ReleasesWorkspace } from "@/components/ReleasesWorkspace";
import { DocumentationView } from "@/components/DocumentationView";
import { AssetsView } from "@/components/AssetsView";
import { ExportsView } from "@/components/ExportsView";
import { ActivityView } from "@/components/ActivityView";
import { IntegrationsView } from "@/components/IntegrationsView";
import { McpCliView } from "@/components/McpCliView";
import { ProjectSettingsView } from "@/components/ProjectSettingsView";
import { MembersView } from "@/components/MembersView";
import { OrgSettingsView } from "@/components/OrgSettingsView";
import { SystemChangelogView } from "@/components/SystemChangelogView";
import { OnboardingWizardModal } from "@/components/OnboardingWizardModal";
import { AcceptInviteModal } from "@/components/AcceptInviteModal";
import { AuthGatewayView } from "@/components/AuthGatewayView";
import { ToastContainer } from "@/components/Toast";
import { useTokenStore } from "@/store/useTokenStore";

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWizardDismissed, setIsWizardDismissed] = useState(false);
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

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-white dark:bg-[#09090d] text-slate-900 dark:text-zinc-100">
      {/* Top Header: Logo, Clean Status, Theme Switcher & Auth */}
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Primary Navigation Sidebar */}
        <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />

        {/* 2. Secondary Contextual Sidebar (for Tokens Sets Tree & Themes Mode Groups when in studio) */}
        {(sidebarTab === "tokens" || sidebarTab === "themes") && <SecondarySidebar />}

        {/* 3. Main Workspace Page Views */}
        {sidebarTab === "dashboard" || (sidebarTab as string) === "workspaces" ? (
          <WorkspacesProjectsView />
        ) : sidebarTab === "variables" ? (
          <VariablesView onOpenSettings={() => setIsSettingsOpen(true)} />
        ) : sidebarTab === "documentation" ? (
          <DocumentationView />
        ) : sidebarTab === "assets" ? (
          <AssetsView />
        ) : sidebarTab === "exports" ? (
          <ExportsView />
        ) : sidebarTab === "releases" ? (
          <ReleasesWorkspace />
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
        ) : sidebarTab === "tokens" ? (
          <TokensWorkspace onOpenSettings={() => setIsSettingsOpen(true)} />
        ) : viewMode === "flow" ? (
          <TokenFlow />
        ) : (
          <ThemeMatrix onOpenSettings={() => setIsSettingsOpen(true)} />
        )}
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
