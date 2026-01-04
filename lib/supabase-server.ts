import { createClient, SupabaseClient } from "@supabase/supabase-js"

export function createSupabaseAdmin(
  supabaseUrl: string | undefined,
  serviceRoleKey: string | undefined,
  options?: Parameters<typeof createClient>[2]
): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error("createSupabaseAdmin: supabaseUrl missing")
  }

  if (!serviceRoleKey) {
    throw new Error("createSupabaseAdmin: serviceRoleKey missing")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    ...options,
  })
}
