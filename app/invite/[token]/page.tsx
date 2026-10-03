import type { Metadata } from "next";
import { InviteLandingView } from "@/components/InviteLandingView";

export const metadata: Metadata = {
  title: "You're invited — Tokens Platform",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function InvitePage({ params }: { params: { token: string } }) {
  return <InviteLandingView token={params.token} />;
}
