import { Suspense } from 'react'
import PanelNoticias from './components/noticias/PanelNoticias'
import PanelCotizacion from './components/cotizacion/PanelCotizacion'
import HistorialCotizacion from './components/cotizacion/HistorialCotizacion'
import PanelFactores from './components/cotizacion/PanelFactores'
import PanelAgente from './components/agente/PanelAgente'
import BotonRefresh from './components/ui/BotonRefresh'
import BotonBriefing from './components/ui/BotonBriefing'
import UltimaActualizacion from './components/ui/UltimaActualizacion'
import PanelAlertas from './components/ui/PanelAlertas'
import Logo from './components/ui/Logo'
import BotonLogout from './components/ui/BotonLogout'

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ fuente?: string; impacto?: string }>
}) {
  const { fuente, impacto } = await searchParams

  return (
    <div className="min-h-screen bg-base text-snow">

      {/* Banner / Header */}
      <header className="relative overflow-hidden border-b border-line bg-base h-[120px]">
        {/* Fondo mapamundi — imagen real */}
        <div
          className="absolute inset-0 bg-no-repeat opacity-90"
          style={{
            backgroundImage: "url('/fondo-globo.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
          }}
        />
        {/* Fade izquierda para proteger legibilidad del logo */}
        <div className="absolute inset-0 bg-gradient-to-r from-base via-base/85 to-transparent pointer-events-none" />

        {/* Content — solo el logo */}
        <div className="relative z-10 h-full flex items-center px-4 lg:px-6">
          <Logo />
        </div>
      </header>

      {/* Tabs + controles */}
      <div className="border-b border-line px-4 lg:px-6 bg-panel/50 flex items-center justify-between">
        <nav className="flex gap-1">
          <button className="px-4 py-2 text-sm border-b-2 border-brand text-brand font-medium">
            USD / CLP
          </button>
          <button className="px-4 py-2 text-sm text-muted cursor-not-allowed" disabled>
            + Instrumento
          </button>
        </nav>
        <div className="flex items-center gap-2 lg:gap-3 py-1">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse"></span>
            En vivo · cada 15 min
          </div>
          <Suspense fallback={null}>
            <UltimaActualizacion />
          </Suspense>
          <PanelAlertas />
          <BotonBriefing />
          <BotonRefresh />
          <BotonLogout />
        </div>
      </div>

      {/* ===== DESKTOP LAYOUT (lg+) ===== */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:h-[calc(100vh-162px)]">

        {/* Zona izquierda 8 cols: gráfico arriba + noticias/factores abajo */}
        <div className="col-span-8 flex flex-col border-r border-line overflow-hidden">

          {/* Gráfico — 45% de la altura */}
          <div className="flex-[9] overflow-y-auto border-b border-line min-h-0">
            <Suspense fallback={<CargandoPanel texto="Cargando mercado..." />}>
              <PanelCotizacion />
            </Suspense>
            <Suspense fallback={null}>
              <HistorialCotizacion />
            </Suspense>
          </div>

          {/* Noticias + Factores lado a lado — 55% de la altura */}
          <div className="flex-[11] grid grid-cols-2 overflow-hidden min-h-0">
            <div className="border-r border-line overflow-y-auto">
              <Suspense fallback={<CargandoPanel texto="Cargando noticias..." />}>
                <PanelNoticias fuente={fuente} impacto={impacto} />
              </Suspense>
            </div>
            <div className="overflow-y-auto">
              <Suspense fallback={<CargandoPanel texto="Cargando factores..." />}>
                <PanelFactores />
              </Suspense>
            </div>
          </div>

        </div>

        {/* Agente — 4 cols, altura completa */}
        <div className="col-span-4 flex flex-col overflow-hidden">
          <PanelAgente />
        </div>

      </div>

      {/* ===== MÓVIL LAYOUT (< lg) ===== */}
      <div className="lg:hidden">
        <div className="border-b border-line">
          <Suspense fallback={<CargandoPanel texto="Cargando mercado..." />}>
            <PanelCotizacion />
          </Suspense>
          <Suspense fallback={null}>
            <HistorialCotizacion />
          </Suspense>
          <Suspense fallback={<CargandoPanel texto="Cargando factores..." />}>
            <PanelFactores />
          </Suspense>
        </div>
        <Suspense fallback={<CargandoPanel texto="Cargando noticias..." />}>
          <PanelNoticias fuente={fuente} impacto={impacto} />
        </Suspense>
        <div className="border-t border-line">
          <PanelAgente />
        </div>
      </div>
    </div>
  )
}

function CargandoPanel({ texto }: { texto: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-muted text-sm">
      <span className="animate-pulse">{texto}</span>
    </div>
  )
}
