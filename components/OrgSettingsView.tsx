"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Building2,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Save,
  ArrowLeft,
  Upload,
  ImageIcon,
  Palette,
  X,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPickerWithShades } from "@/components/ColorPickerWithShades";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const OrgSettingsView: React.FC = () => {
  const {
    currentOrg,
    userOrgs,
    currentUser,
    orgProjects,
    updateOrgAction,
    deleteOrgAction,
    addToast,
    getCurrentUserRole,
    setSidebarTab,
  } = useTokenStore();

  const userRole = getCurrentUserRole();
  const isOwner = currentOrg?.ownerUid === currentUser?.uid || userRole === "owner";

  const [orgName, setOrgName] = useState(currentOrg?.name || "");
  const [orgSlug, setOrgSlug] = useState(currentOrg?.slug || "");
  const [orgColor, setOrgColor] = useState(currentOrg?.color || "#171717");
  const [orgLogoUrl, setOrgLogoUrl] = useState(currentOrg?.logoUrl || "");
  const [copiedId, setCopiedId] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Danger Zone confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Sync state when currentOrg changes
  useEffect(() => {
    if (currentOrg) {
      setOrgName(currentOrg.name);
      setOrgSlug(currentOrg.slug || "");
      setOrgColor(currentOrg.color || "#171717");
      setOrgLogoUrl(currentOrg.logoUrl || "");
    }
  }, [currentOrg]);

  const hasChanges = useMemo(() => {
    if (!currentOrg) return false;
    return Boolean(
      orgName.trim() !== currentOrg.name ||
      orgSlug.trim() !== (currentOrg.slug || "") ||
      orgColor !== (currentOrg.color || "#171717") ||
      orgLogoUrl.trim() !== (currentOrg.logoUrl || "")
    );
  }, [currentOrg, orgName, orgSlug, orgColor, orgLogoUrl]);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast({
        type: "error",
        title: "File Too Large",
        message: "Please select an image smaller than 2MB.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setOrgLogoUrl(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCopyOrgId = () => {
    if (currentOrg) {
      navigator.clipboard.writeText(currentOrg.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      addToast({
        type: "success",
        title: "Organization ID Copied",
        message: "Copied organization identifier to clipboard.",
      });
    }
  };

  const handleSaveOrgProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentOrg || !orgName.trim()) return;

    setIsSaving(true);
    try {
      await updateOrgAction(currentOrg.id, {
        name: orgName.trim(),
        slug: orgSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        color: orgColor,
        icon: currentOrg.icon || "🏢",
        logoUrl: orgLogoUrl.trim(),
      });

      addToast({
        type: "success",
        title: "Workspace Updated",
        message: "Workspace details and branding have been saved.",
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Update Failed",
        message: err.message || "Could not update organization.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (!currentOrg) return;
    if (userOrgs.length <= 1) {
      addToast({
        type: "error",
        title: "Cannot Delete",
        message: "You cannot delete your only organization. Please create another workspace first.",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteOrgAction(currentOrg.id);
      setShowDeleteConfirm(false);
      addToast({
        type: "success",
        title: "Organization Deleted",
        message: `Organization "${currentOrg.name}" was permanently removed.`,
      });
      setSidebarTab("dashboard");
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        message: err.message || "Failed to delete organization.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentOrg) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background text-foreground font-sans">
        <Building2 className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <h2 className="text-base font-bold text-foreground">No Workspace Selected</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mb-4">
          Please select or create a workspace to view its settings.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarTab("dashboard")}
          className="text-xs gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go to Overview</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background text-foreground font-sans select-none">
      {/* Sticky Top Header */}
      <header className="px-6 sm:px-10 py-4 border-b border-border/70 bg-background/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between gap-4 transition-colors">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 select-none">
            <button
              onClick={() => setSidebarTab("dashboard")}
              className="hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-semibold truncate max-w-[240px]">
              {currentOrg.name}
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-muted-foreground">Settings</span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] rounded-xl flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-border/80 shadow-2xs"
              style={{
                width: 32,
                height: 32,
                minWidth: 32,
                minHeight: 32,
                backgroundColor: orgLogoUrl ? undefined : (orgColor || "hsl(var(--primary))"),
                color: orgColor ? "#fff" : "hsl(var(--primary-foreground))",
              }}
            >
              {orgLogoUrl ? (
                <img src={orgLogoUrl} alt={orgName} className="w-full h-full object-cover block" />
              ) : (
                <span>{orgName?.charAt(0)?.toUpperCase() || "W"}</span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight leading-tight">
                Workspace Settings
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Form */}
      <main className="max-w-4xl w-full mx-auto p-6 sm:p-10 space-y-6">
        <form onSubmit={handleSaveOrgProfile} className="space-y-6">
          {/* Card 1: General Details */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="border-b border-border/70 pb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span>General Details</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Basic workspace profile, title, and public routing identifiers.
              </p>
            </div>

            <div className="space-y-4">
              {/* Workspace Name & URL Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Workspace Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    disabled={!isOwner}
                    placeholder="e.g. Acme Design System"
                    className="h-9 text-xs bg-background"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Human-readable display name for this workspace.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    URL Slug <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                    disabled={!isOwner}
                    required
                    placeholder="e.g. acme-design-system"
                    className="h-9 text-xs font-mono bg-background"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Custom public URL identifier used in documentation (<span className="font-mono">/docs/{orgSlug || "slug"}</span>).
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Brand Identity */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  <span>Brand Identity</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customize the visual identity, uploaded logo, and theme accent colors.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Workspace Logo */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Workspace Logo <span className="text-muted-foreground font-normal">(Optional)</span></span>
                </Label>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border/70 bg-muted/20">
                  {/* Strict Fixed-Size Interactive Avatar Preview */}
                  <div
                    onClick={() => isOwner && fileInputRef.current?.click()}
                    className={`w-16 h-16 min-w-[64px] min-h-[64px] max-w-[64px] max-h-[64px] rounded-2xl flex items-center justify-center font-bold text-base shrink-0 overflow-hidden border border-border bg-card shadow-xs transition-all relative group ${
                      isOwner ? "cursor-pointer hover:border-primary/50 hover:shadow-sm" : ""
                    }`}
                    style={{
                      width: 64,
                      height: 64,
                      minWidth: 64,
                      minHeight: 64,
                      maxWidth: 64,
                      maxHeight: 64,
                      backgroundColor: orgLogoUrl ? undefined : (orgColor || "hsl(var(--primary))"),
                      color: orgColor ? "#fff" : "hsl(var(--primary-foreground))",
                    }}
                    title={isOwner ? "Click to upload workspace logo" : undefined}
                  >
                    {orgLogoUrl ? (
                      <img
                        src={orgLogoUrl}
                        alt="Workspace Logo"
                        className="w-full h-full object-cover block"
                        onError={() => setOrgLogoUrl("")}
                      />
                    ) : (
                      <span>{orgName?.charAt(0)?.toUpperCase() || "W"}</span>
                    )}

                    {isOwner && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-2xs">
                        <Upload className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Actions & Details — Single Row Layout */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 min-w-0">
                        <Input
                          value={orgLogoUrl.startsWith("data:") ? "" : orgLogoUrl}
                          onChange={(e) => setOrgLogoUrl(e.target.value)}
                          placeholder={
                            orgLogoUrl.startsWith("data:")
                              ? "Custom image uploaded (or paste image URL)"
                              : "Paste image URL (https://...) or upload file"
                          }
                          disabled={!isOwner}
                          className="h-9 text-xs font-mono bg-background w-full pr-8"
                        />
                        {orgLogoUrl && !orgLogoUrl.startsWith("data:") && isOwner && (
                          <button
                            type="button"
                            onClick={() => setOrgLogoUrl("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-1 rounded-sm cursor-pointer transition-colors"
                            title="Clear image URL"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!isOwner}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 px-3 text-xs gap-1.5 shrink-0 cursor-pointer shadow-2xs font-medium"
                        title="Upload image from computer"
                      >
                        <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{orgLogoUrl ? "Change" : "Upload Image"}</span>
                      </Button>

                      {orgLogoUrl && isOwner && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setOrgLogoUrl("")}
                          className="h-9 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer gap-1.5 shrink-0 font-medium transition-colors"
                          title="Remove workspace logo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </Button>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Square SVG, PNG, or JPG recommended (max 2MB). Automatically syncs across navigation headers and project switchers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Brand Accent Color */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <Label className="text-xs font-semibold text-foreground">Brand Accent Color</Label>
                <div className={!isOwner ? "pointer-events-none opacity-60" : undefined}>
                  <ColorPickerWithShades value={orgColor} onChange={setOrgColor} />
                </div>
              </div>

              {/* Save Changes Bottom Button */}
              {isOwner && (
                <div className="flex items-center justify-between pt-4 border-t border-border/70">
                  <div className="text-xs text-muted-foreground">
                    {hasChanges ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        You have unsaved changes in this workspace.
                      </span>
                    ) : (
                      <span>All changes are saved.</span>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={isSaving || !hasChanges || !orgName.trim()}
                    className="h-9 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                  </Button>
                </div>
              )}
            </div>
          </section>
        </form>

        {/* Card 3: Developer & API Reference */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span>Developer & API Reference</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Technical identifiers and endpoint configuration for MCP servers, CI/CD, and the Figma plugin.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Workspace Identifier (ID)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={currentOrg.id}
                  readOnly
                  disabled
                  className="h-9 text-xs font-mono bg-muted/40 text-muted-foreground flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleCopyOrgId}
                  className="h-9 text-xs gap-1.5 px-3 shrink-0 cursor-pointer shadow-2xs font-medium"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId ? "Copied" : "Copy ID"}</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Immutable identifier for REST tokens queries (<span className="font-mono">/api/v1/tokens?orgId={currentOrg.id}</span>) and MCP server integration.
              </p>
            </div>
          </div>
        </section>

        {/* Card 4: Danger Zone (Owners Only) */}
        {isOwner && (
          <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-destructive/20 pb-3">
              <div>
                <h2 className="text-sm font-bold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Danger Zone</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Irreversible administrative actions for this entire workspace.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <div className="text-xs font-semibold text-foreground">Delete this Workspace</div>
                <div className="text-[11px] text-muted-foreground">
                  Permanently delete <strong>{currentOrg.name}</strong>, all its design token projects, and revoke all member access.
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="h-8 text-xs gap-1.5 cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Workspace</span>
              </Button>
            </div>
          </section>
        )}
      </main>

      {/* Delete Org Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md p-6 gap-4 font-sans">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Delete Workspace</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This action cannot be undone. This will permanently delete the <strong>{currentOrg.name}</strong> workspace and all {orgProjects.length} associated design tokens projects.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">
              Type <span className="font-mono text-destructive">{currentOrg.name}</span> to confirm:
            </Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={currentOrg.name}
              className="h-9 text-xs font-mono"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText("");
              }}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting || deleteConfirmText !== currentOrg.name}
              onClick={handleDeleteOrg}
              className="text-xs h-9 font-bold gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? "Deleting..." : "I understand, delete this workspace"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
