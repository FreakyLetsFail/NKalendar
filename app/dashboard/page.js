"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; // Client-seitiger Supabase-Client (für Aktionen, z. B. Event Upload)
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";

const timeZone = "Europe/Berlin";

export default function DashboardPage() {
  const router = useRouter();

  // Authentifizierung via Supabase (über Cookie-basierte Session)
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

  // Globale Info-Box für Rückmeldungen
  const [infoMessage, setInfoMessage] = useState("");

  // (Optionaler) Debug: Ausgabe des localStorage – kann entfernt werden,
  // da wir jetzt den Cookie zur Session-Ermittlung nutzen.
  useEffect(() => {
    const stored = localStorage.getItem("supabase.auth.token");
    console.log("localStorage Inhalt (supabase.auth.token):", stored);
  }, [session]);

  // Formatierung der Startzeit (Event-Upload)
  useEffect(() => {
    if (startTime) {
      const localDate = DateTime.fromISO(startTime, { zone: timeZone });
      const formatted = localDate.toFormat("dd.MM.yyyy HH:mm");
      console.log("Formatted Time:", formatted);
      setFormattedTime(formatted);
    } else {
      setFormattedTime("");
    }
  }, [startTime]);

  // Session abrufen via API-Route (die den Cookie ausliest)
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("https://kalender-norddeutsche-niedersachsen.de/api/auth/session");
        const result = await res.json();
        console.log("Session (via API):", result.session);
        setSession(result.session);
      } catch (error) {
        console.error("Fehler beim Abrufen der Session:", error);
      }
    };
    fetchSession();

    // Zusätzlich: Listener für clientseitige Auth-State-Changes (optional)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Client: Auth State Change:", event, session);
      setSession(session);
    });
    return () => {
      console.log("Client: Listener unsubscriben...");
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Events laden (inklusive Registrierungen)
  const fetchEvents = async () => {
    console.log("Client: Lade Events...");
    const { data, error } = await supabase
      .from("events")
      .select("*, event_registrations(*)")
      .order("start_time", { ascending: true });
    if (error) {
      console.error("Fehler beim Laden der Events:", error);
    } else {
      console.log("Events geladen:", data);
      setEvents(data);
    }
  };

  useEffect(() => {
    if (session) {
      console.log("Session vorhanden, lade Events...");
      fetchEvents();
    } else {
      console.log("Keine Session vorhanden.");
    }
  }, [session]);

  // Login via API-Route
  const handleLogin = async (e) => {
    console.log("Login API Aufruf");
    e.preventDefault();
    console.log("Login wird ausgeführt für:", email);
    setLoadingAuth(true);
    try {
      const response = await fetch("https://kalender-norddeutsche-niedersachsen.de/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      console.log("Login API Response:", response);
      const result = await response.json();
      console.log("Login API Result:", result);
      if (!result.success) {
        alert("Login fehlgeschlagen: " + result.error);
      } else {
        // Bei erfolgreichem Login setzt Supabase automatisch den Token als Cookie.
        // Um sicherzustellen, dass der Client den neuen Cookie liest,
        // führen wir einen kompletten Reload aus.
        window.location.reload();
      }
    } catch (error) {
      console.error("Fehler im Login:", error);
      alert("Login fehlgeschlagen: " + error.message);
    }
    setLoadingAuth(false);
  };

  const handleLogout = async () => {
    console.log("Logout wird ausgeführt...");
    await supabase.auth.signOut();
    setSession(null);
    window.location.reload();
  };

  // Event Upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Event Upload:", { title, description, startTime });
    setMessage("");
    if (!title || !startTime) {
      setMessage("Titel und Startzeit sind erforderlich.");
      return;
    }
    try {
      const localDate = DateTime.fromISO(startTime, { zone: timeZone });
      const utcDate = localDate.toUTC();
      const { error } = await supabase
        .from("events")
        .insert([{ title, description, start_time: utcDate.toISO() }]);
      if (error) {
        console.error("Fehler beim Erstellen des Events:", error);
        setMessage("Fehler beim Erstellen des Events.");
      } else {
        console.log("Event erfolgreich erstellt.");
        setMessage("Event erfolgreich hochgeladen!");
        setTitle("");
        setDescription("");
        setStartTime("");
        fetchEvents();
      }
    } catch (err) {
      console.error("Unerwarteter Fehler beim Event Upload:", err);
      setMessage("Ein unerwarteter Fehler ist aufgetreten.");
    }
  };

  // Custom Push-Nachricht senden (send-custom)
  const handleSendCustomPush = async (e) => {
    e.preventDefault();
    console.log("Sende benutzerdefinierte Push-Nachricht:", { pushTitle, pushMessage });
    setPushInfo("");
    if (!pushTitle || !pushMessage) {
      setPushInfo("Bitte Titel und Nachricht ausfüllen.");
      return;
    }
    try {
      const response = await fetch("https://kalender-norddeutsche-niedersachsen.de/api/send-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: pushTitle, message: pushMessage }),
      });
      console.log("Send Custom Push Response:", response);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Server error");
      }
      const result = await response.json();
      console.log("Send Custom Push Result:", result);
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

  // Event löschen (delete-event)
  const handleDeleteEvent = async (event, e) => {
    e.stopPropagation();
    console.log("Lösche Event:", event);
    if (!confirm(`Möchtest du das Event "${event.title}" wirklich löschen?`)) return;
    try {
      const response = await fetch("https://kalender-norddeutsche-niedersachsen.de/api/delete-event", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id, title: event.title }),
      });
      console.log("Delete Event Response:", response);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Fehler beim Löschen des Events.");
      }
      const result = await response.json();
      console.log("Delete Event Result:", result);
      if (result.success) {
        setInfoMessage(`Event "${event.title}" wurde gelöscht.`);
        fetchEvents();
      } else {
        setInfoMessage(`Löschen fehlgeschlagen: ${result.error}`);
      }
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      setInfoMessage(`Fehler beim Löschen: ${error.message}`);
    }
  };

  if (!session) {
    console.log("Keine Session vorhanden, zeige Login-Formular.");
    return (
      <div className="container mx-auto p-4 max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Dashboard Login</h1>
        <Card className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex flex-col">
              <label htmlFor="email" className="mb-1 font-medium">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded border p-2"
                placeholder="Email eingeben"
                required
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="password" className="mb-1 font-medium">Passwort</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded border p-2"
                placeholder="Passwort"
                required
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

  console.log("Session vorhanden:", session);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-center">Dashboard</h1>
        <Button onClick={handleLogout}>Logout</Button>
      </div>

      {infoMessage && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded text-center">
          {infoMessage}
        </div>
      )}

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
              <div
                key={event.id}
                className="border rounded p-4 flex flex-col md:flex-row md:justify-between md:items-center cursor-pointer"
                onClick={() => console.log("Event Details anzeigen")}
              >
                <div>
                  <h3 className="text-xl font-bold">{event.title}</h3>
                  <p className="text-gray-600">
                    {DateTime.fromISO(event.start_time)
                      .setZone(timeZone)
                      .toFormat("dd.MM.yyyy HH:mm")}
                  </p>
                  <p className="mt-2">
                    Teilnehmer: {event.event_registrations ? event.event_registrations.length : 0}
                  </p>
                  {event.event_registrations && event.event_registrations.length > 0 && (
                    <ul className="mt-2 list-disc list-inside">
                      {event.event_registrations.map((reg) => (
                        <li key={reg.id}>{reg.name ? reg.name : "Anonym"}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mt-4 md:mt-0 flex space-x-2">
                  <Button onClick={(e) => handleDeleteEvent(event, e)} variant="destructive" size="sm">
                    Löschen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
