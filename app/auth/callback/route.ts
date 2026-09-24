import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const targetOrigin = !isLocalEnv && forwardedHost ? `https://${forwardedHost}` : origin;

  // If Supabase returned an OAuth error or cancellation
  if (error || errorDescription) {
    // If the user simply cancelled (access_denied), redirect back to login page cleanly
    if (error === "access_denied" || errorDescription?.toLowerCase().includes("denied")) {
      return NextResponse.redirect(`${targetOrigin}${next}`);
    }

    console.error("Auth callback received error from OAuth provider:", error, errorDescription);
    const friendlyMsg = errorDescription?.includes("client secret is invalid")
      ? "Google OAuth Client Secret configured in Supabase is invalid. In Google Cloud Console, copy the Web Client Secret (starts with GOCSPX-)."
      : (errorDescription || error || "OAuth authentication failed.");
    return NextResponse.redirect(`${targetOrigin}${next}?auth_error=${encodeURIComponent(friendlyMsg)}`);
  }

  const response = NextResponse.redirect(`${targetOrigin}${next}`);

  if (code) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options);
              });
            },
          },
        }
      );

      const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeErr) {
        console.error("Auth callback exchange error:", exchangeErr.message);
        // Fallback: pass code to client to attempt browser-side PKCE exchange
        return NextResponse.redirect(`${targetOrigin}${next}?code=${encodeURIComponent(code)}`);
      }
    } catch (e: any) {
      console.error("Auth callback exception:", e);
      return NextResponse.redirect(`${targetOrigin}${next}?auth_error=${encodeURIComponent(e.message || "Session exchange failed")}`);
    }
  }

  return response;
}
