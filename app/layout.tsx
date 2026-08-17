import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tokens Studio — Second Screen Web Viewer",
  description:
    "Real-time two-way sync web interface for Tokens Studio design tokens across GitHub and Azure DevOps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0d0d11] text-zinc-100 min-h-screen antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
