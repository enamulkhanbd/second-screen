"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { ThemeMatrix } from "@/components/ThemeMatrix";
import { TokenFlow } from "@/components/TokenFlow";
import { CredentialsModal } from "@/components/CredentialsModal";
import { ToastContainer } from "@/components/Toast";
import { useTokenStore } from "@/store/useTokenStore";

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { initializeFromStorage, viewMode } = useTokenStore();

  useEffect(() => {
    // Restore tokens, theme matrix, and credentials securely from client storage on reload
    initializeFromStorage();
  }, [initializeFromStorage]);

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-[#09090d] text-slate-900 dark:text-zinc-100">
      {/* Top Header: Logo, Interactive Breadcrumbs, Avatar, Branch Dropdown */}
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Workspace: Theme Groups Sidebar + Matrix or Flow Graph */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />
        {viewMode === "flow" ? (
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
