// app/calendar/page.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  format,
  startOfMonth,
  startOfWeek,
  addDays,
  isSameMonth,
  isSameDay
} from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sendNotification } from "@/lib/notifications";

// Hilfsfunktion: Base64-VAPID-Schlüssel in Uint8Array umwandeln
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

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pushStatus, setPushStatus] = useState("Push-Registrierung nicht initiiert");
  const [pushSubscription, setPushSubscription] = useState(null);

  // Kalender-Events laden und Realtime-Subscriptions einrichten
  useEffect(() => {
    const fetchEvents = async () => {
      let { data, error } = await supabase.from("events").select("*");
      if (!error) setEvents(data);
    };

    fetchEvents();

    const eventsSubscription = supabase
      .channel("realtime:events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, fetchEvents)
      .subscribe();

    const notificationsSubscription = supabase
      .channel("realtime:notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        // Optionale lokale Notification (zur UI-Aktualisierung)
        sendNotification("Event Erinnerung!", {
          body: `Bald startet: ${payload.new.title || "Event"}`
        });
        // Als gesendet markieren
        supabase.from("notifications").update({ sent: true }).eq("id", payload.new.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(eventsSubscription);
      supabase.removeChannel(notificationsSubscription);
    };
  }, []);

  // Service Worker registrieren und vorhandenes Push-Abonnement prüfen
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(async (registration) => {
          setPushStatus("Service Worker registriert.");
          const existingSubscription = await registration.pushManager.getSubscription();
          if (existingSubscription) {
            setPushSubscription(existingSubscription);
            setPushStatus("Push-Abonnement vorhanden.");
          }
        })
        .catch(err => {
          console.error("Service Worker Registrierung fehlgeschlagen:", err);
          setPushStatus("Service Worker Registrierung fehlgeschlagen.");
        });
    }
  }, []);

  // Automatischer Prompt: Nur wenn kein Abonnement existiert und noch keine Zustimmung (via localStorage)
  useEffect(() => {
    const hasConsented = localStorage.getItem("pushConsent");
    if (!pushSubscription && "PushManager" in window && !hasConsented) {
      if (window.confirm("Möchtest du Push-Benachrichtigungen erhalten?")) {
        localStorage.setItem("pushConsent", "true");
        subscribeToPush();
      } else {
        localStorage.setItem("pushConsent", "false");
      }
    }
  }, [pushSubscription]);

  // Funktion zur Registrierung des Push-Abonnements
  const subscribeToPush = async () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
        });
        setPushSubscription(sub);
        setPushStatus("Push-Abonnement erfolgreich.");
        // Sende das Abonnement an die API zum Speichern
        await fetch("/api/save-subscription", {
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

  // Filter: Events in den nächsten 7 Tagen
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.start_time);
    return eventDate >= new Date() &&
           eventDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  });

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <h1 className="text-2xl font-bold mb-4">Calendar &amp; Push Notifications</h1>
      <p>Status Push: {pushStatus}</p>
      <h2 className="text-lg font-bold mb-2">Upcoming Events:</h2>
      {upcomingEvents.length > 0 ? (
        <ul className="mb-4">
          {upcomingEvents.map((event) => (
            <li key={event.id} className="p-2 border-b">
              {format(new Date(event.start_time), "dd.MM.yyyy")} - {event.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 mb-4">Keine bevorstehenden Events.</p>
      )}
      <Card className="p-4">
        <Calendar currentDate={currentDate} events={events} onMonthChange={setCurrentDate} />
      </Card>
    </div>
  );
}

function Calendar({ currentDate, events, onMonthChange }) {
  const startMonth = startOfMonth(currentDate);
  const startDate = startOfWeek(startMonth, { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(startDate, i));

  return (
    <div className="text-center">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={() => onMonthChange(addDays(currentDate, -30))}>
          ←
        </Button>
        <h3 className="text-lg font-bold">{format(currentDate, "MMMM yyyy")}</h3>
        <Button variant="outline" onClick={() => onMonthChange(addDays(currentDate, 30))}>
          →
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-sm">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(day => (
          <div key={day} className="font-bold">{day}</div>
        ))}
        {days.map(day => {
          const eventForDay = events.find(event => isSameDay(new Date(event.start_time), day));
          return (
            <div
              key={day.toString()}
              className={`p-2 rounded text-center border ${isSameMonth(day, currentDate) ? "bg-gray-100" : "bg-gray-200"}`}
            >
              {format(day, "d")}
              {eventForDay && (
                <div className="text-red-500 text-xs mt-1">{eventForDay.title}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}