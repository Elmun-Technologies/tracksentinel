import { describe, it, expect } from 'vitest'
import { validateTargetUrl, isPrivateIp } from './packages/worker/src/ssrf'

describe('SSRF Protection Engine', () => {
  it('should block localhost and variations', async () => {
    const r1 = await validateTargetUrl('http://localhost')
    const r2 = await validateTargetUrl('http://localhost:3000/api')
    const r3 = await validateTargetUrl('http://sub.localhost')

    expect(r1.safe).toBe(false)
    expect(r2.safe).toBe(false)
    expect(r3.safe).toBe(false)
  })

  it('should block IPv4 loopback (127.0.0.0/8)', async () => {
    const r1 = await validateTargetUrl('http://127.0.0.1')
    const r2 = await validateTargetUrl('http://127.0.0.5:8080')
    const r3 = await validateTargetUrl('http://127.255.255.254')

    expect(r1.safe).toBe(false)
    expect(r2.safe).toBe(false)
    expect(r3.safe).toBe(false)
  })

  it('should block RFC1918 private IPv4 networks', async () => {
    expect(isPrivateIp('10.0.0.1')).toBe(true)
    expect(isPrivateIp('10.254.254.1')).toBe(true)
    expect(isPrivateIp('172.16.0.1')).toBe(true)
    expect(isPrivateIp('172.31.255.254')).toBe(true)
    expect(isPrivateIp('192.168.1.1')).toBe(true)
    expect(isPrivateIp('192.168.100.50')).toBe(true)

    const r1 = await validateTargetUrl('http://10.0.0.5/page')
    const r2 = await validateTargetUrl('http://192.168.0.1')
    expect(r1.safe).toBe(false)
    expect(r2.safe).toBe(false)
  })

  it('should block Cloud & Hetzner metadata address (169.254.169.254)', async () => {
    expect(isPrivateIp('169.254.169.254')).toBe(true)
    const res = await validateTargetUrl('http://169.254.169.254/latest/meta-data/')
    expect(res.safe).toBe(false)
    expect(res.reason).toContain('private or restricted range')
  })

  it('should block non-http/https protocols', async () => {
    const fileRes = await validateTargetUrl('file:///etc/passwd')
    const ftpRes = await validateTargetUrl('ftp://example.com')
    const gopherRes = await validateTargetUrl('gopher://example.com')

    expect(fileRes.safe).toBe(false)
    expect(ftpRes.safe).toBe(false)
    expect(gopherRes.safe).toBe(false)
  })

  it('should block dangerous internal service ports', async () => {
    const p1 = await validateTargetUrl('http://example.com:5432') // postgres
    const p2 = await validateTargetUrl('http://example.com:22')   // ssh
    const p3 = await validateTargetUrl('http://example.com:6379') // redis
    const p4 = await validateTargetUrl('http://example.com:9090') // internal worker

    expect(p1.safe).toBe(false)
    expect(p2.safe).toBe(false)
    expect(p3.safe).toBe(false)
    expect(p4.safe).toBe(false)
  })

  it('should allow legitimate public web URLs', async () => {
    const res = await validateTargetUrl('https://example.com')
    expect(res.safe).toBe(true)
    expect(res.resolvedIp).toBeDefined()
  })
})
