"use client";

import React, { useState } from "react";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Building2,
  FolderGit2,
  Users,
  ShieldCheck,
  Crown,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Layers,
  Save,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    currentUser,
    orgProjects,
    updateOrgAction,
    addToast,
    getCurrentUserRole,
    setSidebarTab,
  } = useTokenStore();

  const userRole = getCurrentUserRole();
  const isOwner = currentOrg?.ownerUid === currentUser?.uid || userRole === "owner";

  const [orgName, setOrgName] = useState(currentOrg?.name || "");
  const [copiedId, setCopiedId] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when currentOrg changes
  React.useEffect(() => {
    if (currentOrg?.name) {
      setOrgName(currentOrg.name);
    }
  }, [currentOrg]);

  // Danger Zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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

  const handleSaveOrgProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !orgName.trim()) return;

    setIsSaving(true);
    try {
      await updateOrgAction(currentOrg.id, { name: orgName.trim() });

      addToast({
        type: "success",
        title: "Organization Updated",
        message: `Saved workspace name as "${orgName.trim()}".`,
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

  if (!currentOrg) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <h2 className="text-base font-bold text-foreground">No Organization Selected</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Please select or create an organization to view organization settings.
        </p>
      </div>
    );
  }

  const members = currentOrg.members || [];
  const ownerMember = members.find((m) => m.uid === currentOrg.ownerUid) || members[0];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background text-foreground font-sans">
      {/* Top Header */}
      <div className="px-8 py-6 border-b border-border/80 bg-card/40 backdrop-blur sticky top-0 z-10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>{currentOrg.name}</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Organization Settings</span>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span>Organization Settings</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarTab("members")}
            className="text-xs h-8 gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Members</span>
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl w-full mx-auto p-8 space-y-8">
        {/* Section 1: Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Projects</span>
              <FolderGit2 className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground font-mono">
              {orgProjects.length}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Active design token projects
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Team Members</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground font-mono">
              {members.length}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Designers &amp; developers
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Platform Tier</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-base font-bold text-foreground flex items-center gap-1.5 pt-1">
              <span>Enterprise Hub</span>
              <Badge variant="violet" className="text-[9px] px-1 py-0 font-normal">Active</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Multi-tenant tokens &amp; Figma sync
            </p>
          </div>
        </div>

        {/* Section 2: Organization Profile */}
        <form onSubmit={handleSaveOrgProfile} className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Organization Details</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Branding and workspace identification.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              Created {new Date(currentOrg.createdAt).toLocaleDateString()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Organization Name</Label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!isOwner}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Organization Slug</Label>
              <Input
                value={currentOrg.slug}
                readOnly
                disabled
                className="h-9 text-xs bg-muted/50 font-mono"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Organization Unique Identifier (ID)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={currentOrg.id}
                  readOnly
                  disabled
                  className="h-9 text-xs font-mono bg-muted/50 flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleCopyOrgId}
                  className="h-9 text-xs gap-1.5 px-3"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId ? "Copied" : "Copy ID"}</span>
                </Button>
              </div>
            </div>

            {/* Owner Details Card */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Organization Owner</Label>
              <div className="p-3.5 rounded-lg bg-muted/30 border border-border/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20">
                    {ownerMember?.displayName ? ownerMember.displayName.charAt(0).toUpperCase() : "O"}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>{ownerMember?.displayName || ownerMember?.email?.split("@")[0] || "Owner"}</span>
                      <Crown className="w-3 h-3 text-amber-500" />
                    </div>
                    <div className="text-[11px] text-muted-foreground">{ownerMember?.email}</div>
                  </div>
                </div>
                <Badge variant="violet" className="text-[10px]">Owner</Badge>
              </div>
            </div>
          </div>

          {isOwner && (
            <div className="flex justify-end pt-2 border-t border-border/70">
              <Button
                type="submit"
                disabled={isSaving || !orgName.trim() || orgName === currentOrg.name}
                className="h-9 text-xs font-bold gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </Button>
            </div>
          )}
        </form>

        {/* Section 3: Danger Zone */}
        {isOwner && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-destructive/20 pb-3">
              <div>
                <h2 className="text-sm font-bold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Danger Zone</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Irreversible actions for this entire organization.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground">Delete this Organization</div>
                <div className="text-[11px] text-muted-foreground">
                  Permanently delete <strong>{currentOrg.name}</strong>, all its projects, and remove all member access.
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="h-8 text-xs gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Organization</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Org Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md p-6 gap-4 font-sans">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Delete Organization</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This action cannot be undone. This will permanently delete the <strong>{currentOrg.name}</strong> organization and all {orgProjects.length} associated design tokens projects.
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
              disabled={deleteConfirmText !== currentOrg.name}
              onClick={() => {
                setShowDeleteConfirm(false);
                addToast({
                  type: "success",
                  title: "Organization Deleted",
                  message: `Organization ${currentOrg.name} was removed.`,
                });
                setSidebarTab("dashboard");
              }}
              className="text-xs h-9 font-bold gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>I understand, delete this organization</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
