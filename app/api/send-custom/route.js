import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import webpush from 'web-push';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// VAPID-Schlüssel setzen:
webpush.setVapidDetails(
  "mailto:info@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function POST(request) {
  try {
    // Übergabe der "cookies"-Funktion (nicht des Ergebnisses) an den Supabase-Client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Supabase Session prüfen
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { title, message } = await request.json();

    // Alle Push-Subscriptions abrufen
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*");
    if (error) {
      console.error("Fehler beim Abrufen der Subscriptions:", error);
      return NextResponse.json({ success: false, error: error.message });
    }

    // Sende die Push-Nachricht an jede Subscription
    for (const subRecord of subscriptions) {
      const subscription = subRecord.subscription; // JSON-Objekt aus der DB
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title,
            body: message,
          })
        );
      } catch (err) {
        console.error("Fehler beim Senden an Subscription:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Allgemeiner Fehler in /api/send-custom:", error);
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500 });
  }
}
