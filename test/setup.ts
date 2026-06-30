/**
 * Vitest setup: provide the minimal browser globals the parsing/sorting code
 * touches (`navigator.language` for `localeCompare`, `window` for `isMacOS`),
 * so the `node` test environment can run them without jsdom.
 */
const navigatorStub = {
  language: 'en-US',
  languages: ['en-US'],
  userAgent: 'vitest (Macintosh)',
}

if (typeof globalThis.navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', {
    value: navigatorStub,
    configurable: true,
  })
}

if (typeof (globalThis as any).window === 'undefined') {
  ;(globalThis as any).window = {navigator: globalThis.navigator}
}
