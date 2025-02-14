// app/api/save-subscription/route.js
export async function POST(request) {
  try {
    const subscription = await request.json();
    // Demo: Speichere das Abonnement global – in Produktion in der Datenbank pro Nutzer!
    global.savedSubscription = subscription;
    console.log("Gespeichertes Abonnement:", subscription);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Fehler beim Speichern des Abos:", error);
    return new Response(JSON.stringify({ success: false, error }), { status: 500 });
  }
}