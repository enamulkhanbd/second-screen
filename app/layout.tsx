import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-[#0d0d11] text-black dark:text-zinc-100 min-h-screen antialiased flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
