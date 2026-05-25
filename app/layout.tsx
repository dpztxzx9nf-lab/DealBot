import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DealBot",
  description: "Find underpriced items you can resell locally.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DealBot",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full dark`}>
      <body className="min-h-dvh overflow-x-hidden bg-zinc-950 font-sans text-zinc-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
