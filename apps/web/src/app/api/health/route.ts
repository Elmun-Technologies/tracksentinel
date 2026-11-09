import { NextResponse } from 'next/server'

/**
 * Public health check endpoint.
 * Used by Docker health checks and load balancers.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'tracksentinel-web',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  )
}
