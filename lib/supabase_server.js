import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = cookies();
  console.log("Server: cookies() content:", cookieStore.getAll());
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        async getAll() {
          const all = cookieStore.getAll();
          console.log("Server: getAll Cookies:", all);
          return all;
        },
        async setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              console.log("Server: Set cookie:", name, value, options);
              await cookieStore.set(name, value, options);
            }
          } catch (error) {
            console.error("Server: Error in setAll:", error);
          }
        },
      },
    }
  );
}
