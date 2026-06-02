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
      <header className="relative overflow-hidden border-b border-line bg-base h-[90px]">
        {/* Globe decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-3/5 pointer-events-none select-none">
          <svg
            viewBox="0 0 480 180"
            className="absolute right-0 top-1/2 -translate-y-1/2 h-[170%] opacity-[0.18]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <clipPath id="globe-clip">
                <circle cx="320" cy="90" r="115" />
              </clipPath>
            </defs>
            <circle cx="320" cy="90" r="115" stroke="#00FF7F" strokeWidth="0.8" strokeOpacity="0.7" />
            <g clipPath="url(#globe-clip)" stroke="#00FF7F" fill="none">
              <ellipse cx="320" cy="33"  rx="57"  ry="17"  strokeWidth="0.6" strokeOpacity="0.55" />
              <ellipse cx="320" cy="62"  rx="95"  ry="28"  strokeWidth="0.6" strokeOpacity="0.55" />
              <ellipse cx="320" cy="90"  rx="115" ry="33"  strokeWidth="0.6" strokeOpacity="0.55" />
              <ellipse cx="320" cy="118" rx="95"  ry="28"  strokeWidth="0.6" strokeOpacity="0.55" />
              <ellipse cx="320" cy="147" rx="57"  ry="17"  strokeWidth="0.6" strokeOpacity="0.55" />
              <ellipse cx="320" cy="90"  rx="28"  ry="115" strokeWidth="0.5" strokeOpacity="0.4" />
              <ellipse cx="320" cy="90"  rx="65"  ry="115" strokeWidth="0.5" strokeOpacity="0.4" />
              <ellipse cx="320" cy="90"  rx="100" ry="115" strokeWidth="0.5" strokeOpacity="0.4" />
              <ellipse cx="320" cy="90"  rx="115" ry="115" strokeWidth="0.5" strokeOpacity="0.4" />
            </g>
            <g fill="#00FF7F">
              <circle cx="248" cy="70"  r="2.5" opacity="0.85" />
              <circle cx="285" cy="52"  r="2"   opacity="0.75" />
              <circle cx="312" cy="83"  r="3"   opacity="0.95" />
              <circle cx="352" cy="65"  r="2"   opacity="0.75" />
              <circle cx="378" cy="93"  r="2.5" opacity="0.85" />
              <circle cx="357" cy="122" r="2"   opacity="0.75" />
              <circle cx="298" cy="128" r="2"   opacity="0.65" />
              <circle cx="262" cy="107" r="2"   opacity="0.75" />
              <circle cx="422" cy="72"  r="1.8" opacity="0.5"  />
              <circle cx="443" cy="107" r="1.5" opacity="0.4"  />
              <circle cx="407" cy="45"  r="1.5" opacity="0.45" />
            </g>
            <g stroke="#00FF7F" strokeWidth="0.9" strokeOpacity="0.6" fill="none">
              <line x1="248" y1="70"  x2="285" y2="52"  />
              <line x1="285" y1="52"  x2="312" y2="83"  />
              <line x1="312" y1="83"  x2="352" y2="65"  />
              <line x1="352" y1="65"  x2="378" y2="93"  />
              <line x1="378" y1="93"  x2="357" y2="122" />
              <line x1="357" y1="122" x2="298" y2="128" />
              <line x1="298" y1="128" x2="262" y2="107" />
              <line x1="262" y1="107" x2="248" y2="70"  />
              <line x1="312" y1="83"  x2="298" y2="128" />
              <line x1="312" y1="83"  x2="262" y2="107" />
              <line x1="378" y1="93"  x2="422" y2="72"  />
              <line x1="422" y1="72"  x2="443" y2="107" />
              <line x1="352" y1="65"  x2="407" y2="45"  />
              <line x1="407" y1="45"  x2="422" y2="72"  />
            </g>
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex items-center justify-between px-4 lg:px-6 gap-2">
          <div className="flex items-center gap-3 shrink-0">
            <Logo />
            <span className="text-xs bg-brandDark/15 text-brand px-2 py-0.5 rounded-full border border-brandDark/30">USD/CLP</span>
          </div>
          <div className="flex items-center gap-2 lg:gap-3 flex-wrap justify-end">
            <Suspense fallback={null}>
              <UltimaActualizacion />
            </Suspense>
            <PanelAlertas />
            <BotonBriefing />
            <BotonRefresh />
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse"></span>
              En vivo · cada 15 min
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-line px-4 lg:px-6 bg-panel/50">
        <nav className="flex gap-1">
          <button className="px-4 py-2 text-sm border-b-2 border-brand text-brand font-medium">
            USD / CLP
          </button>
          <button className="px-4 py-2 text-sm text-muted cursor-not-allowed" disabled>
            + Instrumento
          </button>
        </nav>
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

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:h-[calc(100vh-128px)]">

        {/* Noticias */}
        <div className="lg:col-span-1 border-r border-line lg:overflow-y-auto">
          <Suspense fallback={<CargandoPanel texto="Cargando noticias..." />}>
            <PanelNoticias />
          </Suspense>
        </div>

        {/* Cotización + Gráfico + Factores (desktop) */}
        <div className="hidden lg:block lg:col-span-1 border-r border-line overflow-y-auto">
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
        <div className="lg:col-span-1 lg:overflow-y-auto border-t lg:border-t-0 border-line">
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
