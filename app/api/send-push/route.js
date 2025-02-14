// app/api/send-push/route.js
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// VAPID-Schlüssel setzen:
webpush.setVapidDetails(
  'mailto:deine-email@beispiel.de',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendDueNotifications() {
  console.log("sendDueNotifications wurde aufgerufen.");
  
  // Alle noch nicht gesendeten Notifications abrufen, die fällig sind
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, event_id, notify_at, sent, events(id, title, start_time)')
    .eq('sent', false)
    .lte('notify_at', new Date().toISOString());
    
  if (error) {
    console.error("Fehler beim Abrufen der Notifications:", error);
    return;
  }
  
  console.log(`Es wurden ${notifications.length} Notifications gefunden.`);
  const now = new Date();
  console.log("Aktuelle Serverzeit:", now.toISOString());
  
  // Alle gespeicherten Push-Abonnements abrufen
  const { data: subscriptions, error: subError } = await supabase
    .from('push_subscriptions')
    .select('*');
  if (subError) {
    console.error("Fehler beim Abrufen der Abonnements:", subError);
    return;
  }
  
  if (!subscriptions || subscriptions.length === 0) {
    console.warn("Keine Push-Abonnements gefunden.");
    return;
  }
  
  // Für jede fällige Notification: Sende an alle Abonnements
  for (const notification of notifications) {
    const notifyTime = new Date(notification.notify_at);
    console.log(`Notification ${notification.id} - notify_at: ${notifyTime.toISOString()}`);
    
    if (!notification.sent && notifyTime <= now) {
      const payload = {
        title: notification.events.title,
        body: `Event startet um ${new Date(notification.events.start_time).toLocaleTimeString("de-DE")}`
      };
      for (const subRecord of subscriptions) {
        const subscription = subRecord.subscription;
        try {
          console.log(`Sende Notification ${notification.id} an Abonnement ${subRecord.id}...`);
          await webpush.sendNotification(subscription, JSON.stringify(payload));
          console.log(`Notification ${notification.id} an Abonnement ${subRecord.id} gesendet.`);
        } catch (err) {
          console.error(`Fehler beim Senden der Notification ${notification.id} an Abonnement ${subRecord.id}:`, err);
        }
      }
      // Markiere die Notification als gesendet
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ sent: true })
        .eq('id', notification.id);
      if (updateError) {
        console.error(`Fehler beim Aktualisieren der Notification ${notification.id}:`, updateError);
      }
    } else {
      console.log(`Notification ${notification.id} noch nicht fällig oder bereits gesendet.`);
    }
  }
}

export async function GET(request) {
  await sendDueNotifications();
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

export async function POST(request) {
  await sendDueNotifications();
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
