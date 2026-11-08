"use client";

import React, { useState, useEffect, useRef, startTransition } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SecondarySidebar } from "@/components/SecondarySidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { DashboardView } from "@/components/DashboardView";
import { AcceptInviteModal } from "@/components/AcceptInviteModal";
import { ToastContainer } from "@/components/Toast";
import { useTokenStore } from "@/store/useTokenStore";
import { Project } from "@/types/tenant";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { WorkspaceSkeleton, type WorkspaceSkeletonVariant } from "@/components/WorkspaceSkeleton";
import { useShallow } from "zustand/react/shallow";

function WorkspaceLoading({ variant = "form" }: { variant?: WorkspaceSkeletonVariant }) {
  return <WorkspaceSkeleton variant={variant} />;
}

const TokensWorkspace = dynamic(
  () => import("@/components/TokensWorkspace").then((module) => module.TokensWorkspace),
  { ssr: false, loading: () => <WorkspaceLoading variant="table" /> }
);
const ThemeMatrix = dynamic(
  () => import("@/components/ThemeMatrix").then((module) => module.ThemeMatrix),
  { ssr: false, loading: () => <WorkspaceLoading variant="table" /> }
);
const WorkspacesProjectsView = dynamic(
  () => import("@/components/WorkspacesProjectsView").then((module) => module.WorkspacesProjectsView),
  { ssr: false, loading: () => <WorkspaceLoading variant="cards" /> }
);
const WorkspacesListView = dynamic(
  () => import("@/components/WorkspacesListView").then((module) => module.WorkspacesListView),
  { ssr: false, loading: () => <WorkspaceLoading variant="list" /> }
);
const VariablesView = dynamic(
  () => import("@/components/VariablesView").then((module) => module.VariablesView),
  { ssr: false, loading: () => <WorkspaceLoading variant="table" /> }
);
const ProjectSettingsView = dynamic(
  () => import("@/components/ProjectSettingsView").then((module) => module.ProjectSettingsView),
  { ssr: false, loading: () => <WorkspaceLoading /> }
);
const OnboardingWizardModal = dynamic(
  () => import("@/components/OnboardingWizardModal").then((module) => module.OnboardingWizardModal),
  { ssr: false }
);
const CredentialsModal = dynamic(
  () => import("@/components/CredentialsModal").then((module) => module.CredentialsModal),
  { ssr: false }
);
const AuthGatewayView = dynamic(
  () => import("@/components/AuthGatewayView").then((module) => module.AuthGatewayView),
  {
    ssr: false,
    loading: () => (
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading sign in…</span>
      </main>
    ),
  }
);

const ReleasesWorkspace = dynamic(
  () => import("@/components/ReleasesWorkspace").then((module) => module.ReleasesWorkspace),
  { ssr: false, loading: () => <WorkspaceLoading variant="list" /> }
);
const DocumentationView = dynamic(
  () => import("@/components/DocumentationView").then((module) => module.DocumentationView),
  { ssr: false, loading: () => <WorkspaceLoading variant="documentation" /> }
);
const AssetsView = dynamic(
  () => import("@/components/AssetsView").then((module) => module.AssetsView),
  { ssr: false, loading: () => <WorkspaceLoading variant="cards" /> }
);
const ExportsView = dynamic(
  () => import("@/components/ExportsView").then((module) => module.ExportsView),
  { ssr: false, loading: () => <WorkspaceLoading variant="list" /> }
);
const BranchesView = dynamic(
  () => import("@/components/BranchesView").then((module) => module.BranchesView),
  { ssr: false, loading: () => <WorkspaceLoading variant="list" /> }
);
const McpCliView = dynamic(
  () => import("@/components/McpCliView").then((module) => module.McpCliView),
  { ssr: false, loading: () => <WorkspaceLoading /> }
);
const MembersView = dynamic(
  () => import("@/components/MembersView").then((module) => module.MembersView),
  { ssr: false, loading: () => <WorkspaceLoading variant="list" /> }
);
const OrgSettingsView = dynamic(
  () => import("@/components/OrgSettingsView").then((module) => module.OrgSettingsView),
  { ssr: false, loading: () => <WorkspaceLoading /> }
);
const ExtensionsView = dynamic(
  () => import("@/components/ExtensionsView").then((module) => module.ExtensionsView),
  { ssr: false, loading: () => <WorkspaceLoading variant="cards" /> }
);
const SystemChangelogView = dynamic(
  () => import("@/components/SystemChangelogView").then((module) => module.SystemChangelogView),
  { ssr: false, loading: () => <WorkspaceLoading variant="list" /> }
);
const SystemDocsView = dynamic(
  () => import("@/components/SystemDocsView").then((module) => module.SystemDocsView),
  { ssr: false, loading: () => <WorkspaceLoading variant="documentation" /> }
);

function getProjectLoadingVariant(tab: string): WorkspaceSkeletonVariant {
  switch (tab) {
    case "assets":
    case "extensions":
      return "cards";
    case "documentation":
    case "system-docs":
      return "documentation";
    case "tokens":
    case "themes":
    case "variables":
      return "table";
    case "branches":
    case "exports":
    case "members":
    case "releases":
    case "changelog":
      return "list";
    default:
      return "form";
  }
}

const WORKSPACE_ROUTE_TO_TAB = {
  overview: "dashboard",
  projects: "projects",
  members: "members",
  settings: "org-settings",
} as const;

const WORKSPACE_TAB_TO_ROUTE = {
  dashboard: "overview",
  projects: "projects",
  members: "members",
  "org-settings": "settings",
} as const;
type WorkspaceNavigationTab = keyof typeof WORKSPACE_TAB_TO_ROUTE;

const PROJECT_ROUTE_TABS = new Set([
  "variables",
  "tokens",
  "themes",
  "branches",
  "documentation",
  "assets",
  "exports",
  "releases",
  "mcp",
  "project-settings",
  "changelog",
  "extensions",
  "system-docs",
]);

const ONBOARDING_DISMISSED_KEY = "ts_onboarding_dismissed";

export default function Home() {
  const pathname = usePathname();
  const router = useRouter();
  const pathSegments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  const workspaceSlug = pathSegments[0] ?? null;
  const routeSegments = pathSegments.slice(1);
  const routeSegmentCount = routeSegments.length;
  const routePartOne = routeSegments[0] ?? null;
  const routePartTwo = routeSegments[1] ?? null;
  const workspaceRouteTab =
    routeSegmentCount === 1 && routePartOne
      ? WORKSPACE_ROUTE_TO_TAB[routePartOne as keyof typeof WORKSPACE_ROUTE_TO_TAB] ?? null
      : null;
  const projectSlug = routeSegmentCount === 2 ? routePartOne : null;
  const routeTab = routeSegmentCount === 2 ? routePartTwo : null;
  const pendingRoutePath = useRef(workspaceSlug ? pathname : null);
  const previousPathname = useRef(pathname);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWizardDismissed, setIsWizardDismissed] = useState(false);

  // Honor an earlier dismissal so the setup modal doesn't reappear on every reload.
  useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "1") {
        setIsWizardDismissed(true);
      }
    } catch { }
  }, []);

  const dismissOnboardingWizard = () => {
    setIsWizardDismissed(true);
    try {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
    } catch { }
  };
  const [isPrimaryNavOpen, setIsPrimaryNavOpen] = useState(false);
  const [isContextNavOpen, setIsContextNavOpen] = useState(false);
  const {
    initializeFromStorage,
    sidebarTab,
    currentUser,
    currentOrg,
    currentProject,
    syncTargetProject,
    setSyncTargetProject,
    setProjectSettingsTab,
    isLoadingTenant,
    isLoadingProjects,
    isLoadingProjectData,
    userOrgs,
    orgProjects,
    pendingInvitePrompt,
    setCurrentOrg,
    setCurrentProject,
    setSidebarTab,
  } = useTokenStore(
    useShallow((state) => ({
      initializeFromStorage: state.initializeFromStorage,
      sidebarTab: state.sidebarTab,
      currentUser: state.currentUser,
      currentOrg: state.currentOrg,
      currentProject: state.currentProject,
      syncTargetProject: state.syncTargetProject,
      setSyncTargetProject: state.setSyncTargetProject,
      setProjectSettingsTab: state.setProjectSettingsTab,
      isLoadingTenant: state.isLoadingTenant,
      isLoadingProjects: state.isLoadingProjects,
      isLoadingProjectData: state.isLoadingProjectData,
      userOrgs: state.userOrgs,
      orgProjects: state.orgProjects,
      pendingInvitePrompt: state.pendingInvitePrompt,
      setCurrentOrg: state.setCurrentOrg,
      setCurrentProject: state.setCurrentProject,
      setSidebarTab: state.setSidebarTab,
    }))
  );

  const navigateToWorkspaceTab = (tab: WorkspaceNavigationTab) => {
    const targetPath = currentOrg
      ? `/${encodeURIComponent(currentOrg.slug)}/${WORKSPACE_TAB_TO_ROUTE[tab]}`
      : null;

    if (targetPath && targetPath !== pathname) {
      pendingRoutePath.current = targetPath;
    }
    startTransition(() => {
      setCurrentProject(null);
      setSidebarTab(tab);
    });

    if (targetPath && targetPath !== pathname) {
      router.push(targetPath);
    }
  };

  const navigateToProject = (project: Project) => {
    if (!currentOrg || project.orgId !== currentOrg.id) return;

    const targetTab = sidebarTab !== "project-settings" && PROJECT_ROUTE_TABS.has(sidebarTab)
      ? sidebarTab
      : "tokens";
    const targetPath = `/${encodeURIComponent(currentOrg.slug)}/${encodeURIComponent(project.slug)}/${targetTab}`;
    if (targetPath !== pathname) {
      pendingRoutePath.current = targetPath;
    }

    startTransition(() => {
      setCurrentProject(project);
      setSidebarTab(targetTab);
    });

    if (targetPath !== pathname) {
      router.push(targetPath);
    }
  };

  const navigateToProjectSettings = (project: Project, tab: "details" | "sync" = "details") => {
    if (!currentOrg || project.orgId !== currentOrg.id) return;

    const targetPath = `/${encodeURIComponent(currentOrg.slug)}/${encodeURIComponent(project.slug)}/project-settings`;
    if (targetPath !== pathname) {
      pendingRoutePath.current = targetPath;
    }

    startTransition(() => {
      setSidebarTab("project-settings");
      setSyncTargetProject(project);
      setCurrentProject(project, { skipHydration: true });
      setProjectSettingsTab(tab);
    });

    if (targetPath !== pathname) {
      router.push(targetPath);
    }
  };

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      pendingRoutePath.current = workspaceSlug ? pathname : null;
    }

    if (pendingRoutePath.current !== pathname) return;

    // When on root route "/", show Workspaces list without redirecting
    if (pathname === "/") {
      if (sidebarTab !== "workspaces") {
        setSidebarTab("workspaces");
      }
      if (currentProject) {
        setCurrentProject(null);
      }
      pendingRoutePath.current = null;
      return;
    }

    if (!workspaceSlug) return;
    if (!currentUser || isLoadingTenant) return;

    const matchingOrg = userOrgs.find((org) => org.slug === workspaceSlug);
    if (!matchingOrg) {
      router.replace("/");
      return;
    }

    const workspacePath = `/${encodeURIComponent(matchingOrg.slug)}`;
    const overviewPath = `${workspacePath}/overview`;

    if (currentOrg?.id !== matchingOrg.id) {
      void setCurrentOrg(matchingOrg);
      return;
    }

    if (routeSegmentCount === 0) {
      if (currentProject) setCurrentProject(null);
      if (sidebarTab !== "dashboard") setSidebarTab("dashboard");
      if (pathname !== overviewPath) {
        router.replace(overviewPath);
        return;
      }
      pendingRoutePath.current = null;
      return;
    }

    if (routeSegmentCount === 1) {
      if (!workspaceRouteTab) {
        router.replace(overviewPath);
        return;
      }

      if (currentProject) setCurrentProject(null);
      if (sidebarTab !== workspaceRouteTab) {
        setSidebarTab(workspaceRouteTab);
        return;
      }

      pendingRoutePath.current = null;
      return;
    }

    if (routeSegmentCount !== 2 || !projectSlug || !routeTab) {
      router.replace(overviewPath);
      return;
    }

    const legacyWorkspacePath =
      WORKSPACE_TAB_TO_ROUTE[routeTab as keyof typeof WORKSPACE_TAB_TO_ROUTE];
    if (legacyWorkspacePath) {
      router.replace(`${workspacePath}/${legacyWorkspacePath}`);
      return;
    }

    if (!PROJECT_ROUTE_TABS.has(routeTab)) {
      router.replace(overviewPath);
      return;
    }

    if (isLoadingProjects) return;

    const matchingProject = orgProjects.find((project) => project.slug === projectSlug);
    if (!matchingProject) {
      router.replace(overviewPath);
      return;
    }

    const isProjectChanging = currentProject?.id !== matchingProject.id;
    const isTabChanging = sidebarTab !== routeTab;

    if (routeTab === "project-settings") {
      setSyncTargetProject(matchingProject);
    }

    if (isProjectChanging) {
      setCurrentProject(matchingProject, { skipHydration: routeTab === "project-settings" });
    }

    if (isTabChanging) {
      setSidebarTab(routeTab as typeof sidebarTab);
    }

    if (isProjectChanging || isTabChanging) {
      return;
    }

    pendingRoutePath.current = null;
  }, [
    currentProject?.id,
    currentOrg?.id,
    isLoadingProjects,
    isLoadingTenant,
    orgProjects,
    pathname,
    projectSlug,
    routeTab,
    routePartOne,
    routePartTwo,
    routeSegmentCount,
    router,
    setCurrentOrg,
    setCurrentProject,
    setSidebarTab,
    sidebarTab,
    currentUser,
    userOrgs,
    workspaceSlug,
    workspaceRouteTab,
  ]);

  useEffect(() => {
    if (!currentUser || isLoadingTenant || pendingRoutePath.current !== null) return;

    // When on root route "/", do not redirect to an org overview
    if (pathname === "/") {
      if (sidebarTab !== "workspaces") {
        setSidebarTab("workspaces");
      }
      return;
    }

    if (sidebarTab === "workspaces") {
      if (pathname !== "/") router.push("/");
      return;
    }

    if (!currentOrg) return;

    const workspaceRoute =
      WORKSPACE_TAB_TO_ROUTE[sidebarTab as keyof typeof WORKSPACE_TAB_TO_ROUTE];
    const projectForRoute = currentProject || syncTargetProject;
    const targetPath = workspaceRoute
      ? `/${encodeURIComponent(currentOrg.slug)}/${workspaceRoute}`
      : projectForRoute
        ? `/${encodeURIComponent(currentOrg.slug)}/${encodeURIComponent(projectForRoute.slug)}/${sidebarTab}`
        : null;

    if (!targetPath) {
      return;
    }

    if (targetPath === pathname) return;

    if (pathname === "/") {
      router.replace(targetPath);
    } else {
      router.push(targetPath);
    }
  }, [
    currentOrg,
    currentProject,
    syncTargetProject,
    currentUser,
    isLoadingTenant,
    pathname,
    router,
    sidebarTab,
  ]);

  useEffect(() => {
    // Restore tokens, theme matrix, and credentials securely from client storage on reload
    initializeFromStorage();
  }, [initializeFromStorage]);

  useEffect(() => {
    // Pre-warm primary studio workspace bundles during browser idle time so tab switching is instant
    if (!currentUser || isLoadingTenant || typeof window === "undefined") return;
    const warmChunks = () => {
      void import("@/components/TokensWorkspace");
      void import("@/components/ThemeMatrix");
      void import("@/components/VariablesView");
      void import("@/components/ExportsView");
      void import("@/components/WorkspacesProjectsView");
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warmChunks, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(warmChunks, 600);
    return () => clearTimeout(timer);
  }, [currentUser, isLoadingTenant]);

  useEffect(() => {
    setIsPrimaryNavOpen(false);
    setIsContextNavOpen(false);
  }, [sidebarTab]);

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
      <div className="min-h-screen bg-background text-foreground">
        <AuthGatewayView />
        <AcceptInviteModal />
        <ToastContainer />
      </div>
    );
  }

  // Loading Screen while resolving authentication & tenancy
  if (isLoadingTenant) {
    return (
      <main id="main-content" tabIndex={-1} className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground space-y-3 select-none font-sans">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center motion-safe:animate-pulse">
          <div className="w-5 h-5 rounded-md bg-primary" />
        </div>
        <span className="text-xs font-mono text-muted-foreground motion-safe:animate-pulse" role="status">
          Loading Tokens Platform…
        </span>
      </main>
    );
  }

  const isWorkspacesView = sidebarTab === "workspaces" || pathname === "/";

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* 1. Primary Navigation Sidebar - Full height to top */}
      {!isWorkspacesView && (
        <>
          <div className="hidden lg:flex h-full flex-shrink-0">
            <Sidebar
              onOpenSettings={() => setIsSettingsOpen(true)}
              onNavigateWorkspaceTab={navigateToWorkspaceTab}
              onSelectProject={navigateToProject}
            />
          </div>

          <Sheet open={isPrimaryNavOpen} onOpenChange={setIsPrimaryNavOpen}>
            <SheetContent
              side="left"
              className="p-0 lg:hidden"
              style={{ width: "min(20rem, calc(100vw - 2rem))" }}
            >
              <SheetTitle className="sr-only">Primary navigation</SheetTitle>
              <Sidebar
                mode="drawer"
                className="border-r-0 pt-10"
                onOpenSettings={() => setIsSettingsOpen(true)}
                onNavigateWorkspaceTab={navigateToWorkspaceTab}
                onSelectProject={navigateToProject}
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

        {/* Main Workspace (skip-link target) */}
        <main id="main-content" tabIndex={-1} className="flex-1 flex overflow-hidden focus:outline-none">

          {/* 2. Secondary Contextual Sidebar (for Tokens Sets Tree & Themes Mode Groups when in studio) */}
          {(sidebarTab === "tokens" || sidebarTab === "themes") && (
            <>
              <div className="hidden xl:flex h-full">
                <SecondarySidebar />
              </div>
              <Sheet open={isContextNavOpen} onOpenChange={setIsContextNavOpen}>
                <SheetContent
                  side="left"
                  className="p-0 xl:hidden"
                  style={{ width: "min(20rem, calc(100vw - 2rem))" }}
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
          {isWorkspacesView ? (
            <WorkspacesListView />
          ) : isLoadingProjectData && sidebarTab !== "project-settings" ? (
            <WorkspaceLoading variant={getProjectLoadingVariant(sidebarTab)} />
          ) : sidebarTab === "dashboard" ? (
            <DashboardView />
          ) : sidebarTab === "projects" ? (
            <WorkspacesProjectsView
              onSelectProject={navigateToProject}
              onOpenProjectSettings={navigateToProjectSettings}
            />
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
        </main>
      </div>

      {/* Onboarding Wizard Modal for fresh accounts */}
      <OnboardingWizardModal
        isOpen={showOnboardingWizard}
        onClose={dismissOnboardingWizard}
      />

      {/* Accept Team Invitation Modal for invited members */}
      <AcceptInviteModal />

      {/* Settings Modal & Toast Notifications */}
      <CredentialsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <CommandPalette />
      <ToastContainer />
    </div>
  );
}
