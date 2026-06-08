import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy proxy: el createClient() real se ejecuta solo cuando se accede a una
// propiedad por primera vez (en runtime), no al importar el módulo.
// Evita el error "supabaseUrl is required" que Next.js lanza durante el paso
// "Collecting page data" del build, cuando las env vars aún no están disponibles.
function lazySupa(factory: () => SupabaseClient): SupabaseClient {
  let inst: SupabaseClient | null = null
  return new Proxy({} as SupabaseClient, {
    get(_, prop) {
      if (!inst) inst = factory()
      return Reflect.get(inst, prop as string, inst)
    },
  })
}

// Cliente público (frontend)
export const supabase = lazySupa(() =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
)

// Cliente con privilegios completos (solo backend/API routes/cron — bypasea RLS)
export const supabaseAdmin = lazySupa(() =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
)
