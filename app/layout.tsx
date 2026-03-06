import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AvatarLive - Interactive Video Chatbot",
  description:
    "Talk to lifelike animated characters with real-time voice and video. Powered by AI.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AvatarLive",
    startupImage: [
      {
        url: "/splash/apple-splash-2048-2732.png",
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1668-2388.png",
        media:
          "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1536-2048.png",
        media:
          "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "AvatarLive - Interactive Video Chatbot",
    description: "Talk to lifelike animated characters with real-time voice and video.",
    type: "website",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AvatarLive",
    description: "Talk to lifelike animated characters with real-time voice and video.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Preconnect to external services for faster loading */}
        <link rel="preconnect" href="https://api.d-id.com" />
        <link rel="preconnect" href="https://api.deepgram.com" />
        <link rel="dns-prefetch" href="https://api.anthropic.com" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-background min-h-screen overflow-hidden`}
      >
        {/* Main app content */}
        {children}

        {/* Toast notifications */}
        <Toaster />

        {/* PWA install prompt script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Store the install prompt for later use
              let deferredPrompt;
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                window.deferredPrompt = deferredPrompt;
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
