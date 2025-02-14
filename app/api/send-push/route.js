// app/api/send-push/route.js
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Wichtig: Service-Role Key für serverseitige Abfragen!
const supabase = createClient(supabaseUrl, supabaseKey);

// VAPID-Schlüssel setzen:
webpush.setVapidDetails(
  'mailto:deine-email@beispiel.de',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendDueNotifications() {
  console.log("sendDueNotifications wurde aufgerufen.");
  // Alle Notifications abrufen, die noch nicht gesendet wurden.
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, event_id, notify_at, sent, events(id, title, start_time)');

  if (error) {
    console.error("Fehler beim Abrufen der Notifications:", error);
    return;
  }
  
  console.log(`Es wurden ${notifications.length} Notifications gefunden.`);
  
  const now = new Date();
  console.log("Aktuelle Serverzeit:", now.toISOString());

  for (const notification of notifications) {
    const notifyTime = new Date(notification.notify_at);
    console.log(`Notification ${notification.id} - notify_at: ${notifyTime.toISOString()}`);
    
    if (!notification.sent && notifyTime <= now) {
      // In einer echten Anwendung holst du das korrekte Push-Abonnement des Nutzers aus der DB.
      // Demo: Wir verwenden das global gespeicherte Abo.
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
        console.log(`Sende Notification ${notification.id} ...`);
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        console.log(`Notification ${notification.id} gesendet.`);
        // Markiere in der DB als gesendet:
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ sent: true })
          .eq('id', notification.id);
        if (updateError) {
          console.error(`Fehler beim Aktualisieren der Notification ${notification.id}:`, updateError);
        }
      } catch (err) {
        console.error(`Fehler beim Senden der Notification ${notification.id}:`, err);
      }
    } else {
      console.log(`Notification ${notification.id} noch nicht fällig oder bereits gesendet.`);
    }
  }
}

// GET-Handler hinzufügen, damit diese Route auch per GET aufgerufen werden kann.
export async function GET(request) {
  await sendDueNotifications();
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

// Optional: Falls du auch POST unterstützen möchtest.
export async function POST(request) {
  await sendDueNotifications();
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}