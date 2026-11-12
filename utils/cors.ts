import { NextRequest, NextResponse } from "next/server";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Mcp-Protocol-Version, Last-Event-ID",
};

function configuredTrustedOrigins(req: NextRequest): string[] {
  const configured = (process.env.SECOND_SCREEN_TRUSTED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configured.length > 0 ? configured : [req.nextUrl.origin];
}

export function getTrustedCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = origin && configuredTrustedOrigins(req).includes(origin) ? origin : undefined;

  return {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Mcp-Protocol-Version, Last-Event-ID",
    ...(allowed ? { "Access-Control-Allow-Origin": allowed, Vary: "Origin" } : {}),
  };
}

export function handleOptionsCors() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function handleTrustedOptionsCors(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getTrustedCorsHeaders(req),
  });
}

export function jsonWithCors(data: any, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(data, {
    status: init?.status || 200,
    headers: {
      ...corsHeaders,
      ...(init?.headers || {}),
    },
  });
}

export function jsonWithTrustedCors(
  req: NextRequest,
  data: unknown,
  init?: { status?: number; headers?: HeadersInit },
) {
  return NextResponse.json(data, {
    status: init?.status || 200,
    headers: {
      ...getTrustedCorsHeaders(req),
      ...(init?.headers || {}),
    },
  });
}
