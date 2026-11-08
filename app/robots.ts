import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/docs/", "/connect", "/api/v1/schemas"],
      disallow: ["/api/auth/", "/api/organizations/", "/api/projects/", "/api/invitations/"],
    },
  };
}

