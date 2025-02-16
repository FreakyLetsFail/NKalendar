"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateTime } from "luxon";

const timeZone = "Europe/Berlin";

export default function DashboardPage() {
  // Authentifizierung via Supabase Auth (E-Mail/Passwort)
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Upload-Formular States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [formattedTime, setFormattedTime] = useState("");
  const [message, setMessage] = useState("");

  // Events und Registrierungen
  const [events, setEvents] = useState([]);

  // Custom Push States
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [pushInfo, setPushInfo] = useState("");

  // Formatiere den eingegebenen Zeitpunkt in Europe/Berlin
  useEffect(() => {
    if (startTime) {
      const localDate = DateTime.fromISO(startTime, { zone: timeZone });
      setFormattedTime(localDate.toFormat("dd.MM.yyyy HH:mm"));
    } else {
      setFormattedTime("");
    }
  }, [startTime]);

  // Session abrufen und Listener einrichten
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    getSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  // Events laden (inklusive Registrierungen)
  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*, event_registrations(*)")
      .order("start_time", { ascending: true });
    if (error) {
      console.error("Fehler beim Laden der Events:", error);
    } else {
      setEvents(data);
    }
  };

  useEffect(() => {
    if (session) {
      fetchEvents();
    }
  }, [session]);

  // Login via Supabase Auth
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingAuth(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert("Login fehlgeschlagen: " + error.message);
    }
    setLoadingAuth(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // Event Upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!title || !startTime) {
      setMessage("Titel und Startzeit sind erforderlich.");
      return;
    }
    try {
      // Lokale Zeit in UTC konvertieren
      const localDate = DateTime.fromISO(startTime, { zone: timeZone });
      const utcDate = localDate.toUTC();
      const { error } = await supabase
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
        fetchEvents();
      }
    } catch (err) {
      console.error("Unerwarteter Fehler:", err);
      setMessage("Ein unerwarteter Fehler ist aufgetreten.");
    }
  };

  // Custom Push-Nachricht senden
  const handleSendCustomPush = async (e) => {
    e.preventDefault();
    setPushInfo("");
    if (!pushTitle || !pushMessage) {
      setPushInfo("Bitte Titel und Nachricht ausfüllen.");
      return;
    }

    try {
      const response = await fetch("/api/send-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Wichtig: Cookies mitsenden, damit die Supabase-Session erkannt wird
        credentials: "include",
        body: JSON.stringify({
          title: pushTitle,
          message: pushMessage,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Server error");
      }

      const result = await response.json();
      if (result.success) {
        setPushInfo("Push erfolgreich versendet!");
        setPushTitle("");
        setPushMessage("");
      } else {
        setPushInfo("Fehler beim Senden der Push-Nachricht: " + (result.error || ""));
      }
    } catch (error) {
      console.error("Fehler bei handleSendCustomPush:", error);
      setPushInfo("Fehler beim Senden der Push-Nachricht: " + error.message);
    }
  };

  if (!session) {
    // Login-Formular, falls nicht authentifiziert
    return (
      <div className="container mx-auto p-4 max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Dashboard Login</h1>
        <Card className="p-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded p-2"
                placeholder="Email eingeben"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded p-2"
                placeholder="Passwort"
              />
            </div>
            <Button type="submit" disabled={loadingAuth}>
              {loadingAuth ? "Lade..." : "Login"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Dashboard anzeigen, falls authentifiziert
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-center">Dashboard</h1>
        <Button onClick={handleLogout}>Logout</Button>
      </div>

      {/* Event Upload */}
      <Card className="p-6 mb-6 shadow-lg">
        <h2 className="text-2xl font-semibold mb-4">Event Upload</h2>
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

      {/* Custom Push-Nachricht */}
      <Card className="p-6 mb-6 shadow-lg">
        <h2 className="text-2xl font-semibold mb-4">Manuelle Push-Nachricht</h2>
        <form onSubmit={handleSendCustomPush} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Titel</label>
            <input
              type="text"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Push-Titel"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Nachricht</label>
            <textarea
              value={pushMessage}
              onChange={(e) => setPushMessage(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Push-Nachricht eingeben"
            />
          </div>
          <Button type="submit">Push absenden</Button>
          {pushInfo && <p className="mt-2 text-center">{pushInfo}</p>}
        </form>
      </Card>

      {/* Events Übersicht */}
      <Card className="p-6 shadow-lg">
        <h2 className="text-2xl font-semibold mb-4">Events Übersicht</h2>
        {events.length === 0 ? (
          <p>Keine Events vorhanden.</p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="border rounded p-4">
                <h3 className="text-xl font-bold">{event.title}</h3>
                <p className="text-gray-600">
                  {DateTime.fromISO(event.start_time)
                    .setZone(timeZone)
                    .toFormat("dd.MM.yyyy HH:mm")}
                </p>
                <p className="mt-2">
                  Teilnehmer:{" "}
                  {event.event_registrations
                    ? event.event_registrations.length
                    : 0}
                </p>
                {event.event_registrations &&
                  event.event_registrations.length > 0 && (
                    <ul className="mt-2 list-disc list-inside">
                      {event.event_registrations.map((reg) => (
                        <li key={reg.id}>
                          {reg.name ? reg.name : "Anonym"}
                        </li>
                      ))}
                    </ul>
                  )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
