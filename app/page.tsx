"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { ThemeMatrix } from "@/components/ThemeMatrix";
import { TokenFlow } from "@/components/TokenFlow";
import { TokensWorkspace } from "@/components/TokensWorkspace";
import { CredentialsModal } from "@/components/CredentialsModal";
import { DashboardView } from "@/components/DashboardView";
import { ReleasesWorkspace } from "@/components/ReleasesWorkspace";
import { DocumentationView } from "@/components/DocumentationView";
import { AssetsView } from "@/components/AssetsView";
import { ExportsView } from "@/components/ExportsView";
import { ActivityView } from "@/components/ActivityView";
import { IntegrationsView } from "@/components/IntegrationsView";
import { McpCliView } from "@/components/McpCliView";
import { ToastContainer } from "@/components/Toast";
import { useTokenStore } from "@/store/useTokenStore";

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    initializeFromStorage,
    viewMode,
    sidebarTab,
    credentials,
    rawTokens,
    currentUser,
  } = useTokenStore();

  useEffect(() => {
    // Restore tokens, theme matrix, and credentials securely from client storage on reload
    initializeFromStorage();
  }, [initializeFromStorage]);

  const hasTokens = Object.keys(rawTokens).length > 0;
  const isGitConnected = Boolean(credentials.owner && credentials.repo);
  const isConfigured = Boolean(hasTokens || isGitConnected || currentUser);

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-white dark:bg-[#09090d] text-slate-900 dark:text-zinc-100">
      {/* Top Header: Logo, Clean Status, Theme Switcher & Auth */}
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Render Sidebar ONLY when user is configured / logged in / has tokens */}
        {isConfigured && <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />}

        {!isConfigured ? (
          /* Full-screen clean Onboarding Hub when unconfigured / empty */
          <DashboardView onOpenSettings={() => setIsSettingsOpen(true)} />
        ) : sidebarTab === "dashboard" ? (
          <DashboardView onOpenSettings={() => setIsSettingsOpen(true)} />
        ) : sidebarTab === "documentation" ? (
          <DocumentationView />
        ) : sidebarTab === "assets" ? (
          <AssetsView />
        ) : sidebarTab === "exports" ? (
          <ExportsView />
        ) : sidebarTab === "releases" ? (
          <ReleasesWorkspace />
        ) : sidebarTab === "activity" ? (
          <ActivityView />
        ) : sidebarTab === "integrations" ? (
          <IntegrationsView onOpenSettings={() => setIsSettingsOpen(true)} />
        ) : sidebarTab === "mcp" ? (
          <McpCliView />
        ) : sidebarTab === "tokens" ? (
          <TokensWorkspace onOpenSettings={() => setIsSettingsOpen(true)} />
        ) : viewMode === "flow" ? (
          <TokenFlow />
        ) : (
          <ThemeMatrix onOpenSettings={() => setIsSettingsOpen(true)} />
        )}
      </div>

      {/* Settings Modal & Toast Notifications */}
      <CredentialsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <ToastContainer />
    </main>
  );
}
