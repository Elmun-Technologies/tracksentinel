import 'dotenv/config'
import { createServer } from 'node:http'
import { claimNextJob, processJob, scheduleMissingWebsiteChecks } from './scheduler'
import { closeBrowser } from './monitor'

const PORT = process.env.WORKER_HEALTH_PORT ?? '9090'
let isRunning = true
let activeJobsCount = 0

// Minimal HTTP health check server for Docker and probes
const server = createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'tracksentinel-worker',
        activeJobs: activeJobsCount,
        timestamp: new Date().toISOString(),
      })
    )
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[worker] Health check server listening on port ${PORT}`)
})

// Worker main processing loop
async function runWorkerLoop() {
  console.log('[worker] Starting monitoring scheduler loop...')

  // Initial pass to ensure websites have scheduled checks
  try {
    await scheduleMissingWebsiteChecks()
  } catch (err) {
    console.error('[worker] Initial schedule sync error:', err)
  }

  // Periodic schedule sync every 60s
  setInterval(async () => {
    if (!isRunning) return
    try {
      await scheduleMissingWebsiteChecks()
    } catch (err) {
      console.error('[worker] Periodic schedule sync error:', err)
    }
  }, 60_000)

  // Job consumer loop
  while (isRunning) {
    try {
      const claim = await claimNextJob()
      if (claim) {
        activeJobsCount++
        console.log(`[worker] Processing job ${claim.job.id} for website ${claim.website.name} (${claim.website.url})`)
        await processJob(claim.job, claim.website)
        activeJobsCount--
      } else {
        // No jobs due, backoff briefly
        await new Promise((r) => setTimeout(r, 4000))
      }
    } catch (loopErr) {
      console.error('[worker] Error in job processor loop:', loopErr)
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}

runWorkerLoop().catch((err) => {
  console.error('[worker] Fatal error in main worker loop:', err)
  process.exit(1)
})

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`[worker] Received ${signal} — shutting down gracefully...`)
  isRunning = false

  server.close(() => {
    console.log('[worker] HTTP server closed')
  })

  try {
    await closeBrowser()
    console.log('[worker] Browser resources closed')
  } catch (err) {
    console.error('[worker] Error closing browser:', err)
  }

  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
