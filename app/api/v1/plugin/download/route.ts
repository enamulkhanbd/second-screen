import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/plugin/download
 * Generates and returns a downloadable .zip bundle containing the private Figma plugin
 */
export async function GET() {
  try {
    const zip = new JSZip();

    const pluginDir = path.join(process.cwd(), "plugin");
    const manifestPath = path.join(pluginDir, "manifest.json");
    const codePath = path.join(pluginDir, "code.js");
    const uiPath = path.join(pluginDir, "ui.html");

    if (fs.existsSync(manifestPath)) {
      zip.file("manifest.json", fs.readFileSync(manifestPath, "utf8"));
    }
    if (fs.existsSync(codePath)) {
      zip.file("code.js", fs.readFileSync(codePath, "utf8"));
    }
    if (fs.existsSync(uiPath)) {
      zip.file("ui.html", fs.readFileSync(uiPath, "utf8"));
    }

    const readme = `# Second Screen — Private Figma Plugin

## Quick Installation in Figma Desktop:
1. Extract this ZIP archive to a permanent folder on your computer.
2. In Figma Desktop app, navigate to **Menu (Figma logo) ➔ Plugins ➔ Development ➔ Import plugin from manifest...**.
3. Select the \`manifest.json\` file inside this folder.
4. Launch the plugin via **Plugins ➔ Development ➔ Second Screen — Design Tokens**.

## Cloud Connection:
1. Open the plugin's **Settings** tab.
2. Enter your Second Screen Web App URL (e.g. \`http://localhost:3000\`).
3. Enter your Personal Access Token (PAT) generated in Second Screen Project Settings.
4. Click **Pull Tokens to Figma** to sync!
`;
    zip.file("README.md", readme);

    const content = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(content as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="second-screen-figma-plugin.zip"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
