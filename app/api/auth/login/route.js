import { createClient } from '@/lib/supabase_server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  console.log("API Route /api/auth/login wurde aufgerufen");
  const { email, password } = await request.json();
  console.log("Login API: Received credentials for:", email);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    console.error("Login API Error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Login failed" }, { status: 400 });
  }
  console.log("Login API successful, session:", data.session);
  // Der Supabase-Client setzt den Token automatisch als Cookie.
  return NextResponse.json({ success: true, session: data.session });
}
