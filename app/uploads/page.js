"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateTime } from "luxon";

const timeZone = "Europe/Berlin";

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState(""); // erwartet z. B. "2025-02-14T20:11"
  const [formattedTime, setFormattedTime] = useState("");
  const [message, setMessage] = useState("");

  // Sobald sich startTime ändert, formatiere die Zeit in der Zeitzone Europe/Berlin
  useEffect(() => {
    if (startTime) {
      const localDate = DateTime.fromISO(startTime, { zone: timeZone });
      setFormattedTime(localDate.toFormat("dd.MM.yyyy HH:mm"));
    } else {
      setFormattedTime("");
    }
  }, [startTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!title || !startTime) {
      setMessage("Titel und Startzeit sind erforderlich.");
      return;
    }

    try {
      // Konvertiere den vom Nutzer eingegebenen lokalen Zeitpunkt in UTC
      const localDate = DateTime.fromISO(startTime, { zone: timeZone });
      const utcDate = localDate.toUTC();
      console.log("Konvertierter UTC-Timestamp:", utcDate.toISO());

      // Event in die DB einfügen (start_time als vollständiger ISO-String)
      const { data, error } = await supabase
        .from("events")
        .insert([{ title, description, start_time: utcDate.toISO() }]);
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
                Angezeigte Zeit (Europe/Berlin): {formattedTime}
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