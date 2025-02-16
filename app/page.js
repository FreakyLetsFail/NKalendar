"use client";

import { useState, useEffect } from "react";
import { AiOutlineHome } from "react-icons/ai";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [deviceType, setDeviceType] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  // Gerätetyp ermitteln
  useEffect(() => {
    const ua = window.navigator.userAgent || window.navigator.vendor || window.opera;
    if (/android/i.test(ua)) {
      setDeviceType("android");
    } else if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      setDeviceType("ios");
    } else {
      setDeviceType("desktop");
      window.location.href = "/calendar"; // Desktop: Weiterleitung
    }
  }, []);

  // Android: beforeinstallprompt abfangen
  useEffect(() => {
    if (deviceType === "android") {
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallButton(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, [deviceType]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(
        outcome === "accepted"
          ? "User accepted the install prompt"
          : "User dismissed the install prompt"
      );
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  // Render-Funktion für Anleitungen, je nach Gerätetyp
  const renderInstructions = () => {
    if (deviceType === "android") {
      return (
        <>
          <div className="p-4 border-l-4 border-indigo-500 bg-indigo-50 rounded-md mb-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-800">
              Anleitung zum Hinzufügen (Android)
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Öffne diese Seite in Chrome auf deinem Android-Gerät.</li>
              <li>Tippe auf das Menü- oder Teilen-Symbol.</li>
              <li>Wähle „Zum Startbildschirm hinzufügen“ aus.</li>
              <li>Bestätige die Installation.</li>
            </ul>
          </div>
          {showInstallButton && (
            <div className="mb-6 text-center">
              <Button onClick={handleInstallClick}>
                Zum Home‑Bildschirm hinzufügen
              </Button>
            </div>
          )}
        </>
      );
    } else if (deviceType === "ios") {
      return (
        <div className="p-4 border-l-4 border-pink-500 bg-pink-50 rounded-md mb-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">
            Anleitung zum Hinzufügen (iOS)
          </h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Öffne diese Seite in Safari auf deinem iPhone oder iPad.</li>
            <li>Tippe auf das Teilen-Symbol.</li>
            <li>Wähle „Zum Home‑Bildschirm hinzufügen“ aus.</li>
            <li>Bestätige die Installation.</li>
          </ul>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-100 via-white to-pink-100 px-4">
      <div className="max-w-xl w-full bg-white rounded-lg shadow-xl p-6 space-y-6 border border-gray-200">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800 flex items-center justify-center gap-2">
          <AiOutlineHome className="text-indigo-600 text-4xl" />
          Semesterprogramm der B! Norddeutsche und Niedersachsen
        </h1>

        <p className="text-gray-700 text-center leading-relaxed">
          Diese App ist als Progressive Web App (PWA) konzipiert. Füge sie bitte
          zu deinem Home‑Bildschirm hinzu, um alle Vorteile zu nutzen.
        </p>

        {/* Anleitungen (Android/iOS) */}
        {renderInstructions()}

        <p className="text-gray-700 text-center leading-relaxed">
          Sobald die App installiert ist, erhältst du automatisch Push‑Benachrichtigungen 
          für anstehende Events.
        </p>
      </div>
    </div>
  );
}
