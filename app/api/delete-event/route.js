import { createClient } from '@/lib/supabase_server';
import webpush from 'web-push';
import { NextResponse } from 'next/server';

// VAPID-Konfiguration
webpush.setVapidDetails(
  "mailto:info@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function DELETE(request) {
  try {
    const supabase = await createClient();
    // Prüfe, ob ein Benutzer authentifiziert ist
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const { id, title } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 });
    }
    
    // Lösche das Event in der Datenbank
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", id);
    if (deleteError) {
      console.error("Error deleting event:", deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }
    
    // Lade alle Push-Abonnements
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*");
    if (subError) {
      console.error("Error retrieving subscriptions:", subError);
      return NextResponse.json({ success: false, error: subError.message }, { status: 500 });
    }
    
    // Sende eine Push-Nachricht an alle Abonnements
    const payload = {
      title: "Event gelöscht",
      body: `Das Event "${title}" wurde gelöscht.`,
    };
    
    for (const subRecord of subscriptions) {
      try {
        await webpush.sendNotification(
          subRecord.subscription,
          JSON.stringify(payload)
        );
      } catch (err) {
        console.error("Error sending push notification:", err);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("General error in /api/delete-event:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
