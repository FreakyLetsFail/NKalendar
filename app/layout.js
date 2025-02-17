import { Geist, Geist_Mono } from "next/font/google";
import NotificationPermission from "@/components/NotificationPermission";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Kalender PWA",
  description: "Ein Echtzeit-Kalender mit PWA-Benachrichtigungen",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/512.png",
    apple: "/icons/apple-touch-icon.png"
  }
};

export const viewport = {
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
  shrinkToFit: "no",
  viewportFit: "cover"
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        {/* Absolute Pfade sicherstellen */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon-precomposed" href="/icons/180.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NotificationPermission />
        {children}
      </body>
    </html>
  );
}
