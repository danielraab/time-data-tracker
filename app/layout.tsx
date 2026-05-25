import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { SyncProvider } from "@/lib/db/sync-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TiDaTra – Time & Data Tracker",
  description:
    "Offline-first tracker for time series, durations and data points.",
  applicationName: "TiDaTra",
  appleWebApp: {
    capable: true,
    title: "TiDaTra",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#171717",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SyncProvider>
          <AppHeader />
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
            {children}
          </main>
          <AppFooter />
        </SyncProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
