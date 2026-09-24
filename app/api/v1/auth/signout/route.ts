import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
      });

      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Server-side Supabase signOut error:", e);
    }
  }

  // Explicitly expire and delete all cookies associated with Supabase auth
  const allCookies = request.cookies.getAll();
  for (const c of allCookies) {
    if (c.name.startsWith("sb-") || c.name.includes("supabase")) {
      response.cookies.delete(c.name);
    }
  }

  return response;
}
