"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  startOfMonth,
  startOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const timeZone = "Europe/Berlin";

// Helper: Umwandlung des VAPID Public Keys
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pushStatus, setPushStatus] = useState(
    "Push-Registrierung nicht initiiert"
  );
  const [pushSubscription, setPushSubscription] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrationName, setRegistrationName] = useState("");

  // Events laden (nur zukünftige)
  useEffect(() => {
    const fetchEvents = async () => {
      let { data, error } = await supabase.from("events").select("*");
      if (!error) {
        const now = new Date();
        const upcoming = data.filter(
          (event) => new Date(event.start_time) >= now
        );
        console.log("Bevorstehende Events:", upcoming);
        setEvents(upcoming);
      } else {
        console.error("Fehler beim Laden der Events:", error);
      }
    };
    fetchEvents();
  }, []);

  // Service Worker registrieren und bestehendes Push-Abo prüfen
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(async (registration) => {
          setPushStatus("Service Worker registriert.");
          const existingSubscription =
            await registration.pushManager.getSubscription();
          if (existingSubscription) {
            setPushSubscription(existingSubscription);
            setPushStatus("Push-Abonnement vorhanden.");
          }
        })
        .catch((err) => {
          console.error("Service Worker Registrierung fehlgeschlagen:", err);
          setPushStatus("Service Worker Registrierung fehlgeschlagen.");
        });
    }
  }, []);

  // Funktion für Push-Registrierung
  const subscribeToPush = async () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          ),
        });
        setPushSubscription(sub);
        setPushStatus("Push-Abonnement erfolgreich.");
        console.log("Push-Abo registriert:", sub);
        await fetch("/api/save-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
      } catch (err) {
        console.error("Push-Registrierung fehlgeschlagen:", err);
        setPushStatus("Push-Registrierung fehlgeschlagen: " + err.message);
      }
    } else {
      setPushStatus(
        "Push-Benachrichtigungen werden in diesem Browser nicht unterstützt."
      );
    }
  };

  // Toggle-Funktion für Benachrichtigungen
  const toggleNotifications = async () => {
    if (pushSubscription) {
      // Abo beenden
      try {
        await pushSubscription.unsubscribe();
        setPushSubscription(null);
        setPushStatus("Push-Benachrichtigungen deaktiviert.");
      } catch (err) {
        console.error("Unsubscribe fehlgeschlagen:", err);
      }
    } else {
      subscribeToPush();
    }
  };

  // Öffnet das Modal mit Event-Details
  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  // Speichert die Registrierung in der Tabelle event_registrations
  const handleRegistration = async () => {
    if (!selectedEvent) return;
    const { error } = await supabase.from("event_registrations").insert([
      { event_id: selectedEvent.id, name: registrationName },
    ]);
    if (!error) {
      // Bestätigung per Push oder Web-Benachrichtigung
      if (pushSubscription) {
        await fetch("/api/send-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: pushSubscription,
            title: "Anmeldung erfolgreich",
            message: `Du hast dich für ${selectedEvent.title} angemeldet!`,
          }),
        });
      } else {
        alert(`Du hast dich für ${selectedEvent.title} angemeldet!`);
      }
      setRegistrationName("");
      setSelectedEvent(null);
    } else {
      console.error("Registrierung fehlgeschlagen:", error);
      alert("Registrierung fehlgeschlagen, bitte versuche es erneut.");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-extrabold text-center mb-6">
         Norddeutsche und Niedersachsen Kalender
      </h1>
      <div className="flex justify-center mb-4">
        <Button onClick={toggleNotifications}>
          {pushSubscription
            ? "Benachrichtigungen abschalten"
            : "Benachrichtigung bekomme"}
        </Button>
      </div>
      <p className="text-center mb-4">{pushStatus}</p>
      <h2 className="text-xl font-bold mb-4">Bevorstehende Events:</h2>
      {events.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="p-3 border rounded cursor-pointer hover:bg-gray-100 transition"
              onClick={() => handleEventClick(event)}
            >
              {formatInTimeZone(
                new Date(event.start_time),
                timeZone,
                "dd.MM.yyyy HH:mm"
              )}{" "}
              - {event.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 mb-4 text-center">
          Keine bevorstehenden Events.
        </p>
      )}
      <Card className="p-6 shadow-lg">
        <Calendar
          currentDate={currentDate}
          events={events}
          onMonthChange={setCurrentDate}
          onEventClick={handleEventClick}
        />
      </Card>

      {/* Modal für Event-Registrierung */}
      {selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-2xl font-bold mb-2">
              {selectedEvent.title}
            </h2>
            <p className="mb-4">
              {formatInTimeZone(
                new Date(selectedEvent.start_time),
                timeZone,
                "dd.MM.yyyy HH:mm"
              )}
            </p>
            <label className="block mb-2">
              Name (Freiwillig):
              <input
                type="text"
                className="border rounded w-full p-2 mt-1"
                value={registrationName}
                onChange={(e) => setRegistrationName(e.target.value)}
                placeholder="Dein Name"
              />
            </label>
            <Button onClick={handleRegistration}>
              Ich will teilnehmen
            </Button>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setSelectedEvent(null)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Calendar({ currentDate, events, onMonthChange, onEventClick }) {
  const startMonth = startOfMonth(currentDate);
  const startDate = startOfWeek(startMonth, { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(startDate, i));

  return (
    <div className="text-center">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={() => onMonthChange(addDays(currentDate, -30))}>
          ←
        </Button>
        <h3 className="text-lg font-bold">
          {formatInTimeZone(currentDate, timeZone, "MMMM yyyy")}
        </h3>
        <Button variant="outline" onClick={() => onMonthChange(addDays(currentDate, 30))}>
          →
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
          <div key={day} className="font-semibold">
            {day}
          </div>
        ))}
        {days.map((day) => {
          // Prüfen, ob an diesem Tag ein Event stattfindet
          const hasEvent = events.some((event) =>
            isSameDay(new Date(event.start_time), day)
          );
          return (
            <div
              key={day.toString()}
              className={`p-3 rounded text-center border cursor-pointer ${
                isSameMonth(day, currentDate) ? "bg-white" : "bg-gray-100"
              }`}
              onClick={() => {
                const eventForDay = events.find((event) =>
                  isSameDay(new Date(event.start_time), day)
                );
                if (eventForDay) onEventClick(eventForDay);
              }}
            >
              <div className="text-sm font-medium">
                {formatInTimeZone(day, timeZone, "d")}
              </div>
              {hasEvent && (
                <div className="mt-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
