import { supabaseAdmin } from '@/app/lib/supabase'

async function getUltimaActualizacion() {
  const { data } = await supabaseAdmin
    .from('datos_mercado')
    .select('capturado_at')
    .order('capturado_at', { ascending: false })
    .limit(1)
    .single()
  return data?.capturado_at ?? null
}

export default async function UltimaActualizacion() {
  const ultima = await getUltimaActualizacion()

  if (!ultima) return null

  const hora = new Date(ultima).toLocaleTimeString('es-CL', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago'
  })

  return (
    <span className="text-xs text-gray-600">
      Última actualización: <span className="text-gray-400">{hora}</span>
    </span>
  )
}
