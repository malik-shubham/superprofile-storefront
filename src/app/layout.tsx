import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { publicOrigin } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute base for link-preview tags (WhatsApp, Instagram DMs).
  metadataBase: new URL(publicOrigin() ?? "http://localhost:3000"),
  title: "AI Storefront Generator",
  description: "Tell us what you do. Get a ready-to-share store with products, INR prices and a bio in 2 minutes.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
