"use client";

import { useEffect } from "react";
// Beispiel-Icon, falls gewünscht:
import { AiOutlineHome } from "react-icons/ai";

export default function HomePage() {
  useEffect(() => {
    // Hier könntest du weitere Logik einbauen, z.B. das Erkennen,
    // ob die App bereits installiert ist, und dann den Installationsprompt ausblenden.
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-blue-700 flex items-center justify-center gap-2">
          Norddeutsche und Niedersachsen Kalendar
        </h1>
        <p className="mb-6 text-gray-700 text-center">
          Diese App ist als Progressive Web App (PWA) konzipiert. Damit du alle Vorteile nutzen kannst, füge sie bitte zu deinem Home‑Bildschirm hinzu.
        </p>
        <div className="p-4 border-l-4 border-blue-300 bg-blue-50 rounded-md mb-6">
          <h2 className="text-xl font-semibold mb-2 text-blue-800">
            Zum Home‑Bildschirm hinzufügen
          </h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>Öffne diese Seite in Safari oder Chrome auf deinem Gerät.</li>
            <li>Tippe auf das Teilen‑Symbol (das Quadrat mit dem Pfeil nach oben).</li>
            <li>Wähle „Zum Home‑Bildschirm“ aus.</li>
            <li>Bestätige die Installation.</li>
          </ul>
        </div>
        <p className="text-gray-700 text-center">
          Sobald die App installiert ist, erhältst du automatisch Push‑Benachrichtigungen für anstehende Events.
        </p>
      </div>
    </div>
  );
}
