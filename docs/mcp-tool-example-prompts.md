# Second Screen MCP Tool Example Prompts

This guide contains practical prompts for using the 14 read-only Second Screen MCP tools from Cursor, VS Code, or another MCP-compatible IDE.

## MCP endpoint

```text
https://tokensplatform.enamulkhan.com/api/v1/mcp
```

These examples assume that the IDE is connected with a project-bound read-only MCP token. They do not modify tokens, branches, assets, documentation, or project settings.

## 1. `list_workspaces`

> List all workspaces and projects available through my current Second Screen MCP credential. For each workspace, show its name, slug, ID, and the projects I can access. Keep the response concise.

## 2. `get_project_overview`

> Give me an overview of the currently connected Second Screen project. Include the project name and ID, active branch, number of branches, number of theme groups, total token count, last updated time, and archive status.

## 3. `list_token_sets`

> List every token set in the current project. For each set, show its name and token count, then identify the largest three token sets.

## 4. `get_themes_matrix`

> Inspect the current project's theme matrix. Show every theme group, each mode or option in the group, and which token sets are enabled, disabled, or used as source sets for each mode. Highlight any mode that has no enabled token set.

## 5. `search_tokens`

> Search the current project for tokens related to `button` and `surface`. Return the token path, token set, type, raw value, resolved value, alias status, and description. Limit the response to 25 results and tell me if more results are available.

## 6. `get_token_details`

> Get the complete details for the token `color.text.primary`. Show its token set, type, raw value, resolved value, resolved color if available, alias target, description, deprecation information, and any theme-specific differences you can identify.

## 7. `get_token_usage`

> Analyze usage for the token `color.brand.primary`. Show its resolved value, the tokens it directly depends on, the tokens that directly depend on it, and the dependency and dependent counts. Point out whether the token appears to be a shared foundation token.

## 8. `validate_tokens`

> Validate all tokens in the current project. Check for missing or unclear token types, missing alias targets, cyclic aliases, and deprecated tokens. Summarize the issues by category and list the affected token paths. Do not change anything.

## 9. `list_branches`

> List the current project's native token branches. For each branch, show its name, whether it is the default branch, whether it is active, its last update time, and up to five recent commits. Do not make any branch changes.

## 10. `inspect_figma_variables`

> Inspect the Figma variables synchronized to the current project. Summarize the available collections and modes, then list the first 50 variables with their collection, type, raw value, resolved value, alias status, and Figma variable key. If no variables are synchronized, say so clearly.

## 11. `search_project_assets`

> Search the current project's assets for icons related to `navigation`. Return up to 20 matching assets with their name, asset type, format, dimensions, folder, source, URL, and Figma metadata if available. Do not include inline SVG unless I explicitly ask for it.

A prompt for SVG markup:

> Search the current project's assets for the icon named `arrow-right` and include the bounded inline SVG markup if it is available. Do not modify the asset.

## 12. `get_documentation_pages`

> List the current project's documentation pages. Include each page's slug, title, description, publication status, folder, layout, and last updated time. Exclude block content from the initial summary.

A prompt for one page:

> Read the documentation page with slug `foundations/colors`. Summarize its headings, paragraphs, callouts, token tables, and code blocks. Do not modify the documentation.

## 13. `check_color_contrast`

> Check whether `#172033` as foreground on `#FFFFFF` as background passes WCAG AA and AAA for normal and large text. Return the contrast ratio, thresholds, and pass/fail result.

## 14. `export_tokens_code`

> Export the current project's resolved tokens as CSS custom properties. Return the generated code, token count, total token count, and whether the output was truncated. Do not write the output to the repository.

A SCSS example:

> Export the current project's resolved tokens as SCSS variables. Limit the response to 200 tokens and clearly identify whether the result is truncated.

## Useful combined prompts

### Design-token audit

> Run a read-only design-token audit for the current project. First inspect the project overview and theme matrix, then validate tokens, search for deprecated tokens, and inspect usage for the three most important brand tokens. Summarize the highest-risk findings and do not modify anything.

### Theme implementation review

> Review the current project's theme setup. Use the themes matrix, token sets, token search, and color contrast checks to identify missing theme mappings or text/background combinations that may fail WCAG AA. Return actionable findings only; do not change project data.

### Developer handoff

> Prepare a developer handoff for the current project. Include the active and default branches, token-set summary, theme modes, documentation pages, relevant project assets, and a CSS export of the resolved tokens. Keep all results read-only and label any truncated output.

## Safety reminders

- These tools are read-only in the current Release 1 deployment.
- Do not paste the MCP bearer token into prompts or source files.
- Use a project-bound token with the `read:tokens` scope.
- Treat exported token values and asset URLs as project data.
- Ask the MCP client to use a smaller `limit` when a response is truncated.
- For destructive or mutating work, use the normal Second Screen application workflow rather than an MCP prompt.
