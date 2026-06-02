import Image from 'next/image'

export default function Logo() {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <Image
        src="/logo.png"
        alt="EZ Trader logo"
        width={56}
        height={56}
        className="object-contain"
        priority
      />
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
