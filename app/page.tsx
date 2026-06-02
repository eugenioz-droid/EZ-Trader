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
  searchParams: Promise<{ fuente?: string }>
}) {
  await searchParams

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

      {/* Móvil: cotización primero */}
      <div className="lg:hidden border-b border-line">
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

      {/* Layout principal — el gráfico/mercado es el centro analítico (más ancho) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:h-[calc(100vh-162px)]">

        {/* Noticias (más angosto — Haiku las filtrará en Fase 8) */}
        <div className="lg:col-span-3 border-r border-line lg:overflow-y-auto">
          <Suspense fallback={<CargandoPanel texto="Cargando noticias..." />}>
            <PanelNoticias />
          </Suspense>
        </div>

        {/* Cotización + Gráfico + Factores (desktop) — columna principal */}
        <div className="hidden lg:block lg:col-span-6 border-r border-line overflow-y-auto">
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

        {/* Agente */}
        <div className="lg:col-span-3 lg:overflow-y-auto border-t lg:border-t-0 border-line">
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
