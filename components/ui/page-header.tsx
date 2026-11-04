import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Rendered above the title, e.g. a back link. */
  leading?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  leading,
  className,
}) => (
  <header
    className={cn(
      "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
      className
    )}
  >
    <div className="min-w-0">
      {leading}
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
    {actions && (
      <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
    )}
  </header>
);