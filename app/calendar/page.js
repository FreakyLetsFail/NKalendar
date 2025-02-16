"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator"; // shadcn ui Separator
import {
  startOfMonth,
  startOfWeek,
  addDays as addDaysFn,
  isSameMonth,
  isSameDay
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { de } from "date-fns/locale";
import { DateTime } from "luxon";

const timeZone = "Europe/Berlin";

export default function CalendarPage() {
  // (Optional) Authentifizierung
  const [session, setSession] = useState(null);

  // Alle Events (wir filtern später die künftigen und 14-Tage-Events)
  const [events, setEvents] = useState([]);

  // Datum für den Kalender
  const [currentDate, setCurrentDate] = useState(new Date());

  // Push-Benachrichtigung
  const [pushSubscription, setPushSubscription] = useState(null);
  const [pushStatus, setPushStatus] = useState("Push-Registrierung nicht initiiert");

  // Modal für Event-Anmeldung
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrationName, setRegistrationName] = useState("");

  // Event-Upload (optional)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [formattedTime, setFormattedTime] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  // Custom Push-Nachrichten
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [pushInfo, setPushInfo] = useState("");

  // Info-Box (statt alert)
  const [infoMessage, setInfoMessage] = useState("");

  // Header-Text
  const headerTitle = "Semesterprogramm der B! Norddeutsche und Niedersachsen";

  // Formatierung der Startzeit (Event-Upload)
  useEffect(() => {
    if (startTime) {
      const localDate = DateTime.fromISO(startTime, { zone: timeZone });
      setFormattedTime(localDate.toFormat("dd.MM.yyyy HH:mm"));
    } else {
      setFormattedTime("");
    }
  }, [startTime]);

  // Session abrufen (falls benötigt)
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

  // Events laden (nur einmal initial), spätere Updates kommen über Realtime
  const fetchEvents = async () => {
    const { data, error } = await supabase.from("events").select("*");
    if (!error && data) {
      setEvents(data);
    } else if (error) {
      console.error("Fehler beim Laden der Events:", error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Realtime: Auf Änderungen in der Tabelle "events" reagieren
  useEffect(() => {
    const channel = supabase
      .channel("realtime-events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        (payload) => {
          console.log("Realtime-Änderung in events:", payload);
          // Nach jeder Änderung neu laden
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Automatisches Ausblenden der Info-Box nach 3 Sekunden
  useEffect(() => {
    if (infoMessage) {
      const timer = setTimeout(() => {
        setInfoMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [infoMessage]);

  // Filter: nur künftige Events
  const now = new Date();
  const upcomingEvents = events.filter((event) => new Date(event.start_time) >= now);

  // Filter: Events der nächsten 14 Tage
  const eventsNext14 = upcomingEvents.filter((event) => {
    const eventTime = new Date(event.start_time);
    const fourteenDaysLater = addDaysFn(now, 14);
    return eventTime <= fourteenDaysLater;
  });

  // Push-Benachrichtigung initialisieren
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(async (registration) => {
          setPushStatus("Service Worker registriert.");
          const existingSubscription = await registration.pushManager.getSubscription();
          if (existingSubscription) {
            setPushSubscription(existingSubscription);
            setPushStatus(""); // Kein zusätzlicher Text, wenn aktiv
          }
        })
        .catch((err) => {
          console.error("Service Worker Registrierung fehlgeschlagen:", err);
          setPushStatus("Service Worker Registrierung fehlgeschlagen.");
        });
    }
  }, []);

  // Push-Abo anlegen
  const subscribeToPush = async () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          )
        });
        setPushSubscription(sub);
        setPushStatus("");
        // Abo auf dem Server speichern
        await fetch("https://192.168.178.66:3000/api/save-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub)
        });
      } catch (err) {
        console.error("Push-Registrierung fehlgeschlagen:", err);
        setPushStatus("Push-Registrierung fehlgeschlagen: " + err.message);
      }
    } else {
      setPushStatus("Push-Benachrichtigungen werden in diesem Browser nicht unterstützt.");
    }
  };

  const handleSubscribe = async () => {
    subscribeToPush();
  };

  const handleUnsubscribe = async () => {
    if (pushSubscription) {
      try {
        await pushSubscription.unsubscribe();
        setPushSubscription(null);
        setPushStatus("Push-Benachrichtigungen deaktiviert.");
      } catch (err) {
        console.error("Unsubscribe fehlgeschlagen:", err);
      }
    }
  };

  // Öffnet das Modal zur Event-Anmeldung
  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  // Speichert die Anmeldung in "event_registrations" + subscription
  const handleRegistration = async () => {
    if (!selectedEvent) return;
    const { error } = await supabase.from("event_registrations").insert([
      {
        event_id: selectedEvent.id,
        name: registrationName,
        subscription: pushSubscription
      }
    ]);
    if (!error) {
      // Anstelle von alert → kurze Info-Box
      setInfoMessage(`Anmeldung für "${selectedEvent.title}" gespeichert!`);
      setRegistrationName("");
      setSelectedEvent(null);
    } else {
      console.error("Registrierung fehlgeschlagen:", error);
      setInfoMessage("Registrierung fehlgeschlagen – bitte erneut versuchen.");
    }
  };

  // Hilfsfunktion: Konvertiert Base64 zu Uint8Array
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-8 text-black">
      {/* Header */}
      <h1 className="text-3xl font-extrabold text-center">{headerTitle}</h1>

      {/* Info-Box, wenn infoMessage gesetzt ist */}
      {infoMessage && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-800 rounded mb-4 text-center">
          {infoMessage}
        </div>
      )}

      {/* Push-Benachrichtigung (Subscribe) */}
      <div className="flex justify-center">
        {!pushSubscription && (
          <Button onClick={handleSubscribe}>Push-Benachrichtigung aktivieren</Button>
        )}
      </div>
      {pushStatus && (
        <p className="text-center text-red-600">{pushStatus}</p>
      )}

      <Separator className="my-6 border-black" />

      {/* Abschnitt: Events der nächsten 14 Tage */}
      <h2 className="text-xl font-bold">Veranstaltungen der nächsten 14 Tage</h2>
      {eventsNext14.length > 0 ? (
        <ul className="space-y-4">
          {eventsNext14.map((event) => (
            <li key={event.id} className="p-4 border border-black rounded hover:bg-gray-100 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <img src="/Flag_Icon.png" alt="Flagge" className="h-6 w-6 mr-2" />
                  <div>
                    <div className="font-bold">
                      {formatInTimeZone(new Date(event.start_time), timeZone, "dd.MM.yyyy HH:mm")}
                    </div>
                    <div className="font-bold">{event.title}</div>
                  </div>
                </div>
                <Button onClick={() => handleEventClick(event)} size="sm">
                  Anmelden
                </Button>
              </div>
              {event.description && (
                <>
                  <hr className="my-2 border-black" />
                  <p className="text-sm">{event.description}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center">Keine Veranstaltungen in den nächsten 14 Tagen.</p>
      )}

      <Separator className="my-6 border-black" />

      {/* Abschnitt: Alle bevorstehenden Veranstaltungen */}
      <h2 className="text-xl font-bold">Alle Bevorstehenden Veranstaltungen</h2>
      {upcomingEvents.length > 0 ? (
        <ul className="space-y-4">
          {upcomingEvents.map((event) => (
            <li
              key={event.id}
              className="p-4 border border-black rounded hover:bg-gray-100 transition"
              onClick={() => handleEventClick(event)}
            >
              <div className="flex items-center">
                <img src="/Flag_Icon.png" alt="Flagge" className="h-6 w-6 mr-2" />
                <div>
                  <div className="font-bold">
                    {formatInTimeZone(new Date(event.start_time), timeZone, "dd.MM.yyyy HH:mm")}
                  </div>
                  <div className="font-bold">{event.title}</div>
                </div>
              </div>
              {event.description && (
                <>
                  <hr className="my-2 border-black" />
                  <p className="text-sm">{event.description}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center">Keine bevorstehenden Veranstaltungen.</p>
      )}

      <Separator className="my-6 border-black" />

      {/* Kalender */}
      <Card className="p-6 shadow-lg border border-black">
        <Calendar
          currentDate={currentDate}
          events={events}
          onMonthChange={setCurrentDate}
          onEventClick={handleEventClick}
        />
      </Card>

      {/* Modal für Event-Anmeldung */}
      {selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded p-6 max-w-sm w-full shadow-xl text-black">
            <h2 className="text-2xl font-bold mb-2">{selectedEvent.title}</h2>
            <p className="mb-4">
              {formatInTimeZone(new Date(selectedEvent.start_time), timeZone, "dd.MM.yyyy HH:mm")}
            </p>
            {selectedEvent.description && (
              <>
                <hr className="my-2 border-black" />
                <p className="text-sm mb-4">{selectedEvent.description}</p>
              </>
            )}
            <label className="block mb-2">
              Name (Freiwillig):
              <input
                type="text"
                className="border border-black rounded w-full p-2 mt-1"
                value={registrationName}
                onChange={(e) => setRegistrationName(e.target.value)}
                placeholder="Dein Name"
              />
            </label>
            <div className="flex justify-end space-x-2">
              <Button onClick={handleRegistration}>Ich will teilnehmen</Button>
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Unsubscribe-Button unten zentriert */}
      {pushSubscription && (
        <div className="flex justify-center mt-8">
          <Button variant="outline" onClick={handleUnsubscribe}>
            Push-Benachrichtigungen abschalten
          </Button>
        </div>
      )}
    </div>
  );
}

function Calendar({ currentDate, events, onMonthChange, onEventClick }) {
  const startMonth = startOfMonth(currentDate);
  const startDate = startOfWeek(startMonth, { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => addDaysFn(startDate, i));

  return (
    <div className="text-center">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={() => onMonthChange(addDaysFn(currentDate, -30))}>
          ←
        </Button>
        <h3 className="text-lg font-bold">
          {formatInTimeZone(currentDate, timeZone, "MMMM yyyy", { locale: de })}
        </h3>
        <Button variant="outline" onClick={() => onMonthChange(addDaysFn(currentDate, 30))}>
          →
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
          <div key={day} className="font-semibold text-center">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const hasEvent = events.some((event) =>
            isSameDay(new Date(event.start_time), day)
          );
          return (
            <div
              key={day.toString()}
              className={`p-3 rounded border border-black cursor-pointer flex items-center justify-center ${
                isSameMonth(day, currentDate) ? "bg-white" : "bg-gray-100"
              }`}
              onClick={() => {
                const eventForDay = events.find((event) =>
                  isSameDay(new Date(event.start_time), day)
                );
                if (eventForDay) onEventClick(eventForDay);
              }}
            >
              {hasEvent ? (
                <img src="/Flag_Icon.png" alt="Flagge" className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">
                  {formatInTimeZone(day, timeZone, "d")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
