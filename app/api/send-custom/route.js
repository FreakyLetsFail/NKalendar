import { createClient } from '@/lib/supabase_server';
import webpush from 'web-push';
import { NextResponse } from 'next/server';

// VAPID-Konfiguration
webpush.setVapidDetails(
  "mailto:info@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function POST(request) {
  try {
    const supabase = await createClient();
    // Prüfe, ob ein Benutzer authentifiziert ist
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const { title, message } = await request.json();
    
    // Lade alle Push-Abonnements
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*");
    if (error) {
      console.error("Error retrieving subscriptions:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    // Sende die benutzerdefinierte Push-Nachricht an alle Abonnements
    for (const subRecord of subscriptions) {
      try {
        await webpush.sendNotification(
          subRecord.subscription,
          JSON.stringify({
            title,
            body: message,
          })
        );
      } catch (err) {
        console.error("Error sending push notification:", err);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("General error in /api/send-custom:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
