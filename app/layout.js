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
    icon: '/icon512_rounded.png',
    apple: '/icon512_maskable.png', // Hier wird das Apple Touch Icon gesetzt
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <link rel="apple-touch-icon" sizes="512x512" href="/icon512_maskable.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
      <NotificationPermission />
        {children}
      </body>
    </html>
  );
}
