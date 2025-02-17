import { createClient } from '@/lib/supabase_server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true, session: data.session });
}
