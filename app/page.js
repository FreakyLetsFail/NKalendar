// app/page.js
"use client";

import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    // Hier könntest du weitere Logik einbauen, z.B. das Erkennen,
    // ob die App bereits installiert ist, und dann den Installationsprompt ausblenden.
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-xl">
      <h1 className="text-3xl font-bold mb-4">Willkommen bei Noni-Kalendar!</h1>
      <p className="mb-4">
        Diese App ist als Progressive Web App (PWA) konzipiert. Damit du alle Vorteile nutzen kannst, füge sie bitte zu deinem Home‑Bildschirm hinzu.
      </p>
      <div className="p-4 border rounded bg-gray-100 mb-4">
        <h2 className="text-xl font-bold mb-2">Zum Home‑Bildschirm hinzufügen</h2>
        <ul className="list-disc ml-6">
          <li>Öffne diese Seite in Safari oder Chrome auf deinem Gerät.</li>
          <li>Tippe auf das Teilen‑Symbol (das Quadrat mit dem Pfeil nach oben).</li>
          <li>Wähle "Zum Home‑Bildschirm" aus.</li>
          <li>Bestätige die Installation.</li>
        </ul>
      </div>
      <p className="text-gray-700">
        Sobald die App installiert ist, erhältst du automatisch Push-Benachrichtigungen für anstehende Events.
      </p>
    </div>
  );
}