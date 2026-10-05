import WorkspaceRouteClient from "./WorkspaceRouteClient";

// Client-only shell: pre-render once on demand so route changes are served from cache instead of rendering per request.
export function generateStaticParams() {
  return [];
}

export default function WorkspaceRoutePage() {
  return <WorkspaceRouteClient />;
}