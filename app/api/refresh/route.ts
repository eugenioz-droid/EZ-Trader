import { NextRequest, NextResponse } from 'next/server'

// Endpoint público que dispara el cron internamente
// No expone el CRON_SECRET al frontend
export async function POST(req: NextRequest) {
  const host = req.headers.get('host') ?? 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'

  const res = await fetch(`${protocol}://${host}/api/cron`, {
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`
    }
  })

  const data = await res.json()
  return NextResponse.json(data)
}
