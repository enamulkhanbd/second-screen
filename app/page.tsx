"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { ThemeMatrix } from "@/components/ThemeMatrix";
import { CredentialsModal } from "@/components/CredentialsModal";
import { ToastContainer } from "@/components/Toast";
import { useTokenStore } from "@/store/useTokenStore";

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { setCredentials } = useTokenStore();

  useEffect(() => {
    // Restore saved repo coordinates from localStorage if available
    try {
      const saved = localStorage.getItem("ts_second_screen_creds");
      if (saved) {
        const parsed = JSON.parse(saved);
        setCredentials(parsed);
      }
    } catch {
      // ignore
    }
  }, [setCredentials]);

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-[#09090d]">
      {/* Top Header: Logo, Interactive Breadcrumbs, Avatar, Branch Dropdown */}
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Workspace: Theme Groups Sidebar + Theme Matrix Grid */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />
        <ThemeMatrix onOpenSettings={() => setIsSettingsOpen(true)} />
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
