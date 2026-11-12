const baseUrl = (process.env.MCP_BASE_URL || "").replace(/\/$/, "");
const token = process.env.MCP_TEST_TOKEN;

if (!baseUrl || !token) {
  console.error("Set MCP_BASE_URL and MCP_TEST_TOKEN before running MCP conformance.");
  process.exit(2);
}

const endpoint = `${baseUrl}/api/v1/mcp`;
const headers = {
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
};

async function getJson(url, init) {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return body;
}

const health = await getJson(`${baseUrl}/api/v1/mcp/health`);
if (health.status !== "ok" || health.capabilities.writeEnabled !== false) {
  throw new Error("MCP health contract is not read-only and healthy.");
}

const initialize = await getJson(endpoint, {
  method: "POST",
  headers,
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "second-screen-conformance", version: "1.0.0" },
    },
  }),
});
if (initialize.result?.serverInfo?.name !== "second-screen-mcp") {
  throw new Error("MCP initialize response is invalid.");
}

const tools = await getJson(endpoint, {
  method: "POST",
  headers,
  body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
});
const names = (tools.result?.tools || []).map((tool) => tool.name).sort();
  const expected = [
  "check_color_contrast",
  "export_tokens_code",
  "get_documentation_pages",
  "get_themes_matrix",
  "get_project_overview",
  "get_token_details",
  "inspect_figma_variables",
  "list_branches",
  "list_token_sets",
  "list_workspaces",
  "search_tokens",
  "search_project_assets",
  "validate_tokens",
].sort();
if (JSON.stringify(names) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected MCP tool registry: ${names.join(", ")}`);
}
if (names.some((name) => /write|update|delete|push|publish/i.test(name))) {
  throw new Error("A write-capable MCP tool was advertised.");
}

console.log(JSON.stringify({
  status: "passed",
  server: health.server,
  serverVersion: health.serverVersion,
  tools: names,
}, null, 2));
