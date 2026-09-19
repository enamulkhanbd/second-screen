import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tokens Platform — Single source of truth for Design Tokens",
  description:
    "Real-time two-way sync web interface for Tokens Studio design tokens across GitHub and Azure DevOps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased flex flex-col font-sans text-[14px] leading-relaxed">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
