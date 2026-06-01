import { NextResponse } from 'next/server'
import { generarBriefing } from '@/app/lib/briefing'

export async function GET() {
  const md = await generarBriefing()
  const fecha = new Date().toISOString().slice(0, 10)

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="ez-trader-briefing-${fecha}.md"`
    }
  })
}
