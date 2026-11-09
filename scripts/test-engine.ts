import { validateTargetUrl } from './ssrf'
import { executePixelCheck } from './monitor'

async function runTests() {
  console.log('🧪 Starting TrackSentinel Security & Monitoring Engine Tests...\n')

  // TEST 1: SSRF Protection
  console.log('--- TEST 1: SSRF Protections ---')
  const ssrfCases = [
    { url: 'http://localhost:3000', expectedSafe: false },
    { url: 'http://127.0.0.1/admin', expectedSafe: false },
    { url: 'http://169.254.169.254/latest/meta-data/', expectedSafe: false },
    { url: 'http://10.0.0.1:8080', expectedSafe: false },
    { url: 'http://192.168.1.1', expectedSafe: false },
    { url: 'https://example.com', expectedSafe: true },
  ]

  let ssrfPassed = 0
  for (const c of ssrfCases) {
    const res = await validateTargetUrl(c.url)
    const passed = res.safe === c.expectedSafe
    console.log(
      `  [${passed ? 'PASS' : 'FAIL'}] ${c.url} => safe: ${res.safe} (expected: ${c.expectedSafe}) ${res.reason ? '(' + res.reason + ')' : ''}`
    )
    if (passed) ssrfPassed++
  }

  console.log(`\nSSRF Test Result: ${ssrfPassed}/${ssrfCases.length} passed.\n`)

  // TEST 2: Monitoring Engine on a site without pixel (example.com)
  console.log('--- TEST 2: Detection on site without Pixel (example.com) ---')
  const resNoPixel = await executePixelCheck({
    id: 'test-site-1',
    url: 'https://example.com',
    pixelId: '987654321012345',
    expectedEvents: ['PageView'],
  })

  console.log('Result for example.com:')
  console.log(`  Status: ${resNoPixel.status} (expected: failed)`)
  console.log(`  Pixel Detected: ${resNoPixel.pixelDetected} (expected: false)`)
  console.log(`  Network Requests: ${resNoPixel.networkRequestsObserved}`)
  console.log(`  Error Message: ${resNoPixel.errorMessage}`)

  const test2Passed = resNoPixel.status === 'failed' && !resNoPixel.pixelDetected
  console.log(`\nTest 2 Result: ${test2Passed ? 'PASS' : 'FAIL'}\n`)

  console.log('🏁 All engine automated tests completed.')
  process.exit(0)
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
