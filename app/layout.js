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
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
      <NotificationPermission />
        {children}
      </body>
    </html>
  );
}
