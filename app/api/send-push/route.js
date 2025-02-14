// app/api/send-push/route.js
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service-Role Key für serverseitige Abfragen!
const supabase = createClient(supabaseUrl, supabaseKey);

// VAPID-Schlüssel setzen:
webpush.setVapidDetails(
  'mailto:deine-email@beispiel.de',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendDueNotifications() {
  // Alle Notifications abrufen, die noch nicht gesendet wurden.
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, event_id, notify_at, sent, events(id, title, start_time)');
  
  if (error) {
    console.error("Fehler beim Abrufen der Notifications:", error);
    return;
  }
  
  const now = new Date();

  for (const notification of notifications) {
    if (!notification.sent && new Date(notification.notify_at) <= now) {
      // Hier muss in einem echten System das korrekte Push-Abonnement des Nutzers abgerufen werden.
      // Demo: Verwende ein global gespeichertes Abo.
      const subscription = global.savedSubscription;
      if (!subscription) {
        console.warn("Kein Abonnement vorhanden für Notification:", notification.id);
        continue;
      }
      
      const payload = {
        title: notification.events.title,
        body: `Event startet um ${new Date(notification.events.start_time).toLocaleTimeString()}`
      };
      
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        console.log(`Notification ${notification.id} gesendet.`);
        // Markiere in der DB als gesendet:
        await supabase
          .from('notifications')
          .update({ sent: true })
          .eq('id', notification.id);
      } catch (err) {
        console.error(`Fehler beim Senden der Notification ${notification.id}:`, err);
      }
    }
  }
}

// Diese Funktion kann per Cronjob/Scheduled Function aufgerufen werden.
sendDueNotifications();

export async function POST(request) {
  // Optional: Manuelle Auslösung via POST.
  await sendDueNotifications();
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}