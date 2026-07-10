/**
 * Supabase · cliente con service_role (SOLO servidor).
 * Salta RLS: usar únicamente en Route Handlers/Server Actions de confianza,
 * por ejemplo para calificar quizzes sin exponer las respuestas correctas.
 */
import { createClient as createSbClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSbClient<Database>(url, key, { auth: { persistSession: false } });
}
