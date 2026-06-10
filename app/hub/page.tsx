import type { Metadata } from 'next'
import HubHeader from './componentes/HubHeader'
import TarjetaNoticia from './componentes/TarjetaNoticia'
import { obtenerFeed } from '@/app/lib/feed'
import { supabaseAdmin } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'EZ Trader · Noticias económicas de Chile y el mundo',
  description:
    'Hub de noticias económicas: dólar, cobre, Bitcoin, bolsa e inflación. Clasificadas y resumidas con IA para entender qué pasa y por qué.',
}

async function obtenerSintesis(): Promise<{ texto: string; generado_at: string } | null> {
  const { data } = await supabaseAdmin
    .from('sintesis_diaria')
    .select('texto, generado_at')
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

export default async function PortadaHub() {
  const [destacadas, recientes, sintesis] = await Promise.all([
    obtenerFeed({ destacadas: true, limit: 7 }),
    obtenerFeed({ limit: 24 }),
    obtenerSintesis(),
  ])

  // La principal: la destacada más relevante. El resto, grilla.
  const principal = destacadas[0]
  const secundarias = destacadas.slice(1, 7)
  // Reciente sin repetir las destacadas ya mostradas.
  const idsArriba = new Set([principal?.id, ...secundarias.map((n) => n.id)].filter(Boolean))
  const masReciente = recientes.filter((n) => !idsArriba.has(n.id)).slice(0, 16)

  return (
    <div className="min-h-screen bg-base text-snow">
      <HubHeader />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Síntesis del día */}
        {sintesis && (
          <section className="mb-8 rounded-xl border border-brand/20 bg-brand/5 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-brand">Síntesis del día</h2>
            </div>
            {sintesis.texto.split('\n').filter(Boolean).slice(0, 4).map((p, i) => (
              <p key={i} className="text-sm text-snow/80 leading-relaxed mb-1.5 last:mb-0">
                {p}
              </p>
            ))}
          </section>
        )}

        {/* Destacadas */}
        {principal ? (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Lo más importante</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 lg:row-span-2">
                <TarjetaNoticia n={principal} destacada />
              </div>
              {secundarias.map((n) => (
                <TarjetaNoticia key={n.id} n={n} />
              ))}
            </div>
          </section>
        ) : (
          <p className="text-muted text-sm mb-10">Aún no hay noticias destacadas. Vuelve en unos minutos.</p>
        )}

        {/* Más reciente */}
        {masReciente.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Lo más reciente</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {masReciente.map((n) => (
                <TarjetaNoticia key={n.id} n={n} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-8 mt-8 border-t border-line text-center">
        <p className="text-xs text-muted/60">
          EZ Trader · Noticias económicas con IA. Información referencial, no constituye asesoría financiera.
        </p>
      </footer>
    </div>
  )
}
