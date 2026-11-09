import { chromium } from 'playwright';
import { validateTargetUrl } from './ssrf';
let sharedBrowser = null;
export async function getBrowser() {
    if (!sharedBrowser || !sharedBrowser.isConnected()) {
        sharedBrowser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
            ],
        });
    }
    return sharedBrowser;
}
export async function closeBrowser() {
    if (sharedBrowser && sharedBrowser.isConnected()) {
        await sharedBrowser.close();
        sharedBrowser = null;
    }
}
/**
 * Executes a Meta Pixel monitoring check on a target website.
 */
export async function executePixelCheck(target) {
    const startTime = Date.now();
    const logs = [];
    const log = (msg) => logs.push(`[${new Date().toISOString()}] ${msg}`);
    log(`Starting check for ${target.url} (Expected Pixel ID: ${target.pixelId})`);
    // 1. SSRF Protection validation
    const ssrfCheck = await validateTargetUrl(target.url);
    if (!ssrfCheck.safe) {
        log(`SSRF Validation failed: ${ssrfCheck.reason}`);
        return {
            status: 'inconclusive',
            pixelDetected: false,
            pixelIdMatched: false,
            detectedPixelIds: [],
            eventsObserved: [],
            networkRequestsObserved: 0,
            duplicateEventsSuspected: [],
            errorMessage: `Blocked by SSRF protection: ${ssrfCheck.reason}`,
            rawLog: logs.join('\n'),
            durationMs: Date.now() - startTime,
        };
    }
    log(`SSRF validation passed (Resolved IP: ${ssrfCheck.resolvedIp})`);
    let browser;
    try {
        browser = await getBrowser();
    }
    catch (err) {
        log(`Failed to launch browser: ${err.message}`);
        return {
            status: 'inconclusive',
            pixelDetected: false,
            pixelIdMatched: false,
            detectedPixelIds: [],
            eventsObserved: [],
            networkRequestsObserved: 0,
            duplicateEventsSuspected: [],
            errorMessage: `Browser launch error: ${err.message}`,
            rawLog: logs.join('\n'),
            durationMs: Date.now() - startTime,
        };
    }
    let context = null;
    const observedEvents = [];
    const detectedPixelIds = new Set();
    let networkRequestsObserved = 0;
    try {
        // 2. Create isolated browser context (no shared cache/cookies)
        context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 TrackSentinel/1.0',
            ignoreHTTPSErrors: false,
            bypassCSP: false,
        });
        // 3. Inject observation hook before page scripts execute (via clean script string)
        await context.addInitScript(`
      (function() {
        window.__ts_events = [];
        window.__ts_inits = [];

        function hookFbq(originalFbq) {
          var proxied = function() {
            var args = Array.prototype.slice.call(arguments);
            var action = args[0];
            if (action === 'init') {
              var pixelId = String(args[1] || '');
              window.__ts_inits.push(pixelId);
            } else if (action === 'track' || action === 'trackCustom') {
              var eventName = String(args[1] || '');
              var payload = args[2] || {};
              window.__ts_events.push({
                name: eventName,
                action: action,
                payload: payload,
                timestamp: new Date().toISOString()
              });
            }
            if (typeof originalFbq === 'function') {
              return originalFbq.apply(this, args);
            }
          };
          for (var key in originalFbq) {
            if (Object.prototype.hasOwnProperty.call(originalFbq, key)) {
              proxied[key] = originalFbq[key];
            }
          }
          return proxied;
        }

        var currentFbq = window.fbq;
        if (typeof currentFbq === 'function') {
          window.fbq = hookFbq(currentFbq);
        } else {
          Object.defineProperty(window, 'fbq', {
            configurable: true,
            enumerable: true,
            get: function() { return currentFbq; },
            set: function(val) { currentFbq = hookFbq(val); }
          });
        }
      })();
    `);
        const page = await context.newPage();
        // 4. Intercept network requests to Facebook Pixel endpoints
        page.on('request', (req) => {
            const reqUrl = req.url();
            // Match Meta Pixel tracking request patterns
            if (reqUrl.includes('facebook.com/tr') ||
                reqUrl.includes('facebook.com/tr/') ||
                reqUrl.includes('connect.facebook.net')) {
                networkRequestsObserved++;
                log(`Observed Meta network request: ${reqUrl.substring(0, 100)}...`);
                try {
                    const parsedUrl = new URL(reqUrl);
                    const pixelId = parsedUrl.searchParams.get('id');
                    const eventName = parsedUrl.searchParams.get('ev');
                    if (pixelId) {
                        detectedPixelIds.add(pixelId);
                    }
                    if (eventName) {
                        observedEvents.push({
                            name: eventName,
                            pixelId: pixelId || undefined,
                            source: 'network_request',
                            payload: Object.fromEntries(parsedUrl.searchParams.entries()),
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
                catch {
                    // Ignore URL parse errors on malformed requests
                }
            }
        });
        // 5. Navigate to website with safe timeout
        log(`Navigating to ${target.url}...`);
        try {
            await page.goto(target.url, {
                waitUntil: 'domcontentloaded',
                timeout: 25000,
            });
            log(`Initial DOM content loaded`);
        }
        catch (navError) {
            log(`Navigation error/timeout: ${navError.message}`);
            return {
                status: 'inconclusive',
                pixelDetected: false,
                pixelIdMatched: false,
                detectedPixelIds: [],
                eventsObserved: [],
                networkRequestsObserved,
                duplicateEventsSuspected: [],
                errorMessage: `Target website load failed or timed out: ${navError.message}`,
                rawLog: logs.join('\n'),
                durationMs: Date.now() - startTime,
            };
        }
        // Wait a brief moment for async pixel triggers / network requests
        await page.waitForTimeout(4000);
        // 6. Extract in-memory events from hooked window object
        try {
            const clientInits = (await page.evaluate('window.__ts_inits || []'));
            const clientEvents = (await page.evaluate('window.__ts_events || []'));
            for (const id of clientInits) {
                if (id)
                    detectedPixelIds.add(String(id).trim());
            }
            for (const ev of clientEvents) {
                observedEvents.push({
                    name: ev.name,
                    source: 'js_fbq',
                    payload: ev.payload,
                    timestamp: ev.timestamp,
                });
            }
            log(`Extracted ${clientInits.length} init calls and ${clientEvents.length} JS events from DOM`);
        }
        catch (evalErr) {
            log(`Could not evaluate in-page JS: ${evalErr.message}`);
        }
        // 7. Inspect HTML elements for noscript pixel img or script tags
        try {
            const noscriptImgSrcs = await page.$$eval('noscript img, img', (imgs) => imgs
                .map((img) => img.getAttribute('src') || '')
                .filter((src) => src.includes('facebook.com/tr')));
            for (const src of noscriptImgSrcs) {
                try {
                    const parsed = new URL(src);
                    const id = parsed.searchParams.get('id');
                    const ev = parsed.searchParams.get('ev') || 'PageView';
                    if (id)
                        detectedPixelIds.add(id);
                    observedEvents.push({
                        name: ev,
                        pixelId: id || undefined,
                        source: 'noscript_img',
                        timestamp: new Date().toISOString(),
                    });
                }
                catch {
                    // ignore
                }
            }
        }
        catch {
            // ignore DOM eval error
        }
        // 8. Analyze duplicate events
        const duplicates = [];
        const eventCountsByName = new Map();
        for (const ev of observedEvents) {
            eventCountsByName.set(ev.name, (eventCountsByName.get(ev.name) || 0) + 1);
        }
        for (const [name, count] of eventCountsByName.entries()) {
            if (name === 'PageView' && count > 2) {
                duplicates.push({
                    eventName: name,
                    count,
                    reason: `PageView fired ${count} times on initial page load (expected 1)`,
                });
            }
            else if (name !== 'PageView' && count > 1) {
                duplicates.push({
                    eventName: name,
                    count,
                    reason: `${name} event triggered ${count} times on passive load`,
                });
            }
        }
        // 9. Status calculation (passed / warning / failed / inconclusive)
        const detectedIdsList = Array.from(detectedPixelIds);
        const pixelDetected = detectedIdsList.length > 0 || networkRequestsObserved > 0;
        const pixelIdMatched = detectedIdsList.includes(target.pixelId.trim());
        let status = 'passed';
        let errorMessage;
        if (!pixelDetected) {
            status = 'failed';
            errorMessage = 'Meta Pixel script or tracking requests were not detected.';
        }
        else if (!pixelIdMatched) {
            status = 'failed';
            errorMessage = `Expected Pixel ID ${target.pixelId} was not found. Detected IDs: [${detectedIdsList.join(', ') || 'none'}]`;
        }
        else {
            const observedNames = new Set(observedEvents.map((e) => e.name));
            const missingEvents = target.expectedEvents.filter((exp) => exp === 'PageView' && !observedNames.has(exp));
            if (missingEvents.length > 0) {
                status = 'warning';
                errorMessage = `Expected initial event (${missingEvents.join(', ')}) was not observed on page load.`;
            }
            else if (duplicates.length > 0) {
                status = 'warning';
                errorMessage = `Suspected duplicate events detected: ${duplicates.map((d) => d.reason).join('; ')}`;
            }
            else {
                status = 'passed';
            }
        }
        log(`Check completed with status: ${status} in ${Date.now() - startTime}ms`);
        return {
            status,
            pixelDetected,
            pixelIdMatched,
            detectedPixelIds: detectedIdsList,
            eventsObserved: observedEvents,
            networkRequestsObserved,
            duplicateEventsSuspected: duplicates,
            errorMessage,
            rawLog: logs.join('\n'),
            durationMs: Date.now() - startTime,
        };
    }
    catch (unexpectedError) {
        log(`Unexpected error during check: ${unexpectedError.message}`);
        return {
            status: 'inconclusive',
            pixelDetected: false,
            pixelIdMatched: false,
            detectedPixelIds: [],
            eventsObserved: [],
            networkRequestsObserved,
            duplicateEventsSuspected: [],
            errorMessage: `Monitoring check inconclusive due to error: ${unexpectedError.message}`,
            rawLog: logs.join('\n'),
            durationMs: Date.now() - startTime,
        };
    }
    finally {
        if (context) {
            await context.close().catch(() => { });
        }
    }
}
//# sourceMappingURL=monitor.js.map