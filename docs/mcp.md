# Model Context Protocol (MCP) Server: Complete Guide, Architecture & Implementation Plan (`mcp.md`)

এই ডকুমেন্টটি **Second Screen / Tokens Platform**-এর জন্য **Model Context Protocol (MCP)**-এর একটি সম্পূর্ণ A-to-Z গাইড এবং ইঞ্জিনিয়ারিং ইমপ্লিমেন্টেশন প্ল্যান। আপনি যদি আগে কখনো MCP ব্যবহার না-ও করে থাকেন, এই ডকুমেন্টটি পড়লে MCP কী, কেন দরকার, আমাদের সিস্টেমে এটি কীভাবে কাজ করবে, আমরা কীভাবে এটি কোডবেসে ইমপ্লিমেন্ট করব এবং ইমপ্লিমেন্টেশনের পর কীভাবে ব্যবহার করবেন—সবকিছু একদম পরিষ্কার বুঝতে পারবেন।


> **Status: 📝 Planned — NOT implemented yet.** `/api/v1/mcp`, `lib/mcp/*` এবং `@tokens-platform/mcp-server` প্যাকেজ কোডবেসে/npm-এ এখনো নেই। বর্তমানে [`components/McpCliView.tsx`](../components/McpCliView.tsx) যে `npx -y @tokens-platform/mcp-server ...` স্নিপেট ও "MCP v1.0" ব্যাজ দেখায় সেটি কাজ করবে না — Phase 5 শেষ না হওয়া পর্যন্ত UI-তে "Coming soon" দেখানো উচিত।
> **Revision:** এই সংস্করণে কোডবেস রিভিউয়ের P0/P1 ফিক্সগুলো (নিচে **২.৩**) এবং `docs/UX_UI_UPDATE_PLAN.md`-এর সাথে alignment (Workspace শব্দভান্ডার, Developers নেভিগেশন) যুক্ত করা হয়েছে। যেসব দাবি এখনো কোডে যাচাই করা হয়নি সেগুলো **(verify)** চিহ্নিত।

---

## সূচিপত্র (Table of Contents)

1. [Part 1: MCP (Model Context Protocol) কী এবং কেন দরকার? (Beginner to Pro)](#part-1-mcp-model-context-protocol-কী-এবং-কেন-দরকার-beginner-to-pro)
2. [Part 2: আমাদের বর্তমান System Analysis (Codebase Audit & Readiness)](#part-2-আমাদের-বর্তমান-system-analysis-codebase-audit--readiness)
3. [Part 3: আমাদের System-এ MCP কীভাবে কাজ করবে? (Architecture & Data Flow)](#part-3-আমাদের-system-এ-mcp-কীভাবে-কাজ-করবে-architecture--data-flow)
4. [Part 4: Second Screen MCP-তে কী কী Tools, Resources এবং Prompts থাকবে?](#part-4-second-screen-mcp-তে-কী-কী-tools-resources-এবং-prompts-থাকবে)
5. [Part 5: Step-by-Step Implementation Plan (আমরা কীভাবে Implementation করব?)](#part-5-step-by-step-implementation-plan-আমরা-কীভাবে-implementation-করব)
6. [Part 6: After Implementation — কীভাবে Use করতে হবে? (Usage & Prompt Guide)](#part-6-after-implementation--কীভাবে-use-করতে-হবে-usage--prompt-guide)
7. [Part 7: Security, Guardrails & Troubleshooting](#part-7-security-guardrails--troubleshooting)

---

## Part 1: MCP (Model Context Protocol) কী এবং কেন দরকার? (Beginner to Pro)

### ১.১ সহজ ভাষায় MCP কী?
**MCP (Model Context Protocol)** হলো একটি ওপেন স্ট্যান্ডার্ড প্রোটোকল, যেটিকে সহজ ভাষায় **"AI Agent-দের জন্য USB-C Port"** বলা হয়।

* আগে যেমন প্রতিটি ডিভাইসের জন্য আলাদা চার্জার লাগত, আর এখন একটি **USB-C** ক্যাবল দিয়েই ল্যাপটপ, ফোন, মনিটর সব কানেক্ট করা যায়—ঠিক তেমনি **MCP** হলো এমন একটি স্ট্যান্ডার্ড ভাষা (JSON-RPC 2.0 ভিত্তিক), যার মাধ্যমে যেকোনো AI Coding Assistant (যেমন: **Antigravity, Cursor, Claude Desktop, VS Code Copilot, Windsurf, Cline**) সরাসরি আপনার অ্যাপ্লিকেশন বা ডাটাবেসের সাথে কথা বলতে পারে।

### ১.২ MCP ছাড়া কী সমস্যা হয়? বনাম MCP থাকলে কী সুবিধা?

| বিষয় | MCP ছাড়া (Without MCP) | MCP থাকলে (With Second Screen MCP) |
| :--- | :--- | :--- |
| **Token খোঁজা** | ডেভেলপারকে ব্রাউজারে গিয়ে টোকেন খুঁজে কপি করে AI-এর চ্যাটে পেস্ট করতে হয়। | AI নিজেই `search_tokens` টুল কল করে প্রজেক্টের আসল টোকেন (`--bg-brand-solid`) খুঁজে নেয়। |
| **AI Hallucination** | AI আন্দাজে ভুল টোকেন নাম (`--color-primary-500`) বা হার্ডকোডেড Hex (`#3b82f6`) বসিয়ে দেয়। | AI সরাসরি আপনার লাইভ টোকেন স্টোর থেকে ভেরিফাইড টোকেন নাম ও Resolved Value দেখে কোড লেখে। |
| **Dark/Light Mode** | AI জানে না আপনার প্রজেক্টে কয়টি থিম মোড আছে বা কোন সেটে কোন ভ্যালু ওভাররাইড হয়েছে। | AI `get_themes_matrix` কল করে Light, Dark, High-Contrast সব মোডের ভ্যালু একসাথে দেখে নেয়। |
| **Token Edit / Create** | নতুন টোকেন যোগ করতে হলে বারবার ওয়েব স্টুডিওতে গিয়ে ম্যানুয়ালি ফর্ম পূরণ করতে হয়। | আপনি AI-কে বলবেন *"Create a new warning surface token in semantic/dark"*—AI নিজেই `upsert_tokens` কল করে টোকেন তৈরি ও কমিট করে দেবে! |
| **Accessibility Check** | রঙের কন্ট্রাস্ট (WCAG AA/AAA) ম্যানুয়ালি চেক করতে হয়। | AI কোড লেখার আগেই `check_color_contrast` টুল দিয়ে চেক করে নেয় টেক্সট ও ব্যাকগ্রাউন্ড টোকেনটি WCAG AA পাস করে কি না। |

---

### ১.৩ MCP-এর ৩টি মূল অংশ (The 3 Actors of MCP)

```
┌──────────────────────────────┐          JSON-RPC 2.0           ┌─────────────────────────────────────┐
│   1. MCP Host + 2. Client    │ ◄─────────────────────────────► │           3. MCP Server             │
│  (Antigravity / Cursor /     │   (Streamable HTTP or Stdio)    │   (Second Screen / Tokens Platform) │
│   Claude Desktop / VS Code)  │   Auth: Bearer sec_pat_live_*   │   Exposes: Tools, Resources, Prompts│
└──────────────────────────────┘                                 └──────────────────┬──────────────────┘
                                                                                    │
                                                                                    ▼
                                                                 ┌─────────────────────────────────────┐
                                                                 │     Supabase DB + R2 + Compilers    │
                                                                 │  (Tokens, Themes, Branches, Assets) │
                                                                 └─────────────────────────────────────┘
```

1. **MCP Host**: যে অ্যাপ্লিকেশনের ভেতর আপনি AI-এর সাথে চ্যাট করছেন (যেমন: **Antigravity IDE**, **Cursor**, **Claude Desktop**, বা **VS Code**)।
2. **MCP Client**: ওই IDE-র ভেতরে থাকা একটি ছোট কানেক্টর, যেটি আপনার কনফিগারেশন ফাইল (`mcp_config.json`) পড়ে আমাদের সার্ভারের সাথে সংযোগ স্থাপন করে।
3. **MCP Server**: আমাদের **Second Screen / Tokens Platform**-এ আমরা যে সার্ভারটি যুক্ত করব। এটি AI-কে বলে দেয়: *"আমার কাছে এই এই ডিজাইন টোকেন, থিম, অ্যাসেট এবং ফাংশন (Tools) আছে, তুমি প্রয়োজনমতো ব্যবহার করতে পারো।"*

---

### ১.৪ MCP Server কী কী জিনিস AI-কে দেয়? (The 3 Primitives)

একটি MCP Server মূলত **৩ ধরনের সুবিধা (Primitives)** প্রদান করে:

1. **Tools (টুলস / ফাংশন — Model-Controlled)**:
   * এগুলো হলো অ্যাকশন বা ফাংশন যা AI নিজে সিদ্ধান্ত নিয়ে কল করতে পারে।
   * উদাহরণ: `search_tokens` (টোকেন খোঁজা), `upsert_tokens` (নতুন টোকেন তৈরি বা এডিট করা), `export_tokens_code` (CSS/Tailwind/Flutter কোড জেনারেট করা), `check_color_contrast` (কন্ট্রাস্ট চেক করা)।
2. **Resources (রিসোর্স / ফাইল ডেটা — Application-Controlled)**:
   * এগুলো হলো Read-only ফাইলের মতো ডেটা বা ইউআরআই (`URI`), যা AI রেফারেন্স হিসেবে পড়তে পারে।
   * উদাহরণ: `secondscreen://org/acme/project/design-system/overview`, `secondscreen://schemas/catalog`।
3. **Prompts (রেডিমেড প্রম্পট টেমপ্লেট — User-Controlled)**:
   * এগুলো হলো প্রি-বিল্ট স্ল্যাশ কমান্ড বা টেমপ্লেট যা ইউজার এক ক্লিকে সিলেক্ট করতে পারে।
   * উদাহরণ: `/migrate-hardcoded-css` (যেকোনো ফাইলের হার্ডকোডেড রঙ/সাইজকে ডিজাইন টোকেনে রূপান্তর করার প্রম্পট)।

---

### ১.৫ MCP Server কীভাবে কানেক্ট হয়? (Transport Mechanisms)

MCP-তে যোগাযোগের জন্য দুটি প্রধান পদ্ধতি (Transport) ব্যবহার করা হয়:

1. **Streamable HTTP Transport (Remote API Route — `/api/v1/mcp`)**:
   * আমাদের Next.js অ্যাপ্লিকেশনের ভেতরেই একটি API Route (`https://your-domain.com/api/v1/mcp` বা `http://localhost:3000/api/v1/mcp`) থাকবে।
   * **সুবিধা**: ইউজারের কম্পিউটারে আলাদা কোনো প্যাকেজ ইনস্টল করতে হয় না! শুধু URL এবং `Authorization: Bearer sec_pat_live_...` হেডার দিলেই সরাসরি কাজ করে।
2. **Stdio Transport (Local CLI Process — `node` / `npx`)**:
   * কিছু ক্লায়েন্ট (যেমন পুরনো Claude Desktop কনফিগ) লোকাল কমান্ড (`command: "node"` বা `"npx"`) চালাতে পছন্দ করে, যা `stdin` (Standard Input) এবং `stdout` (Standard Output)-এর মাধ্যমে কথা বলে।
   * **সুবিধা**: আমরা একটি হালকা CLI ব্রিজ স্ক্রিপ্ট (`scripts/mcp-server.mjs`) রাখব, যা লোকাল `stdio` থেকে রিকোয়েস্ট নিয়ে আমাদের প্ল্যাটফর্মের সাথে সংযোগ স্থাপন করবে।

> **আমাদের কৌশল (Dual-Transport Architecture)**: আমরা একটি **Unified MCP Core Engine (`lib/mcp/server.ts`)** তৈরি করব, যাতে একই কোড দিয়ে **Remote HTTP (`/api/v1/mcp`)** এবং **Local Stdio (`scripts/mcp-server.mjs`)**—দুটিই ১০০% কাজ করে!

---

## Part 2: আমাদের বর্তমান System Analysis (Codebase Audit & Readiness)

আমরা পুরো **Second Screen / Tokens Platform** কোডবেস বিশ্লেষণ করে দেখেছি। সুখবর হলো—আমাদের সিস্টেমের **৮০% কোর লজিক ইতিমধ্যেই অত্যন্ত মজবুতভাবে তৈরি আছে**! নিচে বর্তমান অবস্থা এবং কী কী নতুন যোগ করতে হবে তার বিশ্লেষণ দেওয়া হলো:

### ২.১ আমাদের সিস্টেমে যা যা ইতিমধ্যে প্রস্তুত আছে (Existing Strengths)

| মডিউল / ফিচার | বর্তমান ফাইল পাথ | কীভাবে MCP-তে কাজে লাগবে? |
| :--- | :--- | :--- |
| **Developers UI & PAT Manager** | [`components/McpCliView.tsx`](../components/McpCliView.tsx), [`components/ApiKeysManager.tsx`](../components/ApiKeysManager.tsx) | সাইডবারে `Developers` ট্যাব এবং PAT (`sec_pat_live_*`) জেনারেট করার সম্পূর্ণ UI ইতিমধ্যে তৈরি আছে। |
| **PAT Auth & RBAC Security** | [`utils/patAuth.ts`](../utils/patAuth.ts), [`utils/auth.ts`](../utils/auth.ts), [`app/api/v1/auth/pat/route.ts`](../app/api/v1/auth/pat/route.ts) | SHA-256 হ্যাশড API Key (`public.api_keys` টেবিলে $O(1)$ লুকআপ), স্কোপ চেকিং (`read:tokens`, `write:tokens`, `manage:releases`) এবং মাল্টি-টেন্যান্ট মেম্বারশিপ ভেরিফিকেশন (`authorizeProjectRequest`) একদম রেডি। |
| **High-Scale Token Engine** | [`utils/transformTokens.ts`](../utils/transformTokens.ts), [`utils/themeHelpers.ts`](../utils/themeHelpers.ts) | ১৩,০০০+ টোকেনের জন্য $O(1)$ ইন্ডেক্সিং, Alias Resolution (`{colors.brand.500}`), Math Evaluation (`{spacing.sm} * 2`), এবং DTCG 2025.10 পার্সার প্রস্তুত। |
| **Smart Delta & Branching** | [`utils/tokenDiff.ts`](../utils/tokenDiff.ts), [`app/api/v1/tokens/route.ts`](../app/api/v1/tokens/route.ts) | টোকেন আপডেট করলে কী কী পরিবর্তন হলো (`added`, `modified`, `deleted`) তা বের করে ব্রাঞ্চে অটোমেটিক কমিট হিস্ট্রি সেভ করার লজিক তৈরি আছে। |
| **Multi-Platform Compilers** | [`utils/exportsCompiler.ts`](../utils/exportsCompiler.ts), [`utils/releaseCompiler.ts`](../utils/releaseCompiler.ts) | টোকেন থেকে সরাসরি CSS Variables, SCSS, Tailwind, React TS, Flutter Dart, SwiftUI, ও Android XML জেনারেট করার ফাংশন রেডি। |
| **WCAG & CVD Accessibility** | [`utils/accessibility.ts`](../utils/accessibility.ts) | যেকোনো দুটি রঙের মধ্যে WCAG 2.1 AA/AAA কন্ট্রাস্ট রেশিও এবং Color Blindness (Protanopia, Deuteranopia, ইত্যাদি) সিমুলেশন করার ফাংশন তৈরি আছে। |
| **182 Local Schema Registry** | [`data/schemaCatalog.ts`](../data/schemaCatalog.ts), [`utils/dtcgSchemaGenerator.ts`](../utils/dtcgSchemaGenerator.ts) | ১০০% সেলফ-হোস্টেড DTCG Draft 2020-12 স্কিমা ক্যাটালগ ও ভ্যালিডেটর রেডি। |
| **Cloudflare R2 Assets** | [`lib/r2.ts`](../lib/r2.ts), [`app/api/assets/list/route.ts`](../app/api/assets/list/route.ts) | প্রজেক্টের ভেক্টর SVG আইকন ও অ্যাসেট লিস্ট এবং কন্টেন্ট ফেচ করার সিস্টেম রেডি। |

---

### ২.২ বর্তমানে কী কী ঘাটতি আছে? (Gap Analysis — What We Need to Build)

1. **MCP Server Backend নেই**:
   * [`components/McpCliView.tsx`](../components/McpCliView.tsx)-এ বর্তমানে একটি স্ট্যাটিক JSON স্নিপেট দেখানো হচ্ছে (`@tokens-platform/mcp-server`), কিন্তু ব্যাকএন্ডে কোনো `/api/v1/mcp` রাউট বা লোকাল MCP সার্ভার স্ক্রিপ্ট এখনো তৈরি করা হয়নি।
2. **Slug vs. UUID Resolution**:
   * [`components/McpCliView.tsx`](../components/McpCliView.tsx)-এ `--org=${currentOrg?.slug}` এবং `--project=${currentProject?.slug}` (যেমন `acme` এবং `design-system`) ব্যবহার করা হয়েছে। কিন্তু আমাদের [`services/organizationService.ts`](../services/organizationService.ts)-এর `getProject(orgId, projectId)` ফাংশনটি কেবল UUID আশা করে। তাই আমাদের একটি **Smart Identifier Resolver** লাগবে যা **UUID বা Slug—যেকোনোটি দিলেই** সঠিক Organization এবং Project খুঁজে বের করবে।
3. **High-Scale Context Window Protection (Rule 4 Compliance)**:
   * আমাদের প্রজেক্টগুলোতে **১৩,০০০+ টোকেন** থাকতে পারে। যদি কোনো AI Agent একবারে সব টোকেন চায় আর আমরা ১৩,০০০ টোকেনের পুরো JSON পাঠিয়ে দিই, তাহলে AI-এর Context Window (যেমন 128k বা 200k টোকেন লিমিট) সাথে সাথে পূর্ণ হয়ে ক্র্যাশ করবে!
   * তাই আমাদের MCP টুলগুলোতে **Smart Pagination (`limit`, `offset`), Category Summary, এবং Fuzzy Search** থাকতে হবে যাতে প্রতি কলে শুধুমাত্র প্রাসঙ্গিক ৫০-১০০টি টোকেন পাঠানো হয়।
4. **PAT Scope ও Project Binding (`ApiKeysManager.tsx` + `auth/pat/route.ts`)**:
   * [`utils/patAuth.ts`](../utils/patAuth.ts) ৩টি স্কোপ সাপোর্ট করে (`read:tokens`, `write:tokens`, `manage:releases`), কিন্তু [`app/api/v1/auth/pat/route.ts`](../app/api/v1/auth/pat/route.ts)-এর `allowedScopes` কেবল `read:tokens` ও `write:tokens`।
   * `manage:releases` MCP-তে যুক্ত **করা হবে না** — যতক্ষণ না কোনো release টুল থাকে (বাড়তি ক্ষমতা = বাড়তি ঝুঁকি)।
   * PAT রেকর্ডে `orgId`/`projectId` ফিল্ড আছে, কিন্তু `POST /api/v1/auth/pat` কখনো এগুলো সেট করে না, ফলে আজকের PAT ইউজারের **সব** Organization/Project-এ কাজ করে। MCP কী-এর জন্য এটি অনিরাপদ — দেখুন **২.৩ P0-১**।

### ২.৩ Code Review Findings — Implementation-এর আগে যা ঠিক করতে হবে

#### 🔴 P0 (Blocker — এগুলো ছাড়া implement করা যাবে না)

| # | সমস্যা | ডক/প্ল্যানে সংশোধন |
| :- | :--- | :--- |
| **P0-১** | PAT unbound — একটি লিক হওয়া MCP কী ইউজারের সব workspace-এ write করতে পারে। | MCP উদ্দেশ্যে তৈরি কী **ডিফল্টভাবে একটি project-এ bound** হবে (`orgId`+`projectId` সেট)। `pat/route.ts` এই ফিল্ড গ্রহণ করে `generateApiKey(...)`-এ পাস করবে; `authorizeProjectRequest` bound কী-এর বাইরের project reject করবে। Unbound কী কেবল read-only। |
| **P0-২** | Resolver auto-pick (`/api/v1/tokens`-এর মতো "প্রথম org/project") লেখার সময় ভুল প্রজেক্টে ডেটা বদলে দিতে পারে। | Auto-pick শুধু **read/discovery** টুলে। যেকোনো write টুলে `org`+`project` (বা bound PAT) **বাধ্যতামূলক**; না থাকলে error। |
| **P0-৩** | `POST /api/v1/tokens` `{...currentDoc, ...rawDoc}` shallow merge করে এবং `main` ব্রাঞ্চে root tokens ওভাররাইট করে — `upsert_tokens`/`delete_tokens` এটি reuse করলে সেট/টোকেন হারাবে। | নতুন **deep-merge ও path-level delete** ফাংশন (`lib/mcp/mutations.ts`) লিখতে হবে; পুরো doc replace নয়। `computeTokensDiff` দিয়ে diff, `saveProjectTokensAndBranches` দিয়ে সেভ। |
| **P0-৪** | Concurrent edit (UI/Figma plugin/অন্য AI) নীরবে ওভাররাইট হতে পারে। | Write টুলে `expectedUpdatedAt` (বা ETag — `projectId:updatedAt:branch`) আর্গুমেন্ট; mismatch হলে `conflict` error, retry-র আগে re-read। |
| **P0-৫** | AI `main`-এ সরাসরি লিখতে পারে। | Write টুলের ডিফল্ট: `main`-এ লেখা **অস্বীকৃত** যদি না `allowDefaultBranch: true` দেওয়া হয়; সাথে `dryRun: true` (diff প্রিভিউ, কোনো সেভ নয়)। প্রম্পট `generate-color-scale` ফিচার-ব্রাঞ্চ ফ্লো মেনে চলে। |
| **P0-৬** | "Streamable HTTP" স্পেক-সম্মত নয় — batch, notification, GET, version negotiation অস্পষ্ট। | অফিসিয়াল `@modelcontextprotocol/sdk` (stateless transport) ব্যবহারের সম্ভাবনা যাচাই করুন — Next 14 App Router সামঞ্জস্য **(verify)**। নিজে লিখলে: `notifications/*` → `202 Accepted` (বডি ছাড়া); `GET` → `405` (SSE না দিলে); `initialize`-এ ক্লায়েন্টের `protocolVersion` negotiate (সমর্থিত না হলে সার্ভারের সর্বশেষ সমর্থিত ভার্সন ফেরত); JSON-RPC batch **বাদ** (2025-06-18 স্পেকে batching সরানো হয়েছে)। রুটে `export const runtime = "nodejs"` ও `maxDuration` সেট। |
| **P0-৭** | CORS: IDE/ব্রাউজার ক্লায়েন্ট MCP হেডার পাঠালে preflight ব্যর্থ হবে। | [`utils/cors.ts`](../utils/cors.ts)-এর `Access-Control-Allow-Headers`-এ `Accept`, `Mcp-Session-Id`, `Mcp-Protocol-Version` যোগ; `Access-Control-Expose-Headers: Mcp-Session-Id`। |
| **P0-৮** | Output আকার নিয়ন্ত্রণ নেই — ১৩k+ টোকেনে `export_tokens_code`, `get_project_overview`, `get_token_details` LLM context ভরে দেবে। | সব টুলে হার্ড cap (যেমন ৫০–২০০ আইটেম / ~২৫k অক্ষর) + `truncated: true`, `nextOffset`; `JSON.stringify` **compact** (pretty-print নয়); export-এ `setName` না দিলে সারসংক্ষেপ + ফাইল ম্যাপ, পুরো কোড নয়। |
| **P0-৯** | Rate limit ও abuse সুরক্ষা নেই। | Per-key (SHA-256 hash id) rate limit, `tools/call`-এ সময়সীমা; write টুলে আরও কড়া সীমা। |

#### 🟠 P1 (Implementation চলাকালীন ঠিক করতে হবে)

| # | সমস্যা | সংশোধন |
| :- | :--- | :--- |
| **P1-১** | দুটি আলাদা কম্পাইলার: [`utils/exportsCompiler.ts`](../utils/exportsCompiler.ts) (css/scss/ts/raw/dtcg/figma-variables) বনাম [`utils/releaseCompiler.ts`](../utils/releaseCompiler.ts) (`compileStyleDictionary`: css/scss/esm/dts/tailwind/react/flutter/swift/android)। ডক এ-দুটো গুলিয়ে একটি `format` enum দিয়েছিল। | `export_tokens_code` → `releaseCompiler`-ভিত্তিক; `format` enum কেবল যেগুলো সত্যিই সাপোর্টেড। `figma-variables` এক্সপোর্ট প্লেসহোল্ডার ও approximate `oklch` রূপান্তর এক্সপোজ করা যাবে না। `/api/v1/releases` লজিক কপি নয় — শেয়ার্ড ফাংশন কল করুন। |
| **P1-২** | প্রতি কলে পুরো প্রজেক্ট লোড = ধীর। | Per-project short-TTL cache (key: `projectId:updatedAt:branch`) + সংকীর্ণ `select`। |
| **P1-৩** | `check_color_contrast` (`calculateContrastRatio` alpha উপেক্ষা করে) এবং `colorjs.io` `package.json`-এ তালিকাভুক্ত নয় (`utils/accessibility.ts` ডিপেন্ডেন্সি)। | আউটপুটে `alphaIgnored` সতর্কতা; `colorjs.io` স্পষ্টভাবে dependency-তে যোগ **(verify)**। |
| **P1-৪** | `validate_tokens_schema`: ১৮২টি স্কিমার বিপরীতে ভ্যালিডেশনের জন্য `ajv` বা কাস্টম চেক দরকার। | `ajv` (Draft 2020-12) যোগ অথবা কাস্টম চেকে সীমিত করুন; ডকে ভ্যালিডেশনের পরিধি স্পষ্ট করুন **(verify)**। |
| **P1-৫** | `get_themes_matrix`/`themeMode` — per-theme resolution এখনো UI-তে ThemeMatrix-এর ভেতরে। | `utils/themeHelpers.ts` থেকে `extractThemeGroups` ও রেজোলিউশন লজিক আলাদা শেয়ার্ড ফাংশনে বের করুন **(verify)**। |
| **P1-৬** | `create_branch`, used-by (`get_token_details`) হেল্পার কোডে আছে কি না অনিশ্চিত। | বিদ্যমান `ProjectBranch` সেভ লজিক ও `buildTokenLookupIndex` দিয়ে reverse-index বানান **(verify)**। |
| **P1-৭** | Slug collision — একই slug একাধিক org/project-এ থাকতে পারে। | Resolver ক্রম: exact ID → exact slug → একাধিক ম্যাচ হলে **error + candidates তালিকা** (অনুমান নয়)। |
| **P1-৮** | Commit SHA-তে `Math.random` ও author অস্পষ্ট। | Audit: author = ইউজার ইমেইল + `via MCP key "<name>"`; commitMessage prefix `[mcp]`; টুলে MCP `annotations` (`readOnlyHint`, `destructiveHint`) সেট। |

#### 🟡 P2 (ডকুমেন্টেশন ও পরিচ্ছন্নতা)
* এই ডকের `file:///d:/...` লিংকগুলো রিপোজিটরি-রিলেটিভ লিংকে বদলানো হয়েছে; কোরিয়ান "컴포넌트" টাইপো ঠিক করা হয়েছে।
* HTTP হলো **প্রাইমারি** ট্রান্সপোর্ট; stdio ব্রিজ ঐচ্ছিক ও সীমিত (Phase 4 দেখুন)।
* `/api/assets/content` বর্তমানে unauthenticated; MCP-তে `search_project_assets(includeSvgContent)` আগে authorize করে তারপর `loadAssetRawContent` কল করবে — ওই রুট reuse করবে না।
* ফাইল ম্যাপে `docs/ARCHITECTURE.md`, `AGENTS.md` Key File Map ও `data/systemChangelog.ts` আপডেট এবং টেস্ট `lib/__tests__/` কনভেনশনে রাখুন (vitest glob **(verify)**)।

#### 🎨 UX Plan Alignment (`docs/UX_UI_UPDATE_PLAN.md`)
* **শব্দভান্ডার:** ইউজার-ফেসিং টেক্সটে (টুল description, UI, error, ডক) **"Workspace"**, "Organization" নয়। কোড/DB ফিল্ড (`orgId`, `organizations`) অপরিবর্তিত।
* **নেভিগেশন:** MCP/Developers পেজ top-level sidebar আইটেম নয় — **Advanced** অথবা **Project settings → Developers**-এর ভেতরে থাকবে।

---

## Part 3: আমাদের System-এ MCP কীভাবে কাজ করবে? (Architecture & Data Flow)

### ৩.১ সামগ্রিক আর্কিটেকচার ডায়াগ্রাম (System Architecture)

```mermaid
flowchart TD
    subgraph IDE["AI Coding Assistants (MCP Hosts)"]
        A1["Antigravity IDE"]
        A2["Cursor / Windsurf"]
        A3["Claude Desktop / VS Code"]
    end

    subgraph Transport["Dual-Transport Entry Layer"]
        T1["Remote HTTP Endpoint\nPOST / GET /api/v1/mcp\n(Next.js App Router)"]
        T2["Local Stdio CLI Bridge\nscripts/mcp-server.mjs\n(stdin / stdout)"]
    end

    subgraph Security["Auth & Multi-Tenant Guard (utils/auth.ts)"]
        S1["Bearer PAT Verification\nsec_pat_live_* (SHA-256 O(1) Lookup)"]
        S2["Slug / UUID Tenant Resolver\nresolveOrgAndProject()"]
        S3["RBAC & Scope Enforcement\nread:tokens | write:tokens | manage:releases"]
    end

    subgraph CoreMCP["Second Screen MCP Engine (lib/mcp/)"]
        M1["Tools Registry (15+ Tools)\nlib/mcp/tools.ts"]
        M2["Resources Registry\nlib/mcp/resources.ts"]
        M3["Prompts Registry\nlib/mcp/prompts.ts"]
    end

    subgraph Platform["Existing Platform Services & Engines"]
        P1["Token Resolution & Math Engine\n(utils/transformTokens.ts)"]
        P2["Multi-Platform Code Compilers\n(utils/exportsCompiler.ts & releaseCompiler.ts)"]
        P3["WCAG Contrast & CVD Engine\n(utils/accessibility.ts)"]
        P4["Local DTCG Schema Registry\n(utils/dtcgSchemaGenerator.ts)"]
        P5["Supabase PostgreSQL + Cloudflare R2\n(services/organizationService.ts & lib/r2.ts)"]
    end

    A1 & A2 & A3 -->|HTTP + Bearer PAT| T1
    A1 & A2 & A3 -->|Stdio Process| T2
    T2 -->|HTTPS API / Direct Handler| T1
    T1 --> S1 --> S2 --> S3
    S3 --> M1 & M2 & M3
    M1 & M2 & M3 --> P1 & P2 & P3 & P4 & P5
```

---

### ৩.২ একটি রিকোয়েস্ট শুরু থেকে শেষ পর্যন্ত কীভাবে কাজ করবে? (Step-by-Step Execution Flow)

ধরুন, আপনি **Cursor** বা **Antigravity**-তে কোড লিখছেন এবং প্রম্পট দিলেন:
> *"আমাদের ডিজাইন সিস্টেমের brand এবং surface টোকেন ব্যবহার করে একটি Dark Mode Card কম্পোনেন্ট বানিয়ে দাও এবং দেখো টেক্সট কন্ট্রাস্ট ঠিক আছে কি না। কম্পোনেন্ট-এ আমাদের 'arrow-right' আইকনটিও বসাও।"*

আমাদের সিস্টেমের ভেতরে নিচের ধাপগুলো স্বয়ংক্রিয়ভাবে ঘটবে:

```mermaid
sequenceDiagram
    actor Dev as Developer (You)
    participant AI as AI Agent (Antigravity / Cursor)
    participant MCP as Second Screen MCP (/api/v1/mcp)
    participant Auth as Auth & Tenant Guard
    participant Engine as Token & Asset Engine (Supabase / R2)

    Dev->>AI: "Build a Dark Mode Card with our brand tokens, check contrast, and add arrow-right icon"
    
    Note over AI,MCP: 1. Token Discovery
    AI->>MCP: tools/call: search_tokens(query: "surface", mode: "dark", type: "color")
    MCP->>Auth: Verify PAT (sec_pat_live_*) + Check 'read:tokens' scope
    Auth-->>MCP: Authorized (org: acme, project: design-system, role: owner)
    MCP->>Engine: Load project tokens + Resolve aliases for 'dark' mode
    Engine-->>MCP: Returns matched tokens (--bg-surface-card: #121316, --text-primary: #f4f4f6, ...)
    MCP-->>AI: Structured JSON of matching tokens (Paginated, fast)

    Note over AI,MCP: 2. Accessibility Verification
    AI->>MCP: tools/call: check_color_contrast(fg: "text.primary", bg: "bg.surface.card", mode: "dark")
    MCP->>Engine: calculateContrastRatio(#f4f4f6, #121316)
    Engine-->>MCP: Ratio 16.45:1 (Passes WCAG AAA)
    MCP-->>AI: { ratio: "16.45:1", scoreLabel: "AAA", aaNormal: true }

    Note over AI,MCP: 3. SVG Asset Retrieval
    AI->>MCP: tools/call: get_asset_svg(name: "arrow-right")
    MCP->>Engine: Fetch SVG from Cloudflare R2 metadata + content
    Engine-->>MCP: <svg viewBox="0 0 24 24">...</svg>
    MCP-->>AI: Clean SVG markup + metadata

    AI->>Dev: Writes 100% accurate React Component using real CSS variables & inline SVG!
```

---

## Part 4: Second Screen MCP-তে কী কী Tools, Resources এবং Prompts থাকবে?

আমাদের সিস্টেমের প্রতিটি মডিউলকে (Tokens, Themes, Branches, Exports, Schemas, Figma Variables, Assets, Docs) কাজে লাগিয়ে আমরা **১৬টি শক্তিশালী MCP Tools**, **৫টি MCP Resources**, এবং **৪টি MCP Prompts** তৈরি করব।

### ৪.১ MCP Tools Catalog (১৬টি টুলস)

#### Category A: Workspace & Project Discovery (`read:tokens`)
| # | Tool Name | কী কাজ করে? (Description) | Input Arguments | Output Summary |
| :- | :--- | :--- | :--- | :--- |
| **1** | `list_workspaces` | ইউজারের অ্যাক্সেস থাকা সব Workspace এবং তার ভেতরের Project-গুলোর তালিকা (slug, ID, activeBranch সহ) রিটার্ন করে। | `orgSlug?: string` | Organizations ও Projects-এর তালিকা এবং ইউজারের Role (`owner`/`admin`/`editor`/`viewer`)। |
| **2** | `get_project_overview` | একটি প্রজেক্টের সম্পূর্ণ সারসংক্ষেপ দেয়: কয়টি টোকেন সেট আছে, প্রতি সেটে কয়টি টোকেন, কী কী Theme Group/Mode আছে, কয়টি Figma Variable ও Asset আছে। | `org?: string`, `project?: string`, `branch?: string` | Token sets summary, Theme groups, Enabled schemas count, Active branch, Latest commit info। |

#### Category B: High-Scale Token Search & Inspection (`read:tokens`)
| # | Tool Name | কী কাজ করে? (Description) | Input Arguments | Output Summary |
| :- | :--- | :--- | :--- | :--- |
| **3** | `search_tokens` | ১৩,০০০+ টোকেনের মধ্য থেকে দ্রুত নাম, পাথ, টাইপ, সেট বা ভ্যালু দিয়ে টোকেন খুঁজে বের করে (Context Window বাঁচাতে পেজিনেশন সহ)। | `query?: string`, `type?: TokenType`, `setName?: string`, `themeMode?: string`, `deprecated?: boolean`, `limit?: number` (default 50, max 200), `offset?: number` | মেচিং টোকেনের তালিকা (`name`, `type`, `rawValue`, `resolvedValue`, `cssVarName`, `setName`, `isAlias`, `description`) + `totalMatched`। |
| **4** | `get_token_details` | নির্দিষ্ট একটি বা একাধিক টোকেনের গভীর তথ্য দেয়: সব থিম মোডে এর ভ্যালু কী, এটি কোন টোকেনকে রেফার করছে (Alias chain), এবং অন্য কোন কোন টোকেন এটিকে ব্যবহার করছে (Used-by dependents)। | `tokenNames: string[]`, `branch?: string` | প্রতিটি টোকেনের পূর্ণাঙ্গ মেটাডেটা, থিম-ভিত্তিক ভ্যালু, ডিপেন্ডেন্সি ট্রি এবং সব প্ল্যাটফর্মের ভেরিয়েবল নাম (CSS/SCSS/TS/Swift/Dart)। |
| **5** | `list_token_sets` | প্রজেক্টের সব Token Set (যেমন `global`, `semantic/light`, `semantic/dark`) এবং সেগুলোর ভেতরের গ্রুপের নাম ও টোকেন সংখ্যা দেখায়। | `branch?: string` | সেটগুলোর নাম, টোকেন সংখ্যা এবং ভেতরের টপ-লেভেল গ্রুপ (`colors`, `spacing`, `typography`)। |

#### Category C: Themes, Accessibility & Contrast Audit (`read:tokens`)
| # | Tool Name | কী কাজ করে? (Description) | Input Arguments | Output Summary |
| :- | :--- | :--- | :--- | :--- |
| **6** | `get_themes_matrix` | প্রজেক্টের সব Theme Group (যেমন `Mode`: `Light`/`Dark`, `Brand`: `Brand A`/`Brand B`) এবং কোন মোডে কোন Token Set অ্যাক্টিভ তা রিটার্ন করে। চাইলে নির্দিষ্ট কিছু টোকেনের Mode-by-Mode তুলনাও দেয়। | `tokenNames?: string[]`, `groupName?: string` | থিম গ্রুপ কনফিগারেশন এবং টোকেনগুলোর পাশাপাশি (Side-by-side) সব মোডের Resolved Value। |
| **7** | `check_color_contrast` | দুটি টোকেন নাম (যেমন `text.primary` ও `bg.surface`) অথবা দুটি সরাসরি রঙের মধ্যে **WCAG 2.1 AA/AAA Contrast Ratio** এবং **Color Blindness (CVD)** সিমুলেশন চেক করে। | `foreground: string`, `background: string`, `themeMode?: string` (alpha চ্যানেল উপেক্ষিত — আউটপুটে `alphaIgnored` ওয়ার্নিং) | Contrast ratio (`e.g. 7.42:1`), `scoreLabel` (`AAA`/`AA`/`AA Large`/`FAIL`), এবং Protanopia/Deuteranopia/Tritanopia প্রিভিউ Hex। |

#### Category D: Code Compilation & Schema Validation (`read:tokens`)
| # | Tool Name | কী কাজ করে? (Description) | Input Arguments | Output Summary |
| :- | :--- | :--- | :--- | :--- |
| **8** | `export_tokens_code` | প্রজেক্টের টোকেনগুলোকে তাৎক্ষণিকভাবে যেকোনো প্ল্যাটফর্মের প্রোডাকশন কোডে কম্পাইল করে দেয়। | `format: "css" \| "scss" \| "tailwind" \| "typescript" \| "flutter" \| "swift" \| "android" \| "dtcg_json"`, `setName?: string`, `prefix?: string`, `casing?: string`, `colorSpace?: string`, `limit?: number` — **`releaseCompiler` (`compileStyleDictionary`)-ভিত্তিক; তালিকা ইমপ্লিমেন্টেশনের সময় আসলে সাপোর্টেড ফরম্যাটে সীমিত হবে, `figma-variables` নয় (P1-১)** | কম্পাইলড কোড/ফাইল ম্যাপ — আকার cap-সহ, বড় হলে `truncated` + `nextOffset` (P0-৮)। |
| **9** | `validate_tokens_schema` | আমাদের সেলফ-হোস্টেড ১৮২টি DTCG 2025.10 JSON Schema-র বিপরীতে টোকেনগুলো ভ্যালিডেট করে এবং কোনো ভুল বা ভাঙ্গা Alias (Broken Reference) থাকলে রিপোর্ট দেয়। | `setName?: string`, `branch?: string` | ভ্যালিডেশন রিপোর্ট: Broken aliases, missing types, deprecated tokens in use, এবং DTCG schema compliance status। |

#### Category E: Token Authoring & Branch Version Control (`write:tokens`)
| # | Tool Name | কী কাজ করে? (Description) | Input Arguments | Output Summary |
| :- | :--- | :--- | :--- | :--- |
| **10** | `upsert_tokens` | প্রজেক্টের নির্দিষ্ট Token Set ও Branch-এ এক বা একাধিক টোকেন তৈরি বা আপডেট করে এবং অটোমেটিক ডেল্টা (Diff) হিসাব করে কমিট হিস্ট্রিতে সেভ করে। | `setName: string`, `tokens: Array<{ path: string; value: any; type?: string; description?: string }>`, `branch?: string`, `commitMessage?: string`, `expectedUpdatedAt?: string`, `dryRun?: boolean`, `allowDefaultBranch?: boolean` (প্রজেক্ট স্পষ্ট বাধ্যতামূলক — P0-২/৪/৫) | কয়টি টোকেন Added/Modified হলো তার সামারি, নতুন Resolved Value এবং Commit SHA। |
| **11** | `delete_tokens` | নির্দিষ্ট Token Set থেকে টোকেন ডিলিট করে। ডিলিট করার আগে চেক করে অন্য কোনো টোকেন এটির ওপর নির্ভরশীল (Alias) কি না! | `setName: string`, `tokenPaths: string[]`, `branch?: string`, `force?: boolean`, `commitMessage?: string`, `expectedUpdatedAt?: string`, `dryRun?: boolean`, `allowDefaultBranch?: boolean` | ডিলিট হওয়া টোকেনের তালিকা অথবা Broken Alias ওয়ার্নিং। |
| **12** | `list_branches` | প্রজেক্টের সব Native ও Git ব্রাঞ্চ এবং সাম্প্রতিক কমিট হিস্ট্রি (কে কখন কোন টোকেন পরিবর্তন করেছে) দেখায়। | `limitCommits?: number` | ব্রাঞ্চের তালিকা, ডিফল্ট ব্রাঞ্চ এবং সাম্প্রতিক কমিট লগ। |
| **13** | `create_branch` | বিদ্যমান কোনো ব্রাঞ্চ (যেমন `main`) থেকে ফর্ক করে নতুন একটি ব্রাঞ্চ তৈরি করে, যাতে AI মূল ব্রাঞ্চ নষ্ট না করে নিরাপদে নতুন ব্রাঞ্চে কাজ করতে পারে। | `branchName: string`, `title?: string`, `basedOn?: string`, `description?: string` | নতুন তৈরি হওয়া ব্রাঞ্চের তথ্য এবং টোকেন স্ন্যাপশট। |

#### Category F: Figma Variables, R2 Assets & Living Docs (`read:tokens`)
| # | Tool Name | কী কাজ করে? (Description) | Input Arguments | Output Summary |
| :- | :--- | :--- | :--- | :--- |
| **14** | `inspect_figma_variables` | Figma Plugin থেকে সিঙ্ক হওয়া Figma Variable Collections এবং সেগুলোর Mode-ভিত্তিক ভ্যালু ও CSS Variable নাম খুঁজে দেয়। | `collectionName?: string`, `query?: string`, `type?: string`, `limit?: number` | Figma Variables-এর তালিকা, মোড ভ্যালু এবং লাস্ট সিঙ্ক টাইমস্ট্যাম্প। |
| **15** | `search_project_assets` | Cloudflare R2-তে সংরক্ষিত ব্র্যান্ড আইকন ও SVG অ্যাসেট খোঁজে এবং চাইলে সরাসরি ইনলাইন `<svg>...</svg>` কোড রিটার্ন করে। | `query?: string`, `folderId?: string`, `includeSvgContent?: boolean`, `limit?: number` | অ্যাসেটের তালিকা (`id`, `name`, `title`, `url`, `type`) এবং ঐচ্ছিক পরিষ্কার SVG কোড। |
| **16** | `get_documentation_pages` | প্রজেক্টের **Living Documentation Studio**-তে লেখা গাইডলাইন, Do's & Don'ts এবং ডকুমেন্টেশন পেজগুলো পড়ে শোনায় যাতে AI আপনার টিমের ডিজাইন রুলস মেনে চলে। | `pageSlug?: string`, `query?: string` | ডকুমেন্টেশন পেজের তালিকা এবং মার্কডাউন/ব্লক কন্টেন্ট। |

---

### ৪.২ MCP Resources (৫টি Read-Only URI Resources)

AI ক্লায়েন্টগুলো চাইলে সরাসরি নিচের URI-গুলো ফাইল হিসেবে মাউন্ট বা রিড করতে পারবে:

1. `secondscreen://{org}/{project}/overview` — প্রজেক্টের মেটাডেটা, সেট, থিম এবং ব্রাঞ্চ সামারি।
2. `secondscreen://{org}/{project}/tokens/{branch}` — প্রজেক্টের কাঁচা (Raw) এবং Resolved টোকেন সামারি।
3. `secondscreen://{org}/{project}/themes` — সম্পূর্ণ `$themes` এবং Theme Matrix কনফিগারেশন।
4. `secondscreen://{org}/{project}/docs` — প্রজেক্টের প্রকাশিত ডিজাইন সিস্টেম ডকুমেন্টেশন ও গাইডলাইন।
5. `secondscreen://schemas/catalog` — আমাদের সেলফ-হোস্টেড ১৮২টি DTCG 2025.10 স্কিমার সম্পূর্ণ ক্যাটালগ (`/api/v1/schemas/*` — Zero external links)।

---

### ৪.৩ MCP Prompts (৪টি রেডিমেড AI Prompt Templates)

ইউজাররা তাদের IDE-তে `/` চাপলে নিচের রেডিমেড প্রম্পট টেমপ্লেটগুলো পাবে:

1. **`use-design-tokens`**: *"বর্তমান ফাইলে থাকা সব হার্ডকোডেড রঙ (`#hex`, `rgb`), স্পেসিং (`px`, `rem`), এবং ফন্ট সাইজ বিশ্লেষণ করো এবং আমাদের প্রজেক্টের সঠিক ডিজাইন টোকেন (`search_tokens`) দিয়ে সেগুলো প্রতিস্থাপন করো। কোনো হার্ডকোডেড ভ্যালু রাখবে না।"*
2. **`build-themed-component`**: *"আমাদের প্রজেক্টের Semantic টোকেন এবং Theme Matrix (`get_themes_matrix`) দেখে একটি Light ও Dark মোড সাপোর্টেড UI কম্পোনেন্ট তৈরি করো এবং `check_color_contrast` দিয়ে নিশ্চিত করো সব টেক্সট WCAG AA পাস করছে।"*
3. **`audit-design-system-health`**: *"আমাদের প্রজেক্টে `validate_tokens_schema` এবং `search_tokens` চালিয়ে চেক করো কোনো Broken Alias, Deprecated টোকেন বা কম কন্ট্রাস্টের রঙের পেয়ার আছে কি না এবং তার একটি রিপোর্ট দাও।"*
4. **`generate-color-scale`**: *"নির্দিষ্ট একটি Base Hex রঙ থেকে ৫০ থেকে ৯৫০ পর্যন্ত একটি নতুন কালার স্কেল তৈরি করো এবং `create_branch` ও `upsert_tokens` ব্যবহার করে একটি নতুন ফিচার ব্রাঞ্চে সেভ করো।"*

---

## Part 5: Step-by-Step Implementation Plan (আমরা কীভাবে Implementation করব?)

এখানে আমাদের কোডবেসে MCP সার্ভার যুক্ত করার সম্পূর্ণ ধাপে ধাপে ইঞ্জিনিয়ারিং প্ল্যান দেওয়া হলো। আমরা আমাদের প্রজেক্টের **৫টি Critical Architectural Rules (`AGENTS.md`)** অক্ষুণ্ণ রেখে এটি বাস্তবায়ন করব।

### নতুন যে ফাইলগুলো তৈরি ও আপডেট করা হবে (File Map)

```
second-screen/
├── lib/
│   └── mcp/
│       ├── types.ts                # [NEW] MCP context, tool parameter schemas & response types
│       ├── resolver.ts             # [NEW] UUID/Slug resolver (ambiguity → error; auto-pick read-only) & branch loader
│       ├── mutations.ts            # [NEW] Deep-merge upsert / path-level delete, optimistic concurrency, dryRun
│       ├── tools.ts                # [NEW] Implementation of all 16 MCP tools
│       ├── resources.ts            # [NEW] Implementation of 5 MCP URI resources
│       ├── prompts.ts              # [NEW] Implementation of 4 MCP prompt templates
│       └── server.ts               # [NEW] Unified JSON-RPC 2.0 & MCP Server dispatcher
├── app/
│   └── api/
│       └── v1/
│           ├── mcp/
│           │   ├── route.ts        # [NEW] Streamable HTTP / JSON-RPC 2.0 MCP endpoint
│           └── auth/
│               └── pat/
│                   └── route.ts    # [MODIFY] Accept & persist orgId/projectId binding (MCP keys bound by default)
├── lib/__tests__/
│   └── mcp*.test.ts                # [NEW] Tests (repo convention; vitest glob verify)
├── utils/cors.ts                   # [MODIFY] Add Accept, Mcp-Session-Id, Mcp-Protocol-Version
├── scripts/
│   └── mcp-server.mjs              # [NEW, OPTIONAL] Thin stdio→HTTP bridge (HTTP is primary)
├── services/
│   └── organizationService.ts      # [MODIFY] Add resolveOrgAndProjectBySlugOrId() helper
├── docs/ARCHITECTURE.md · AGENTS.md (Key File Map) · data/systemChangelog.ts  # [MODIFY] Document MCP
└── components/
    ├── McpCliView.tsx              # [MODIFY] Upgrade with IDE tabs (Antigravity, Cursor, Claude, VS Code),
    │                               #          Remote HTTP vs Local Stdio toggle & Live Connection Tester
    └── ApiKeysManager.tsx          # [MODIFY] Show project-binding + scope indicator for MCP keys (no manage:releases)
```

---

### Phase 1: Slug/UUID Tenant Resolver তৈরি (`services/organizationService.ts` & `lib/mcp/resolver.ts`)

**কেন দরকার?**
ইউজারের কনফিগারেশনে `--org=acme` (Slug) অথবা `orgId=uuid`—যেকোনোটি থাকতে পারে। কেউ `--org`/`--project` না দিলে **শুধু read-only টুলের জন্য** PAT (`sec_pat_live_*`) দিয়ে প্রথম অ্যাক্সেসযোগ্য প্রজেক্ট নেওয়া যাবে; লেখার জন্য নয়।

**কীভাবে করব?**
`lib/mcp/resolver.ts`-এ আমরা `resolveMcpProjectContext()` ফাংশন লিখব:
1. প্রথমে চেক করবে রিকোয়েস্টের Query Params (`?org=...&project=...`), Headers (`x-org-id`, `x-project-id`), অথবা Tool Arguments-এ `org` এবং `project` দেওয়া আছে কি না।
2. যদি না থাকে, তাহলে PAT রেকর্ডের `orgId` / `projectId` চেক করবে। **Bound PAT হলে অন্য project অনুরোধ reject করবে (P0-১)।**
3. `getUserOrganizations(uid, userEmail)` থেকে ইউজারের সব Organization লোড করে `id === orgInput || slug.toLowerCase() === orgInput.toLowerCase()` দিয়ে ম্যাচ করবে।
4. এরপর `getOrgProjectSummaries(org.id)` থেকে **আগে exact ID, তারপর exact slug** দিয়ে প্রজেক্ট বের করবে; একাধিক ম্যাচ হলে অনুমান না করে candidates-সহ error (P1-৭); এবং `authorizeProjectRequest()` দিয়ে পারমিশন (`read` বা `write`) নিশ্চিত করবে।
5. **Auto-pick নিয়ম (P0-২):** `--org/--project` ও bound PAT না থাকলে প্রথম অ্যাক্সেসযোগ্য প্রজেক্ট **শুধু read/discovery টুলে** নেওয়া হবে। write টুলে স্পষ্ট প্রজেক্ট না থাকলে error।

---

### Phase 2: Unified MCP Engine & 16 Tools তৈরি (`lib/mcp/*`)

**কেন দরকার?**
আমরা চাই আমাদের MCP ইঞ্জিনটি একদম হালকা, দ্রুত, টাইপ-সেফ এবং Vercel/Next.js Serverless-এ (HTTP প্রাইমারি) নির্বিঘ্নে কাজ করুক; stdio কেবল ঐচ্ছিক ব্রিজ।

**কীভাবে করব?**
1. **`lib/mcp/types.ts`**:
   * JSON-RPC 2.0 (`jsonrpc: "2.0"`, `id`, `method`, `params`, `result`, `error`) এবং MCP Protocol (`protocolVersion` **negotiation** সহ — ক্লায়েন্টের ভার্সন সমর্থিত হলে সেটি, নইলে সার্ভারের সর্বশেষ সমর্থিত ভার্সন; সমর্থিত ভার্সনের তালিকা ইমপ্লিমেন্টেশনের সময় স্পেক দেখে ঠিক করুন) টাইপ ডেফিনিশন।
   * `McpExecutionContext` ইন্টারফেস যেখানে থাকবে: `origin` (ডাইনামিক স্কিমা URL-এর জন্য, Rule 1), `authRecord` (`ApiKeyRecord`), `defaultOrg`, `defaultProject`, `defaultBranch`।
2. **`lib/mcp/tools.ts`**:
   * উপরে বর্ণিত ১৬টি টুলের JSON Schema (`inputSchema`) এবং এক্সিকিউশন হ্যান্ডলার।
   * **High-Scale Guardrail (Rule 4)**: `search_tokens` টুলে ডিফল্ট `limit = 50` এবং সর্বোচ্চ `limit = 200` থাকবে। সাথে থাকবে `buildTokenLookupIndex` (`utils/transformTokens.ts`) যাতে ১৩,০০০+ টোকেন থাকলেও ১০ মিলিসেকেন্ডের কম সময়ে সার্চ ও Alias রেজোলিউশন সম্পন্ন হয়।
   * **Zero External Links (Rule 1)**: `validate_tokens_schema` এবং স্কিমা রেফারেন্স সবসময় `${context.origin}/api/v1/schemas/...` রিটার্ন করবে।
3. **`lib/mcp/resources.ts` & `lib/mcp/prompts.ts`**:
   * `resources/list`, `resources/read`, `prompts/list`, এবং `prompts/get` মেথডগুলোর হ্যান্ডলার।
4. **`lib/mcp/server.ts`**:
   * একটি পিওর, স্টেটলেস ডিসপ্যাচার (অথবা অফিসিয়াল SDK-র stateless transport — P0-৬) `handleMcpJsonRpcRequest(payload, context)` যা নিচের সব স্ট্যান্ডার্ড MCP মেথড হ্যান্ডেল করবে:
     * `initialize` ➔ সার্ভারের নাম (`second-screen-tokens-mcp`), ভার্সন (`1.7.0`), এবং capabilities (`tools`, `resources`, `prompts`) রিটার্ন করবে।
     * `notifications/initialized` ➔ কোনো বডি ছাড়া `202 Accepted`।
     * `ping` ➔ `{}` রিটার্ন করবে।
     * `tools/list` ➔ ১৬টি টুলের নাম, বিবরণ এবং JSON Schema রিটার্ন করবে।
     * `tools/call` ➔ নির্দিষ্ট টুলটি রান করে `{ content: [{ type: "text", text: JSON.stringify(result) }], isError: false }` (compact JSON, আকার cap-সহ — P0-৮) রিটার্ন করবে; ব্যবসায়িক ত্রুটি `isError: true` দিয়ে, প্রোটোকল ত্রুটি JSON-RPC error দিয়ে।
     * `resources/list` ও `resources/read` ➔ প্রজেক্টের লাইভ রিসোর্স রিটার্ন করবে।
     * `prompts/list` ও `prompts/get` ➔ রেডিমেড প্রম্পট টেমপ্লেট রিটার্ন করবে।

---

### Phase 3: Remote Streamable HTTP API Route তৈরি (`app/api/v1/mcp/route.ts`)

**কেন দরকার?**
আধুনিক AI IDE-গুলো (যেমন **Antigravity, Cursor, Windsurf, VS Code**) সরাসরি একটি HTTP URL-এ MCP কানেক্ট করতে পারে। এছাড়া আমাদের লোকাল CLI স্ক্রিপ্টও এই এন্ডপয়েন্টের মাধ্যমেই ক্লাউডের সাথে কথা বলবে।

**কীভাবে করব?**
* `app/api/v1/mcp/route.ts` তৈরি করব:
  * **`POST /api/v1/mcp`**:
    0. রুটে `export const runtime = "nodejs"` এবং `maxDuration` সেট; per-key rate limit (P0-৯)।
    1. `authenticateRequest(req, "read:tokens")` দিয়ে `Authorization: Bearer sec_pat_live_...` অথবা ব্রাউজার সেশন ভেরিফাই করবে।
    2. যদি কোনো রাইট টুল (`upsert_tokens`, `delete_tokens`, `create_branch`) কল করা হয়, তাহলে অতিরিক্তভাবে `write:tokens` স্কোপ, স্পষ্ট প্রজেক্ট (P0-২), `authorizeProjectRequest(..., "write")` (owner/admin/editor) এবং `expectedUpdatedAt` চেক করবে।
    3. সিঙ্গেল JSON-RPC রিকোয়েস্ট সাপোর্ট করবে। **Batch সমর্থিত নয়** (2025-06-18 স্পেকে বাদ); `notifications/*` → `202`।
    4. স্ট্যান্ডার্ড JSON রেসপন্স (`application/json`); SSE ঐচ্ছিক। `Accept` হেডার যাচাই।
  * **`GET /api/v1/mcp`**:
    * SSE না দিলে `405 Method Not Allowed` (স্পেক-সম্মত)। হেলথ-চেক আলাদা রুটে (`/api/v1/mcp/health`) রাখা যায়।
  * **`OPTIONS /api/v1/mcp`**:
    * CORS Preflight (`handleOptionsCors()`) হ্যান্ডেল করবে।

---

### Phase 4: Local Stdio Bridge Script তৈরি (`scripts/mcp-server.mjs`)

**কেন দরকার?**
যেসব AI অ্যাপ্লিকেশন (যেমন **Claude Desktop** বা স্ট্যান্ডার্ড `command` + `args` ভিত্তিক MCP ক্লায়েন্ট) লোকাল কমান্ডের মাধ্যমে (`stdin`/`stdout`) MCP সার্ভার চালায়, তাদের জন্য একটি জিরো-ডিপেন্ডেন্সি Node.js স্ক্রিপ্ট **ঐচ্ছিকভাবে** থাকতে পারে। মনে রাখুন: `@tokens-platform/mcp-server` নামে কোনো npm প্যাকেজ আজ নেই — প্রকাশ না করা পর্যন্ত UI-তে `npx` স্নিপেট দেখানো যাবে না; বিকল্প `node scripts/mcp-server.mjs` বা সরাসরি HTTP।

**কীভাবে করব?**
* `scripts/mcp-server.mjs` তৈরি করব যা:
  1. কমান্ড লাইন আর্গুমেন্ট (`--org=...`, `--project=...`, `--branch=...`, `--url=...`) এবং এনভায়রনমেন্ট ভেরিয়েবল (`TOKENS_PLATFORM_PAT`, `TOKENS_PLATFORM_URL`) পড়বে।
  2. `process.stdin` থেকে লাইন-বাই-লাইন JSON-RPC মেসেজ গ্রহণ করবে।
  3. সেগুলোকে `POST ${baseUrl}/api/v1/mcp?org=${org}&project=${project}` এন্ডপয়েন্টে `Authorization: Bearer ${pat}` হেডারসহ ফরোয়ার্ড করবে এবং রেসপন্সটি সরাসরি `process.stdout.write(JSON.stringify(response) + "\n")` দিয়ে AI ক্লায়েন্টকে ফিরিয়ে দেবে।
  4. অফলাইন বা নেটওয়ার্ক এরর হলে সুন্দরভাবে JSON-RPC Error ফরম্যাটে মেসেজ দেবে যাতে AI ক্লায়েন্ট কখনোই হ্যাং না করে।

---

### Phase 5: Developers UI আপগ্রেড (`components/McpCliView.tsx`)

**কেন দরকার?**
ইউজারের যাতে কোনো কনফিগারেশন মুখস্থ লিখতে না হয়! ইউজার ওয়েব অ্যাপের **Advanced / Project settings ➔ Developers** পেজে যাবে, এক ক্লিকে **প্রজেক্টে-bound** PAT তৈরি করবে, নিজের IDE (Antigravity / Cursor / Claude Desktop / VS Code) সিলেক্ট করবে, আর সাথে সাথে তার আসল প্রজেক্ট স্লাগ, ডোমেইন অরিজিন এবং নতুন তৈরি করা PAT সহ **১০০% রেডি-টু-কপি কনফিগারেশন** পেয়ে যাবে!

**কীভাবে করব (`components/McpCliView.tsx`-এ নতুন ফিচারসমূহ)**:
1. **Transport Mode Selector**:
   * **Mode 1: Direct HTTP Server (Recommended — Zero Setup)**: সরাসরি `${window.location.origin}/api/v1/mcp?org=${orgSlug}&project=${projectSlug}` URL এবং `Authorization: Bearer ...` হেডার।
   * **Mode 2: Local Stdio Command (`node` / `npx`)**: `scripts/mcp-server.mjs` ব্যবহার করে লোকাল স্ট্যান্ডার্ড ইনপুট/আউটপুট কনফিগারেশন।
2. **IDE / AI Client Tabs**:
   * **Antigravity**, **Cursor**, **Claude Desktop**, এবং **VS Code (Copilot)**-এর জন্য আলাদা আলাদা সঠিক ফাইল পাথ ও JSON ফরম্যাট।
3. **Interactive "Test MCP Server" Button**:
   * পেজের ভেতরেই একটি **"Test Connection"** বাটন থাকবে, যেটিতে ক্লিক করলে লাইভ `/api/v1/mcp` এন্ডপয়েন্টে `tools/list` ও `get_project_overview` কল করে দেখিয়ে দেবে যে সার্ভারটি সচল আছে এবং কয়টি টুল রেডি আছে!
4. **Available MCP Tools Explorer**:
   * ১৬টি টুলের নাম, কোন স্কোপ লাগে (`read:tokens` নাকি `write:tokens`), এবং কোন প্রম্পট দিয়ে টুলটি ব্যবহার করা যায় তার একটি সুন্দর তালিকা।

---

### Phase 6: Verification & Testing Checklist

ইমপ্লিমেন্টেশন শেষে আমরা নিচের প্রতিটি ধাপ রান করে ভেরিফাই করব:
1. **Unit & Integration Tests (`vitest`)**:
   * `lib/__tests__/` কনভেনশনে (vitest glob যাচাই করুন) MCP টেস্ট তৈরি:
     * `initialize` হ্যান্ডশেক ঠিকমতো কাজ করছে কি না।
     * `tools/list` সব ১৬টি টুল রিটার্ন করছে কি না।
     * `search_tokens`, `get_token_details`, `check_color_contrast`, `export_tokens_code`, এবং `upsert_tokens` সঠিক ডেটা রিটার্ন করছে কি না।
     * Bound PAT অন্য প্রজেক্টে `403`; write টুলে প্রজেক্ট ছাড়া error; stale `expectedUpdatedAt`-এ `conflict`; `main`-এ `allowDefaultBranch` ছাড়া reject; `dryRun` কিছু সেভ করে না।
     * `notifications/initialized` → `202`; `GET` → `405`; অসমর্থিত `protocolVersion` negotiation।
     * ভুয়া PAT দিলে `401 Unauthorized` এবং `write:tokens` স্কোপ ছাড়া `upsert_tokens` কল করলে `403 Forbidden` দিচ্ছে কি না।
2. **TypeScript Type Check**:
   ```bash
   npx tsc --noEmit
   ```
   *(Exit code 0 হতে হবে)*
3. **Production Build Verification**:
   ```bash
   npm run build
   ```
   *(কোনো লিন্ট বা বিল্ড এরর ছাড়া সফলভাবে সব পেজ ও API রাউট বিল্ড হতে হবে)*

---

## Part 6: After Implementation — কীভাবে Use করতে হবে? (Usage & Prompt Guide)

ইমপ্লিমেন্টেশন শেষ হওয়ার পর আপনি বা আপনার টিমের যেকোনো ডিজাইনার/ডেভেলপার মাত্র **৩টি ধাপে (২ মিনিটে)** যেকোনো AI IDE-র সাথে **Second Screen** কানেক্ট করতে পারবেন।

---

### ধাপ ১: Personal Access Token (PAT) তৈরি করুন

1. ব্রাউজারে আপনার **Second Screen / Tokens Platform** ওপেন করুন এবং আপনার পছন্দের **Workspace** ও **Project** সিলেক্ট করুন।
2. **Advanced / Project settings ➔ Developers** (`McpCliView`) পেজে যান।
3. **Personal Access Tokens (PATs)** কার্ডে **Generate New Key** বাটনে ক্লিক করুন (কী স্বয়ংক্রিয়ভাবে নির্বাচিত Project-এ bound হবে):
   * **Token Name**: যেমন `Antigravity MCP Key` বা `Cursor AI Key` দিন।
   * **Expiration**: `90 days` বা `No expiration` সিলেক্ট করুন।
   * **Permissions / Scopes**:
     * আপনি যদি চান AI শুধু টোকেন পড়বে এবং কোড লিখবে (কোনো টোকেন ডাটাবেসে পরিবর্তন করবে না), তাহলে কেবল **`read:tokens`** টিক দিন।
     * আপনি যদি চান AI আপনার নির্দেশে নতুন টোকেন বা ব্রাঞ্চও তৈরি করতে পারবে, তাহলে **`read:tokens`** এবং **`write:tokens`** দুটোই টিক দিন। (লেখা ডিফল্টভাবে `main`-এ নয়, ফিচার-ব্রাঞ্চে।)
4. **Generate Token**-এ ক্লিক করার সাথে সাথে `sec_pat_live_...` টোকেনটি তৈরি হবে এবং নিচের **MCP Server Configuration** বক্সে স্বয়ংক্রিয়ভাবে বসে যাবে!

---

### ধাপ ২: আপনার AI IDE-তে কনফিগারেশন পেস্ট করুন

আপনি নিচের যেকোনো পদ্ধতিতে আপনার পছন্দের AI টুলে কনফিগারেশনটি যোগ করতে পারেন:

#### Option A: Antigravity IDE / Cursor (Direct HTTP Mode — সবচেয়ে সহজ!)
যদি আপনার ডেভ সার্ভার (`http://localhost:3000`) বা প্রোডাকশন সার্ভার (`https://your-domain.com`) চালু থাকে, তবে আলাদা কোনো স্ক্রিপ্ট ছাড়াই সরাসরি HTTP URL দিয়ে কানেক্ট করতে পারেন:

* **Cursor**: `.cursor/mcp.json` (প্রজেক্ট রুটে) অথবা `~/.cursor/mcp.json`
* **Antigravity**: `mcp_config.json`

```json
{
  "mcpServers": {
    "second-screen-tokens": {
      "url": "http://localhost:3000/api/v1/mcp?org=acme&project=design-system",
      "headers": {
        "Authorization": "Bearer sec_pat_live_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

#### Option B: Claude Desktop / Cursor / Antigravity (Local Stdio Script Mode)
আপনি যদি লোকাল Node স্ক্রিপ্টের (`stdio`) মাধ্যমে চালাতে চান:

* **Claude Desktop Config Path**:
  * **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
  * **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "second-screen-tokens": {
      "command": "node",
      "args": [
        "d:/GitHub/second-screen/scripts/mcp-server.mjs",
        "--org=acme",
        "--project=design-system",
        "--url=http://localhost:3000"
      ],
      "env": {
        "TOKENS_PLATFORM_PAT": "sec_pat_live_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

#### Option C: VS Code (GitHub Copilot Agent Mode)
আপনার প্রজেক্টের `.vscode/mcp.json` ফাইলে যুক্ত করুন:

```json
{
  "servers": {
    "second-screen-tokens": {
      "type": "http",
      "url": "http://localhost:3000/api/v1/mcp?org=acme&project=design-system",
      "headers": {
        "Authorization": "Bearer sec_pat_live_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

---

### ধাপ ৩: AI-কে কীভাবে প্রম্পট দিয়ে কাজ করাবেন? (Real-World Use Cases)

কনফিগারেশন সেভ করার পর আপনার AI চ্যাটে আপনি স্বাভাবিক ভাষায় (বাংলা, বাংলিশ বা ইংরেজি) নির্দেশ দিলেই AI স্বয়ংক্রিয়ভাবে আমাদের MCP টুলস কল করবে! নিচে ৫টি বাস্তব উদাহরণ দেওয়া হলো:

#### উদাহরণ ১: আসল টোকেন ও আইকন দিয়ে নতুন UI Component তৈরি করা
> **আপনার প্রম্পট**:
> *"আমাদের design-system প্রজেক্টের টোকেন চেক করো। আমাদের ব্র্যান্ড কালার, কার্ড সারফেস, বর্ডার রেডিয়াস এবং স্পেসিং টোকেন ব্যবহার করে একটি রেসপনসিভ 'Subscription Plan Card' বানিয়ে দাও। আর আমাদের অ্যাসেট লাইব্রেরি থেকে 'check' বা 'sparkles' আইকন থাকলে সেটির SVG ব্যবহার করো।"*
>
> **AI যা করবে**:
> 1. `search_tokens` কল করে আপনার আসল রঙ, স্পেসিং ও রেডিয়াস টোকেন বের করবে।
> 2. `search_project_assets` কল করে R2 থেকে আসল SVG আইকন আনবে।
> 3. কোনো অনুমান (Hallucination) ছাড়াই আপনার ডিজাইন সিস্টেমের ১০০% সঠিক ভেরিয়েবল দিয়ে কম্পোনেন্ট তৈরি করবে।

#### উদাহরণ ২: পুরনো কম্পোনেন্টের Hardcoded Hex/Px-কে Design Tokens-এ রূপান্তর করা
> **আপনার প্রম্পট**:
> *"আমার `Navbar.tsx` ফাইলটি দেখো। এখানে অনেক জায়গায় `#1f2937`, `16px`, `8px` এভাবে হার্ডকোড করা আছে। আমাদের MCP সার্ভার থেকে মেচিং টোকেন খুঁজে বের করে সব হার্ডকোডেড ভ্যালুকে আমাদের ডিজাইন সিস্টেমের CSS ভেরিয়েবলে কনভার্ট করে দাও।"*
>
> **AI যা করবে**:
> 1. `search_tokens` দিয়ে ওই রঙ ও সাইজের সমতুল্য টোকেনগুলো খুঁজে বের করবে।
> 2. কোডের সব হার্ডকোডেড মান সরিয়ে সঠিক টোকেন বসিয়ে দেবে।

#### উদাহরণ ৩: চ্যাট থেকেই নতুন ব্রাঞ্চ খুলে নতুন টোকেন যোগ করা
> **আপনার প্রম্পট**:
> *"আমাদের প্রজেক্টে `feature/ai-alerts` নামে একটি নতুন ব্রাঞ্চ তৈরি করো। সেখানে `semantic/dark` সেটে AI Banner-এর জন্য ৩টি নতুন কালার টোকেন (`ai.surface.bg`, `ai.surface.border`, `ai.text.accent`) যোগ করো এবং দেখো টেক্সট ও ব্যাকগ্রাউন্ডের কন্ট্রাস্ট WCAG AA পাস করে কি না।"*
>
> **AI যা করবে**:
> 1. `create_branch` কল করে `feature/ai-alerts` ব্রাঞ্চ তৈরি করবে।
> 2. `check_color_contrast` দিয়ে আগে যাচাই করে নেবে যে রঙ দুটি WCAG AA স্ট্যান্ডার্ড পাস করে।
> 3. `upsert_tokens` কল করে সরাসরি আপনার Supabase ডাটাবেসের ওই ব্রাঞ্চে টোকেন ৩টি কমিট করে দেবে! আপনি ব্রাউজারে গিয়ে সাথে সাথে সেগুলো দেখতে পাবেন।

#### উদাহরণ ৪: যেকোনো প্ল্যাটফর্মের জন্য (CSS / Tailwind / Flutter / SwiftUI) টোকেন এক্সপোর্ট নেওয়া
> **আপনার প্রম্পট**:
> *"আমাদের সর্বশেষ টোকেনগুলো থেকে `ds` প্রিফিক্স দিয়ে CSS Variables এবং Tailwind Config জেনারেট করে `styles/tokens.css` ফাইলে সেভ করে দাও।"*
>
> **AI যা করবে**:
> 1. `export_tokens_code({ format: "css", prefix: "ds" })` কল করবে।
> 2. জেনারেট হওয়া প্রোডাকশন কোড সরাসরি আপনার ফাইলে লিখে দেবে।

#### উদাহরণ ৫: পুরো ডিজাইন সিস্টেমের Health & Accessibility Audit করা
> **আপনার প্রম্পট**:
> *"আমাদের ডিজাইন সিস্টেমের সব টোকেন ভ্যালিডেট করো। কোনো Broken Alias, Deprecated টোকেন বা DTCG স্কিমা এরর আছে কি না রিপোর্ট দাও।"*
>
> **AI যা করবে**:
> 1. `validate_tokens_schema` কল করে ১৮২টি সেলফ-হোস্টেড স্কিমার বিপরীতে আপনার টোকেন সেট পরীক্ষা করবে এবং বিস্তারিত রিপোর্ট দেবে।

---

## Part 7: Security, Guardrails & Troubleshooting

### ৭.১ আমাদের সিকিউরিটি ও আর্কিটেকচারাল গার্ডরেইলসমূহ
1. **Zero External Schema Registry Links (`AGENTS.md` Rule 1)**:
   * MCP সার্ভারের কোনো টুল বা রিসোর্স কখনোই কোনো বাহ্যিক ডোমেইনে (`registry.tokens.studio` ইত্যাদি) লিংক করবে না। সব স্কিমা ডাইনামিকভাবে আপনার নিজস্ব অরিজিন (`/api/v1/schemas/...`) থেকে লোড হবে।
2. **High-Scale Memory & Context Window Safety (`AGENTS.md` Rule 4)**:
   * ১৩,০০০+ টোকেনের প্রজেক্টেও যাতে মেমোরি বা LLM Context Window ওভারফ্লো না হয়, তাই প্রতিটি লিস্ট টুলে পেজিনেশন (`limit <= 200`) এবং $O(1)$ ইন-মেমোরি লুকআপ বাধ্যতামূলক।
3. **Project-Bound Keys, Safe Writes & Rate Limits (P0)**:
   * MCP কী একটি প্রজেক্টে bound; write-এ স্পষ্ট প্রজেক্ট, `expectedUpdatedAt`, `main`-এ ডিফল্ট নিষেধ, `dryRun`, per-key rate limit, আউটপুট cap।
4. **Strict Multi-Tenant Isolation & RBAC**:
   * প্রতিটি MCP কলে PAT-এর SHA-256 হ্যাশ যাচাই করা হয় (`public.api_keys`) এবং চেক করা হয় ইউজার ওই Organization-এর সদস্য কি না।
   * যদি ইউজারের রোল `viewer` হয় অথবা PAT-এ `write:tokens` স্কোপ না থাকে, তবে কোনো রাইট টুল (`upsert_tokens`, `delete_tokens`, `create_branch`) কাজ করবে না—সরাসরি `403 Forbidden` রিটার্ন করবে।

### ৭.২ সাধারণ সমস্যার সমাধান (Troubleshooting FAQ)

| সমস্যা / Error | কেন হয়? | কীভাবে সমাধান করবেন? |
| :--- | :--- | :--- |
| **`401 Unauthorized: Invalid or revoked API key`** | `TOKENS_PLATFORM_PAT` ভুল দেওয়া হয়েছে, মেয়াদ শেষ হয়েছে, অথবা রিভোক করা হয়েছে। | **Developers** পেজে গিয়ে একটি নতুন PAT জেনারেট করুন এবং `mcp_config.json`-এ আপডেট করুন। |
| **`403 Forbidden: Key lacks 'write:tokens' permission`** | আপনার PAT শুধুমাত্র `read:tokens` দিয়ে খোলা, কিন্তু আপনি AI-কে টোকেন তৈরি বা এডিট করতে বলেছেন। | নতুন একটি PAT জেনারেট করার সময় `write:tokens` চেকবক্সে টিক দিন। |
| **`404 Project not found`** | কনফিগে দেওয়া `--org` বা `--project` স্লাগ/আইডি ভুল আপনি ওই Workspace-এর মেম্বার নন, অথবা PAT অন্য প্রজেক্টে bound। | AI-কে বলুন `"Run list_workspaces to see my available orgs and projects"` অথবা **Developers** পেজ থেকে সঠিক স্নিপেট কপি করুন। |
| **`conflict` / `Ambiguous project`** | অন্য কেউ আগে টোকেন বদলেছে (`expectedUpdatedAt` মেলেনি), অথবা একই slug একাধিক প্রজেক্টে। | AI-কে আবার read করতে বলুন / project ID ব্যবহার করুন। |
| **IDE-তে MCP Tools দেখাচ্ছে না** | কনফিগ ফাইল সেভ করার পর IDE রিলোড করা হয়নি বা ডেভ সার্ভার (`npm run dev`) বন্ধ আছে। | আপনার Next.js সার্ভার চালু আছে কি না নিশ্চিত করুন এবং IDE-তে MCP Server **Refresh / Restart** বাটনে ক্লিক করুন। |

