import { cache } from "react";
import { getPublishedProjectDocs } from "@/services/organizationService";
import { PublicDocsReaderClient } from "@/components/docs/PublicDocsReaderClient";
import type { Metadata } from "next";

export const revalidate = 300; // ISR cache for 5 minutes

const getCachedPublishedProjectDocs = cache(getPublishedProjectDocs);

interface PublicDocsReaderPageProps {
  params: {
    orgSlug: string;
    projectSlug: string;
  };
}

export async function generateMetadata({
  params,
}: PublicDocsReaderPageProps): Promise<Metadata> {
  const result = await getCachedPublishedProjectDocs(params.orgSlug, params.projectSlug);
  if (!result) {
    return {
      title: "Documentation Unavailable | Second Screen",
    };
  }
  return {
    title: `${result.projectName} Documentation | ${result.orgName}`,
    description: `Living design system documentation for ${result.projectName}`,
  };
}

export default async function PublicDocsReaderPage({
  params,
}: PublicDocsReaderPageProps) {
  const initialData = await getCachedPublishedProjectDocs(params.orgSlug, params.projectSlug);

  return (
    <PublicDocsReaderClient
      initialData={initialData}
      orgSlug={params.orgSlug}
      projectSlug={params.projectSlug}
    />
  );
}
