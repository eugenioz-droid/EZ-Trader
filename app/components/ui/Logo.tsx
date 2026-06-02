export default function Logo() {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <svg width="48" height="48" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="ez-green" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00FF7F" />
            <stop offset="100%" stopColor="#00B26A" />
          </linearGradient>
          <linearGradient id="ez-silver" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#EAEEF2" />
            <stop offset="50%" stopColor="#C4CDD6" />
            <stop offset="100%" stopColor="#8A96A6" />
          </linearGradient>
        </defs>
        {/* Badge */}
        <rect width="44" height="44" rx="8" fill="#111827" />
        <rect width="44" height="44" rx="8" fill="none" stroke="#00B26A" strokeWidth="0.9" strokeOpacity="0.45" />
        {/* E — green gradient */}
        <path d="M5,8 L22,8 L22,13 L10,13 L10,19 L20,19 L20,23 L10,23 L10,30 L22,30 L22,36 L5,36 Z" fill="url(#ez-green)" />
        {/* Z — silver gradient, overlapping right side */}
        <path d="M20,8 L39,8 L39,13 L28,31 L39,31 L39,36 L20,36 L20,31 L31,13 L20,13 Z" fill="url(#ez-silver)" />
      </svg>

      <div className="leading-none">
        <div className="text-xl font-bold tracking-tight">
          <span className="text-brand">EZ</span><span className="text-snow"> Trader</span>
        </div>
        <div className="text-[9px] tracking-[0.22em] text-brandDark font-semibold mt-[5px]">
          TRADE SMART. GROW CONFIDENT.
        </div>
      </div>
    </div>
  )
}
