// app/uploads/page.js
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const timeZone = "Europe/Berlin";

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState(""); // erwartet z. B. "2025-02-14T20:11"
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!title || !startTime) {
      setMessage("Titel und Startzeit sind erforderlich.");
      return;
    }

    // Dynamischer Import von date-fns-tz
    const { zonedTimeToUtc, formatInTimeZone } = await import("date-fns-tz");
    
    // Konvertiere den vom Nutzer eingegebenen lokalen Zeitpunkt in UTC, basierend auf Europe/Berlin.
    const utcDate = zonedTimeToUtc(startTime, timeZone);
    console.log("Konvertierter UTC-Timestamp:", utcDate.toISOString());

    try {
      // Event in die DB einfügen (start_time wird als vollständiger ISO-String gespeichert)
      const { data, error } = await supabase
        .from("events")
        .insert([{ title, description, start_time: utcDate.toISOString() }]);
      if (error) {
        console.error("Fehler beim Erstellen des Events:", error);
        setMessage("Fehler beim Erstellen des Events.");
      } else {
        setMessage("Event erfolgreich hochgeladen!");
        setTitle("");
        setDescription("");
        setStartTime("");
      }
    } catch (err) {
      console.error("Unerwarteter Fehler:", err);
      setMessage("Ein unerwarteter Fehler ist aufgetreten.");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Event Upload</h1>
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Event-Titel"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Event-Beschreibung (optional)"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Startzeit</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border rounded p-2"
            />
            {startTime && (
              <p className="text-sm text-gray-500 mt-1">
                Angezeigte Zeit (Europe/Berlin):{" "}
                {(
                  await import("date-fns-tz")
                ).formatInTimeZone(new Date(startTime), timeZone, "dd.MM.yyyy HH:mm")}
              </p>
            )}
          </div>
          <Button type="submit">Event hochladen</Button>
          {message && <p className="mt-2 text-center">{message}</p>}
        </form>
      </Card>
    </div>
  );
}