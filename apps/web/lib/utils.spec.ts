import { describe, expect, it } from 'vitest'
import { safeNextPath } from './utils'

describe('safeNextPath', () => {
  it.each([
    '/',
    '/home',
    '/e/3f1c9a2e-1b2c-4d5e-8f90-123456789abc',
    '/groups/abc?tab=membros',
    '/join/ABCD2345#topo',
    '/onboarding?next=%2Fhome',
  ])('aceita caminho interno %s', (path) => {
    expect(safeNextPath(path)).toBe(path)
  })

  it.each([
    ['URL absoluta https', 'https://site-falso.com'],
    ['URL absoluta http', 'http://site-falso.com/login'],
    ['protocol-relative', '//site-falso.com'],
    ['protocol-relative com path', '//site-falso.com/home'],
    ['barra invertida', '/\\site-falso.com'],
    ['barra invertida dupla', '\\\\site-falso.com'],
    ['tab que vira //', '/\t/site-falso.com'],
    ['quebra de linha', '/\n/site-falso.com'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,<script>alert(1)</script>'],
    ['caminho relativo', 'home'],
    ['vazio', ''],
  ])('recusa %s', (_label, path) => {
    expect(safeNextPath(path)).toBe('/')
  })

  it('usa o fallback quando next está ausente', () => {
    expect(safeNextPath(null)).toBe('/')
    expect(safeNextPath(undefined, '/home')).toBe('/home')
  })

  it('usa o fallback informado quando recusa', () => {
    expect(safeNextPath('https://site-falso.com', '/home')).toBe('/home')
  })
})
