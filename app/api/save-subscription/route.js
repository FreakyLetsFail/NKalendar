// app/api/save-subscription/route.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request) {
  try {
    const subscription = await request.json();
    const { data, error } = await supabase
      .from("push_subscriptions")
      .insert([{ subscription }]);
    if (error) throw error;
    console.log("Gespeichertes Abonnement:", data);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Fehler beim Speichern des Abos:", error);
    return new Response(JSON.stringify({ success: false, error }), { status: 500 });
  }
}
