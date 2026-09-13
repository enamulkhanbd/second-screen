"use client";

import React, { useState } from "react";
import { SchemaItem } from "@/data/schemaCatalog";
import { useTokenStore } from "@/store/useTokenStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, ArrowUpRight, Check, Copy } from "lucide-react";

interface ExtensionDetailModalProps {
  item: SchemaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExtensionDetailModal: React.FC<ExtensionDetailModalProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  const { enabledSchemas, toggleSchemaAction, canUserEdit } = useTokenStore();
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isEnabled = item ? enabledSchemas.includes(item.id) : false;
  const isEditable = canUserEdit();

  const fullSchemaUrl = React.useMemo(() => {
    if (!item?.schemaUrl) return "";
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      return item.schemaUrl.startsWith("http")
        ? item.schemaUrl
        : `${origin}${item.schemaUrl.startsWith("/") ? "" : "/"}${item.schemaUrl}`;
    }
    return item.schemaUrl;
  }, [item?.schemaUrl]);

  if (!item) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullSchemaUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      await toggleSchemaAction(item.id);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        style={{ overflow: "hidden" }}
        className="max-w-xl w-full flex flex-col overflow-hidden bg-[#121316] border-[#23252a] text-white p-6 sm:p-7 sm:rounded-2xl shadow-2xl gap-0"
      >
        <DialogHeader className="w-full min-w-0 space-y-2 text-left pr-6">
          <DialogTitle className="text-xl font-bold tracking-tight text-white truncate">
            {item.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-300 leading-relaxed font-normal pt-1">
            {item.description || "Design token schema definition."}
          </DialogDescription>
        </DialogHeader>

        {/* Badges Row - Matches Image 2 pills */}
        <div className="flex items-center gap-2 mt-4">
          <Badge
            variant="outline"
            className="text-xs px-3 py-0.5 font-medium rounded-full bg-[#142918] text-[#4ade80] border-[#234d28]"
          >
            {item.typeTag}
          </Badge>

          {isEnabled ? (
            <Badge
              variant="outline"
              className="text-xs px-3 py-0.5 font-medium rounded-full bg-[#183920] text-[#4ade80] border-[#2ea347]/60"
            >
              Enabled
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-xs px-3 py-0.5 font-medium rounded-full bg-[#142918] text-[#4ade80] border-[#234d28]"
            >
              Available
            </Badge>
          )}
        </div>

        {/* Schema URL Link Box - Matches Image 2 */}
        <div className="mt-4 w-full min-w-0 max-w-full overflow-hidden p-3 rounded-lg border border-[#222429] bg-[#0c0d10] flex items-center justify-between gap-3 group">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            <Link2 className="size-4 shrink-0 text-zinc-400 rotate-[-45deg]" />
            <a
              href={fullSchemaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate font-mono text-xs text-zinc-200 hover:text-white transition-colors min-w-0"
              title={fullSchemaUrl}
            >
              {fullSchemaUrl}
            </a>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copy URL"
              className="p-1 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            </button>
            <a
              href={fullSchemaUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open schema in new tab"
              className="p-1 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>

        {/* Footer actions with horizontal rule - Matches Image 2 */}
        <div className="mt-6 pt-4 border-t border-[#23252a] flex items-center justify-end gap-2.5">
          {isEditable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUpdating}
              onClick={handleToggle}
              className={`text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                isEnabled
                  ? "bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500"
              }`}
            >
              {isEnabled ? "Disable Extension" : "Enable Extension"}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="bg-[#18191d] hover:bg-[#25262c] text-white border border-[#2c2e35] rounded-lg px-5 py-2 text-xs font-semibold cursor-pointer transition-colors"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
