// src/supabase/client.ts
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"   

/* ---------------------------------------------
   Lê as variáveis de ambiente do Next/Vercel.
   (mantém o fallback para variáveis sem NEXT_PUBLIC
    caso você rode script Node fora do browser)
---------------------------------------------- */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variáveis de ambiente do Supabase não encontradas.")
}

/* ---------------------------------------------
   Client tipado: <Database>
---------------------------------------------- */
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
)
