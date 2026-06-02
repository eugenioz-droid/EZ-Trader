import Image from 'next/image'

export default function Logo() {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <Image
        src="/logo.png"
        alt="EZ Trader logo"
        width={96}
        height={96}
        className="object-contain h-16 w-16 lg:h-[88px] lg:w-[88px]"
        priority
      />
      <div className="leading-none hidden sm:block border-l border-line pl-3">
        <div className="text-[10px] lg:text-[11px] tracking-[0.22em] text-brandDark font-semibold">
          TRADE SMART.
        </div>
        <div className="text-[10px] lg:text-[11px] tracking-[0.22em] text-muted font-semibold mt-1">
          GROW CONFIDENT.
        </div>
      </div>
    </div>
  )
}
