// app/api/notify/route.js
import { supabase } from "@/lib/supabase";
import { sendNotification } from "@/lib/notifications";

export async function GET(request) {
  const now = new Date().toISOString();

  // Alle fälligen Notifications abrufen – die Fremdspalte aus "events" wird automatisch verknüpft,
  // wenn du "events(title)" angibst.
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, event_id, notify_at, sent, events(title)")
    .eq("sent", false)
    .lte("notify_at", now);

  if (error) {
    console.error("Fehler beim Abrufen der Notifications:", error);
    return new Response(JSON.stringify({ success: false, error }), { status: 500 });
  }

  if (!notifications.length) {
    return new Response(JSON.stringify({ success: true, message: "Keine fälligen Notifications." }), { status: 200 });
  }

  // Für jede Notification: Sende sie (hier via Browser Notification API) und markiere als gesendet
  for (const notification of notifications) {
    await sendNotification(`Erinnerung: ${notification.events.title}`, {
      body: "Das Event findet bald statt!"
    });
    await supabase
      .from("notifications")
      .update({ sent: true })
      .eq("id", notification.id);
  }

  return new Response(JSON.stringify({ success: true, sent: notifications.length }), { status: 200 });
}