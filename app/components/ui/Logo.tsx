// Logo-marca recreado según graphics/Diseño - EZ Trader.png
// Reemplazar por el PNG aislado (fondo transparente) cuando esté disponible.
export default function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-9 w-9 rounded-lg bg-elevated border border-brandDark/40 flex items-center justify-center shadow-inner">
        <span className="text-base font-black italic tracking-tighter -skew-x-6 select-none">
          <span className="text-brand">E</span>
          <span className="text-silver">Z</span>
        </span>
      </div>
      <div className="leading-none">
        <div className="text-lg lg:text-xl font-bold tracking-tight">
          <span className="text-brand">EZ</span> <span className="text-snow">Trader</span>
        </div>
        <div className="hidden md:block text-[8px] tracking-[0.18em] text-muted mt-1">
          TRADE SMART. GROW CONFIDENT.
        </div>
      </div>
    </div>
  )
}
