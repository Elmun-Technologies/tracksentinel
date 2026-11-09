import dns from 'node:dns/promises'
import net from 'node:net'
import { URL } from 'node:url'

export interface ValidationResult {
  safe: boolean
  url: string
  reason?: string
  resolvedIp?: string
}

/**
 * Checks if an IPv4 address is in a private, loopback, or cloud-metadata range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true
  }

  const [a, b] = parts

  // 0.0.0.0/8 - Current network
  if (a === 0) return true

  // 127.0.0.0/8 - Loopback
  if (a === 127) return true

  // 10.0.0.0/8 - Private network
  if (a === 10) return true

  // 172.16.0.0/12 - Private network (172.16.x.x - 172.31.x.x)
  if (a === 172 && b >= 16 && b <= 31) return true

  // 192.168.0.0/16 - Private network
  if (a === 192 && b === 168) return true

  // 169.254.0.0/16 - Link-local / Cloud metadata (AWS, GCP, Hetzner metadata: 169.254.169.254)
  if (a === 169 && b === 254) return true

  // 100.64.0.0/10 - Carrier-grade NAT
  if (a === 100 && b >= 64 && b <= 127) return true

  // 198.18.0.0/15 - Benchmark testing
  if (a === 198 && (b === 18 || b === 19)) return true

  // 224.0.0.0/4 - Multicast
  if (a >= 224 && a <= 239) return true

  // 240.0.0.0/4 - Reserved
  if (a >= 240) return true

  return false
}

/**
 * Checks if an IPv6 address is in a private, loopback, or internal range.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim()

  // ::1 loopback
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true

  // :: unspecified
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true

  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  if (normalized.startsWith('::ffff:')) {
    const ipv4 = normalized.replace('::ffff:', '')
    if (net.isIPv4(ipv4)) {
      return isPrivateIPv4(ipv4)
    }
  }

  // fc00::/7 - Unique Local Addresses (ULA)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true

  // fe80::/10 - Link-local
  if (normalized.startsWith('fe80:')) return true

  return false
}

/**
 * Checks if an IP address is considered private/internal.
 */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isPrivateIPv4(ip)
  }
  if (net.isIPv6(ip)) {
    return isPrivateIPv6(ip)
  }
  return true // If not a valid IP, treat as unsafe
}

// Disallowed internal or dangerous ports
const BLOCKED_PORTS = new Set([
  20, 21, 22, 23, 25, 53, 69, 110, 111, 135, 137, 138, 139, 143,
  445, 1433, 1521, 2049, 2375, 2376, 3306, 3389, 5000, 5432, 6379,
  8080, 8443, 9000, 9090, 9200, 11211, 27017, 28017
])

/**
 * Validates a target URL against SSRF attacks.
 * Resolves DNS to check real destination IP addresses.
 */
export async function validateTargetUrl(rawUrl: string): Promise<ValidationResult> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { safe: false, url: rawUrl, reason: 'Invalid URL format' }
  }

  // Scheme validation: strictly http or https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      safe: false,
      url: rawUrl,
      reason: `Disallowed protocol: ${parsed.protocol}. Only http: and https: are allowed.`,
    }
  }

  const hostname = parsed.hostname.toLowerCase().trim()

  // Hostname string checks
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data'
  ) {
    return { safe: false, url: rawUrl, reason: 'Access to localhost or internal hostnames is blocked.' }
  }

  // Check port
  const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80)
  if (BLOCKED_PORTS.has(port)) {
    return {
      safe: false,
      url: rawUrl,
      reason: `Access to port ${port} is restricted for security.`,
    }
  }

  // If hostname is directly an IP literal
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      return { safe: false, url: rawUrl, reason: `Direct IP ${hostname} is in a private or restricted range.` }
    }
    return { safe: true, url: parsed.toString(), resolvedIp: hostname }
  }

  // Resolve hostname via DNS to prevent DNS rebinding to internal IPs
  try {
    const lookup = await dns.lookup(hostname, { all: true })
    if (!lookup || lookup.length === 0) {
      return { safe: false, url: rawUrl, reason: `Could not resolve hostname "${hostname}"` }
    }

    for (const record of lookup) {
      if (isPrivateIp(record.address)) {
        return {
          safe: false,
          url: rawUrl,
          reason: `Resolved IP ${record.address} for "${hostname}" is within a restricted private range.`,
          resolvedIp: record.address,
        }
      }
    }

    return {
      safe: true,
      url: parsed.toString(),
      resolvedIp: lookup[0].address,
    }
  } catch (err: any) {
    return {
      safe: false,
      url: rawUrl,
      reason: `DNS resolution failed for ${hostname}: ${err.message || 'unknown error'}`,
    }
  }
}

