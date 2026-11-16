import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockOrg = {
  id: "org-mock-1",
  name: "Mock Acme Org",
  slug: "mock-acme",
  owner_uid: "user-mock-1",
  updated_at: "2026-11-12T00:00:00.000Z",
};

const mockProject = {
  id: "proj-mock-1",
  org_id: "org-mock-1",
  name: "Mock Design System",
  slug: "mock-design-system",
  description: "End-to-end mock design system for MCP verification",
  raw_tokens: {
    core: {
      color: {
        brand: {
          "500": {
            $type: "color",
            $value: "#3b82f6",
            $description: "Primary brand blue",
          },
        },
        neutral: {
          "50": { $type: "color", $value: "#f9fafb" },
          "900": { $type: "color", $value: "#111827" },
        },
      },
      spacing: {
        md: { $type: "dimension", $value: "16px", $description: "Base spacing" },
      },
      shadow: {
        bottom: {
          lg: {
            $type: "boxShadow",
            $value: { x: "0", y: "10", blur: "10", type: "dropShadow", color: "{color.brand.500}" },
          },
        },
      },
      focusRing: {
        border: {
          $type: "border",
          $value: { color: "{color.brand.500}", width: "2px", style: "solid" },
        },
      },
    },
    "semantic/light": {
      bg: {
        primary: { $type: "color", $value: "{color.neutral.50}" },
        brand: { $type: "color", $value: "{color.brand.500}" },
      },
      text: {
        primary: { $type: "color", $value: "{color.neutral.900}" },
      },
    },
    "semantic/dark": {
      bg: {
        primary: { $type: "color", $value: "{color.neutral.900}" },
      },
      text: {
        primary: { $type: "color", $value: "{color.neutral.50}" },
      },
    },
  },
  theme_groups: [
    {
      id: "theme",
      name: "Theme",
      options: [
        {
          id: "light",
          name: "Light",
          selectedTokenSets: {
            core: "source",
            "semantic/light": "enabled",
            "semantic/dark": "disabled",
          },
        },
        {
          id: "dark",
          name: "Dark",
          selectedTokenSets: {
            core: "source",
            "semantic/light": "disabled",
            "semantic/dark": "enabled",
          },
        },
      ],
    },
  ],
  enabled_schemas: ["color", "dimension", "srgb"],
  compiler_config: {},
  figma_variables: {
    Primitives: {
      color: {
        brand: {
          "500": { $type: "color", $value: "#3b82f6" },
        },
      },
    },
  },
  extra_data: {
    figmaMeta: {
      figmaUpdatedAt: "2026-11-10T10:00:00.000Z",
    },
  },
  documentation: {
    isPublishedGlobally: true,
    publishedUrlSlug: "mock-docs",
    folders: [{ id: "folder-1", name: "Foundations" }],
    pages: [
      {
        id: "page-colors",
        slug: "colors",
        title: "Color System",
        description: "Brand and semantic color usage",
        folderId: "folder-1",
        order: 1,
        layout: "doc",
        isPublished: true,
        updatedAt: "2026-11-11T12:00:00.000Z",
        blocks: [
          { id: "b1", type: "heading", content: "Color Tokens", settings: { level: 1 } },
          { id: "b2", type: "paragraph", content: "Use semantic tokens for surfaces and text." },
        ],
      },
    ],
  },
  branches: [
    {
      id: "br-main",
      name: "main",
      title: "Main",
      isDefault: true,
      updatedAt: "2026-11-12T00:00:00.000Z",
      commits: [
        {
          sha: "abc123456789",
          message: "Initial mock tokens",
          timestamp: "2026-11-12T00:00:00.000Z",
          authorName: "Mock Author",
        },
      ],
    },
    {
      id: "br-feat",
      name: "feature/tokens-v2",
      title: "Tokens v2",
      isDefault: false,
      updatedAt: "2026-11-11T18:00:00.000Z",
      commits: [],
      rawTokens: {
        core: {
          color: {
            brand: {
              "500": {
                $type: "color",
                $value: "#2563eb",
                $description: "Primary brand blue",
              },
              "600": {
                $type: "color",
                $value: "#1d4ed8",
                $description: "Darker brand blue",
              },
            },
            neutral: {
              "50": { $type: "color", $value: "#f9fafb" },
              "900": { $type: "color", $value: "#111827" },
            },
          },
          spacing: {
            md: { $type: "dimension", $value: "16px", $description: "Base spacing" },
          },
          shadow: {
            bottom: {
              lg: {
                $type: "boxShadow",
                $value: { x: "0", y: "10", blur: "10", type: "dropShadow", color: "{color.brand.500}" },
              },
            },
          },
          focusRing: {
            border: {
              $type: "border",
              $value: { color: "{color.brand.500}", width: "2px", style: "solid" },
            },
          },
        },
        "semantic/light": {
          bg: {
            primary: { $type: "color", $value: "{color.neutral.50}" },
            brand: { $type: "color", $value: "{color.brand.500}" },
          },
          text: {
            primary: { $type: "color", $value: "{color.neutral.900}" },
          },
        },
        "semantic/dark": {
          bg: {
            primary: { $type: "color", $value: "{color.neutral.900}" },
          },
          text: {
            primary: { $type: "color", $value: "{color.neutral.50}" },
          },
        },
      },
    },
  ],
  active_branch: "main",
  updated_at: "2026-11-12T00:00:00.000Z",
  is_archived: false,
};

function createQueryChain(table: string) {
  const rows =
    table === "organizations"
      ? [mockOrg]
      : table === "projects"
        ? [mockProject]
        : table === "organization_members"
          ? [{ org_id: mockOrg.id, user_id: "user-mock-1", role: "owner" }]
          : [];

  const chain: any = {
    select: () => chain,
    eq: () => chain,
    in: () => Promise.resolve({ data: rows, error: null }),
    maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
    then: (resolve: (val: any) => any) => Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return chain;
}

vi.mock("@/utils/auth", () => ({
  resolveTrustedRequestOrigins: vi.fn((req: NextRequest) => [req.nextUrl.origin]),
  authenticateRequest: vi.fn(async () => ({
    isValid: true,
    record: {
      id: "key-mock-1",
      name: "Mock MCP Key",
      keyPrefix: "sec_pat_mock",
      keyHash: "hash-mock-1",
      scopes: ["read:tokens"],
      uid: "user-mock-1",
      credentialType: "mcp_project",
      orgId: "org-mock-1",
      projectId: "proj-mock-1",
      createdAt: "2026-11-12T00:00:00.000Z",
    },
  })),
  authorizeProjectRequest: vi.fn(async () => ({
    authorized: true,
    role: "owner",
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => createQueryChain(table),
  })),
}));

vi.mock("@/lib/r2", () => ({
  loadMetadataIndex: vi.fn(async () => [
    {
      id: "asset-svg-1",
      name: "logo-mark.svg",
      title: "Brand Logo Mark",
      type: "icon",
      assetType: "icon",
      tag: "brand",
      url: "https://cdn.example.com/logo-mark.svg",
      contentType: "image/svg+xml",
      size: 256,
      source: "r2",
      svg: "<svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"10\"/></svg>",
    },
    {
      id: "asset-png-1",
      name: "hero-banner.png",
      title: "Hero Banner",
      type: "image",
      assetType: "image",
      tag: "marketing",
      url: "https://cdn.example.com/hero-banner.png",
      contentType: "image/png",
      size: 20480,
      source: "r2",
    },
  ]),
}));

import { POST } from "../route";
import { authorizeProjectRequest } from "@/utils/auth";

async function rpc(method: string, params: Record<string, unknown> = {}, id = 1) {
  const response = await POST(
    new NextRequest("https://app.example.com/api/v1/mcp", {
      method: "POST",
      headers: {
        authorization: "Bearer sec_pat_mock",
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        origin: "https://app.example.com",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
  );
  const body = await response.json();
  return { status: response.status, body };
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const res = await rpc("tools/call", { name, arguments: args });
  const isError = Boolean(res.body?.result?.isError);
  const text = res.body?.result?.content?.[0]?.text;
  let parsed = null;
  if (text && !isError) {
    parsed = JSON.parse(text);
  }
  return { ...res, isError, parsed, rawText: text };
}

describe("MCP end-to-end mock project integration", () => {
  it("lists all 17 read-only tools", async () => {
    const { status, body } = await rpc("tools/list");
    expect(status).toBe(200);
    const names = (body.result?.tools || []).map((t: any) => t.name).sort();
    expect(names).toEqual([
      "check_color_contrast",
      "compare_branches",
      "compare_token_themes",
      "export_tokens_code",
      "get_documentation_pages",
      "get_project_overview",
      "get_project_schemas",
      "get_themes_matrix",
      "get_token_details",
      "get_token_usage",
      "inspect_figma_variables",
      "list_branches",
      "list_token_sets",
      "list_workspaces",
      "search_project_assets",
      "search_tokens",
      "validate_tokens",
    ]);
  });

  it("exercises all 17 MCP tools against the mock project", async () => {
    // 1. list_workspaces
    const workspaces = await callTool("list_workspaces");
    expect(workspaces.status).toBe(200);
    expect(workspaces.isError).toBe(false);
    expect(workspaces.parsed.data).toHaveLength(1);
    expect(workspaces.parsed.data[0].projects[0].id).toBe("proj-mock-1");

    // 2. get_project_overview
    const overview = await callTool("get_project_overview");
    expect(overview.isError).toBe(false);
    expect(overview.parsed.data.name).toBe("Mock Design System");
    expect(overview.parsed.data.activeBranch).toBe("main");
    expect(overview.parsed.data.tokenCount).toBeGreaterThanOrEqual(7);

    // 3. list_token_sets
    const sets = await callTool("list_token_sets");
    expect(sets.isError).toBe(false);
    expect(sets.parsed.data.items.map((s: any) => s.name)).toContain("core");

    // 4. get_themes_matrix
    const themes = await callTool("get_themes_matrix");
    expect(themes.isError).toBe(false);
    expect(themes.parsed.data.groups[0].options.map((o: any) => o.id)).toEqual(["light", "dark"]);

    // 5. search_tokens (with pagination)
    const searchPage1 = await callTool("search_tokens", { query: "color", limit: 2 });
    expect(searchPage1.isError).toBe(false);
    expect(searchPage1.parsed.data.items).toHaveLength(2);
    expect(searchPage1.parsed.data.hasMore).toBe(true);
    const searchPage2 = await callTool("search_tokens", {
      query: "color",
      limit: 2,
      cursor: searchPage1.parsed.data.nextCursor,
    });
    expect(searchPage2.isError).toBe(false);
    expect(searchPage2.parsed.data.items.length).toBeGreaterThan(0);

    // 6. get_token_details (theme-aware alias resolution)
    const lightBg = await callTool("get_token_details", {
      tokenPath: "bg.primary",
      themeOptionIds: { theme: "light" },
    });
    expect(lightBg.isError).toBe(false);
    expect(lightBg.parsed.data.isAlias).toBe(true);
    expect(lightBg.parsed.data.resolvedHex.toLowerCase()).toBe("#f9fafb");

    const darkBg = await callTool("get_token_details", {
      tokenPath: "bg.primary",
      themeOptionIds: { theme: "dark" },
    });
    expect(darkBg.isError).toBe(false);
    expect(darkBg.parsed.data.resolvedHex.toLowerCase()).toBe("#111827");

    // 7. get_token_usage
    const usage = await callTool("get_token_usage", { tokenPath: "color.brand.500" });
    expect(usage.isError).toBe(false);
    expect(usage.parsed.data.dependents.length).toBeGreaterThanOrEqual(1);

    // 8. validate_tokens (including composite boxShadow/border alias references)
    const validation = await callTool("validate_tokens");
    expect(validation.isError).toBe(false);
    expect(validation.parsed.data.valid).toBe(true);
    expect(validation.parsed.data.missingAliases).toEqual([]);

    const shadowDetails = await callTool("get_token_details", { tokenPath: "shadow.bottom.lg" });
    expect(shadowDetails.isError).toBe(false);
    expect(shadowDetails.parsed.data.isAlias).toBe(true);
    expect(shadowDetails.parsed.data.aliasTarget).toBe("color.brand.500");
    expect(shadowDetails.parsed.data.resolvedValue).toContain("#3b82f6");

    // 9. list_branches
    const branches = await callTool("list_branches");
    expect(branches.isError).toBe(false);
    expect(branches.parsed.data.items).toHaveLength(2);
    expect(branches.parsed.data.items[0].isDefault).toBe(true);

    // 10. inspect_figma_variables
    const figma = await callTool("inspect_figma_variables", { query: "brand" });
    expect(figma.isError).toBe(false);
    expect(figma.parsed.data.variables).toHaveLength(1);

    // 11. search_project_assets
    const assets = await callTool("search_project_assets", { query: "logo", includeSvg: true });
    expect(assets.isError).toBe(false);
    expect(assets.parsed.data.items).toHaveLength(1);
    expect(assets.parsed.data.items[0].svg).toContain("<svg");

    // 12. get_documentation_pages
    const docs = await callTool("get_documentation_pages", { slug: "colors" });
    expect(docs.isError).toBe(false);
    expect(docs.parsed.data.pages).toHaveLength(1);
    expect(docs.parsed.data.pages[0].title).toBe("Color System");

    // 13. check_color_contrast
    const contrast = await callTool("check_color_contrast", {
      foreground: "#111827",
      background: "#f9fafb",
      level: "AA",
      size: "normal",
    });
    expect(contrast.isError).toBe(false);
    expect(contrast.parsed.data.passes).toBe(true);
    expect(contrast.parsed.data.ratio).toBeGreaterThan(15);

    // 14. export_tokens_code
    const exported = await callTool("export_tokens_code", { format: "css" });
    expect(exported.isError).toBe(false);
    expect(exported.parsed.data.code).toContain("--");

    const exportedTs = await callTool("export_tokens_code", { format: "typescript" });
    expect(exportedTs.isError).toBe(false);
    expect(exportedTs.parsed.data.language).toBe("typescript");
    expect(exportedTs.parsed.data.code).toContain("export const tokens");

    const exportedTailwind = await callTool("export_tokens_code", { format: "tailwind" });
    expect(exportedTailwind.isError).toBe(false);
    expect(exportedTailwind.parsed.data.language).toBe("javascript");
    expect(exportedTailwind.parsed.data.code).toContain("tailwindcss");

    const exportedFlutter = await callTool("export_tokens_code", { format: "flutter" });
    expect(exportedFlutter.isError).toBe(false);
    expect(exportedFlutter.parsed.data.language).toBe("dart");
    expect(exportedFlutter.parsed.data.code).toContain("class AppColors");

    // 15. Branch-aware & set-filtered search_tokens without query
    const branchBrowse = await callTool("search_tokens", {
      branchName: "feature/tokens-v2",
      setName: "core",
      pathPrefix: "color.brand",
    });
    expect(branchBrowse.isError).toBe(false);
    expect(branchBrowse.parsed.meta.branchId).toBe("br-feat");
    expect(branchBrowse.parsed.data.items.map((t: any) => t.name).sort()).toEqual(["color.brand.500", "color.brand.600"]);
    expect(branchBrowse.parsed.data.items.every((t: any) => t.setName === "core")).toBe(true);

    // Check valuesByThemeOption in get_token_details
    expect(lightBg.parsed.data.valuesByThemeOption).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ groupId: "theme", optionId: "light", resolvedHex: "#f9fafb" }),
        expect.objectContaining({ groupId: "theme", optionId: "dark", resolvedHex: "#111827" }),
      ]),
    );

    // 16. compare_branches
    const branchDiff = await callTool("compare_branches", {
      baseBranch: "main",
      headBranch: "feature/tokens-v2",
    });
    expect(branchDiff.isError).toBe(false);
    expect(branchDiff.parsed.data.baseBranch).toBe("main");
    expect(branchDiff.parsed.data.headBranch).toBe("feature/tokens-v2");
    expect(branchDiff.parsed.data.hasChanges).toBe(true);
    expect(branchDiff.parsed.data.totalAdded).toBe(1);
    expect(branchDiff.parsed.data.totalModified).toBe(1);
    expect(branchDiff.parsed.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "color.brand.500", changeType: "modified", oldValue: "#3b82f6", newValue: "#2563eb" }),
        expect.objectContaining({ name: "color.brand.600", changeType: "added", newValue: "#1d4ed8" }),
      ]),
    );

    // 17. get_project_schemas
    const schemas = await callTool("get_project_schemas");
    expect(schemas.isError).toBe(false);
    expect(schemas.parsed.data.enabledCount).toBe(3);
    expect(schemas.parsed.data.items.map((s: any) => s.id).sort()).toEqual(["color", "dimension", "srgb"]);
    for (const item of schemas.parsed.data.items) {
      expect(item.schemaUrl).toMatch(/^https:\/\/app\.example\.com\/api\/v1\/schemas\//);
      expect(item.schemaUrl).not.toContain("registry.tokens.studio");
    }

    // 18. compare_token_themes
    const themeCompare = await callTool("compare_token_themes", { query: "bg.primary" });
    expect(themeCompare.isError).toBe(false);
    expect(themeCompare.parsed.data.items).toHaveLength(1);
    expect(themeCompare.parsed.data.items[0].modes["theme:light"].resolvedHex.toLowerCase()).toBe("#f9fafb");
    expect(themeCompare.parsed.data.items[0].modes["theme:dark"].resolvedHex.toLowerCase()).toBe("#111827");
  });

  it("returns structured MCP errors for invalid token paths and unknown theme options", async () => {
    const missingToken = await callTool("get_token_details", { tokenPath: "does.not.exist" });
    expect(missingToken.isError).toBe(true);
    expect(missingToken.rawText).toContain("Token not found");

    const badTheme = await callTool("get_token_details", {
      tokenPath: "bg.primary",
      themeOptionIds: { theme: "nonexistent" },
    });
    expect(badTheme.isError).toBe(true);
    expect(badTheme.rawText).toContain("Unknown theme option");

    const missingBranch = await callTool("search_tokens", {
      branchName: "does-not-exist",
    });
    expect(missingBranch.isError).toBe(true);
    expect(missingBranch.rawText).toContain("Branch not found");
  });

  it("allows viewer role to connect, list tools, and execute read-only MCP tools", async () => {
    const mockedAuthorize = vi.mocked(authorizeProjectRequest);
    mockedAuthorize.mockResolvedValue({
      authorized: true,
      role: "viewer",
      record: { uid: "user-viewer-1" } as any,
    });

    const listRes = await rpc("tools/list");
    expect(listRes.status).toBe(200);
    expect(listRes.body.result?.tools?.length).toBe(17);

    const overview = await callTool("get_project_overview");
    expect(overview.status).toBe(200);
    expect(overview.isError).toBe(false);
    expect(overview.parsed.data.name).toBe("Mock Design System");

    const search = await callTool("search_tokens", { query: "brand", limit: 5 });
    expect(search.status).toBe(200);
    expect(search.isError).toBe(false);
    expect(search.parsed.data.items.length).toBeGreaterThan(0);
  });
});
