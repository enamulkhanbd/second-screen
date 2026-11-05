import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTokenStore } from "@/store/useTokenStore";

describe("Token Store Performance & Batch Actions (WS1 / WS2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTokenStore.setState({
      rawTokens: {
        global: {
          color: {
            primary: { value: "#3b82f6", type: "color", description: "Brand blue" },
            secondary: { value: "#10b981", type: "color", description: "Accent green" },
          },
        },
      },
      resolvedTokens: [],
      currentOrg: { id: "org-perf-1", name: "Perf Org", slug: "perf-org", role: "owner" } as any,
      currentProject: {
        id: "proj-perf-1",
        orgId: "org-perf-1",
        name: "Perf Project",
        slug: "perf-proj",
        activeBranch: "main",
        rawTokens: {},
      } as any,
      branches: [
        {
          id: "branch-1",
          name: "main",
          title: "Main",
          rawTokens: {},
          themeGroups: [],
          updatedAt: new Date().toISOString(),
          commits: [],
        },
      ] as any,
      activeBranch: "main",
    });
  });

  it("duplicateTokensBatch duplicates multiple tokens in a single batch pass", () => {
    const { duplicateTokensBatch } = useTokenStore.getState();

    duplicateTokensBatch([
      {
        setName: "global",
        tokenPath: ["color", "primary"],
        newPath: ["color", "primary-copy"],
      },
      {
        setName: "global",
        tokenPath: ["color", "secondary"],
        newPath: ["color", "secondary-copy"],
      },
    ]);

    const updatedRaw = useTokenStore.getState().rawTokens;
    expect(updatedRaw.global?.color?.["primary-copy"]).toBeDefined();
    expect(updatedRaw.global?.color?.["primary-copy"]?.value).toBe("#3b82f6");
    expect(updatedRaw.global?.color?.["secondary-copy"]).toBeDefined();
    expect(updatedRaw.global?.color?.["secondary-copy"]?.value).toBe("#10b981");
  });

  it("moveTokensBatch moves multiple tokens to target set in a single batch pass", () => {
    const { moveTokensBatch } = useTokenStore.getState();

    moveTokensBatch([
      {
        sourceSet: "global",
        targetSet: "brand",
        tokenPath: ["color", "primary"],
        tokenLeaf: {
          value: "#3b82f6",
          type: "color",
          description: "Moved brand blue",
        },
      },
    ]);

    const updatedRaw = useTokenStore.getState().rawTokens;
    // Removed from source
    expect(updatedRaw.global?.color?.primary).toBeUndefined();
    // Added to target
    expect(updatedRaw.brand?.color?.primary).toBeDefined();
    expect(updatedRaw.brand?.color?.primary?.value).toBe("#3b82f6");
    expect(updatedRaw.brand?.color?.primary?.description).toBe("Moved brand blue");
  });
});

