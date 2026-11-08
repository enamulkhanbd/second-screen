"use client";

import React, { createContext, useContext } from "react";
import { FlattenedToken, RawTokensDocument } from "@/types/tokens";

export interface DocsTokensContextValue {
  resolvedTokens: FlattenedToken[];
  figmaResolvedVariables: FlattenedToken[];
  figmaVariables: RawTokensDocument;
}

const DocsTokensContext = createContext<DocsTokensContextValue | null>(null);

export const DocsTokensProvider = DocsTokensContext.Provider;

export function useDocsTokens(): DocsTokensContextValue | null {
  return useContext(DocsTokensContext);
}

