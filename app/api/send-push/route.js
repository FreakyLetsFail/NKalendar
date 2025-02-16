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
  const nowISOString = new Date().toISOString();

  // Fällige Notifications abrufen
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, event_id, notify_at, sent, events(id, title, start_time)')
    .eq('sent', false)
    .lte('notify_at', nowISOString);

  if (error) {
    console.error("Fehler beim Abrufen der Notifications:", error);
    return;
  }

  if (!notifications || notifications.length === 0) {
    console.log("Keine fälligen Notifications.");
    return;
  }

  console.log(`Es wurden ${notifications.length} Notifications gefunden.`);
  const now = new Date();

  for (const notification of notifications) {
    const notifyTime = new Date(notification.notify_at);
    console.log(`\n--------------------------------------------------`);
    console.log(`Notification ${notification.id} - notify_at: ${notifyTime.toISOString()}`);
    
    if (!notification.sent && notifyTime <= now) {
      // Berechne Differenz in Tagen zwischen Event-Start und notify_at
      const eventStart = new Date(notification.events.start_time);
      const diffDays = (eventStart - notifyTime) / (1000 * 60 * 60 * 24);
      console.log(`Event-Start: ${eventStart.toISOString()}`);
      console.log(`Berechnete diffDays: ${diffDays.toFixed(3)}`);
      
      if (Math.abs(diffDays - 14) < 0.1) {
        // 14 Tage vorher: Sende an alle globalen Push-Abonnements
        const payload = {
          title: `Erinnerung: In 14 Tagen ist ${notification.events.title}`,
          body: "Das Event findet in 14 Tagen statt!"
        };
        console.log("Zweig: 14 Tage vorher");
        console.log("Payload:", payload);
        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('*');
        if (subError) {
          console.error("Fehler beim Abrufen der Abonnements:", subError);
        } else if (subscriptions && subscriptions.length > 0) {
          console.log(`Sende 14-Tage-Benachrichtigung an ${subscriptions.length} Abonnements.`);
          for (const subRecord of subscriptions) {
            try {
              await webpush.sendNotification(subRecord.subscription, JSON.stringify(payload));
              console.log(`Notification ${notification.id} an Abonnement ${subRecord.id} gesendet.`);
            } catch (err) {
              console.error(`Fehler beim Senden der 14-Tage-Benachrichtigung an Abonnement ${subRecord.id}:`, err);
            }
          }
        } else {
          console.log("Keine Push-Abonnements gefunden.");
        }
      } else if (Math.abs(diffDays - 7) < 0.1) {
        // 7 Tage vorher: Sende an alle globalen Push-Abonnements
        const payload = {
          title: `Erinnerung: In 7 Tagen ist ${notification.events.title}`,
          body: "Das Event findet in 7 Tagen statt!"
        };
        console.log("Zweig: 7 Tage vorher");
        console.log("Payload:", payload);
        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('*');
        if (subError) {
          console.error("Fehler beim Abrufen der Abonnements:", subError);
        } else if (subscriptions && subscriptions.length > 0) {
          console.log(`Sende 7-Tage-Benachrichtigung an ${subscriptions.length} Abonnements.`);
          for (const subRecord of subscriptions) {
            try {
              await webpush.sendNotification(subRecord.subscription, JSON.stringify(payload));
              console.log(`Notification ${notification.id} an Abonnement ${subRecord.id} gesendet.`);
            } catch (err) {
              console.error(`Fehler beim Senden der 7-Tage-Benachrichtigung an Abonnement ${subRecord.id}:`, err);
            }
          }
        } else {
          console.log("Keine Push-Abonnements gefunden.");
        }
      } else if (Math.abs(diffDays - 0) < 0.1) {
        // 1 Tag vorher: Nur an registrierte Nutzer (mit push subscription) senden
        console.log("Zweig: 1 Tag vorher (nur registrierte Nutzer)");
        const { data: registrations, error: regError } = await supabase
          .from("event_registrations")
          .select("subscription")
          .neq("subscription", null)
          .eq("event_id", notification.event_id);
        if (regError) {
          console.error("Fehler beim Abrufen der Registrierungen:", regError);
        } else {
          console.log(`Sende 1-Tages-Benachrichtigung an ${registrations.length} registrierte Nutzer.`);
          for (const reg of registrations) {
            if (reg.subscription) {
              try {
                await webpush.sendNotification(
                  reg.subscription,
                  JSON.stringify({
                    title: `Erinnerung: In 1 Tag ist ${notification.events.title}`,
                    body: "Das Event findet morgen statt!"
                  })
                );
                console.log(`Notification ${notification.id} an registrierte Subscription gesendet.`);
              } catch (err) {
                console.error("Fehler beim Senden der 1-Tages-Benachrichtigung:", err);
              }
            }
          }
        }
      } else {
        console.log(`Notification ${notification.id} hat keinen passenden Vorlauf (diffDays=${diffDays.toFixed(3)}).`);
      }
      
      // Markiere die Notification als gesendet
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ sent: true })
        .eq('id', notification.id);
      if (updateError) {
        console.error(`Fehler beim Aktualisieren der Notification ${notification.id}:`, updateError);
      } else {
        console.log(`Notification ${notification.id} wurde als gesendet markiert.`);
      }
    } else {
      console.log(`Notification ${notification.id} ist noch nicht fällig oder bereits gesendet.`);
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
