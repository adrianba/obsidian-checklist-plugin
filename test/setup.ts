/**
 * Vitest setup: provide the minimal browser globals the parsing/sorting code
 * touches (`navigator.language` for `localeCompare`), so the `node` test
 * environment can run them without jsdom.
 */
const navigatorStub = {
  language: 'en-US',
  languages: ['en-US'],
}

if (typeof globalThis.navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', {
    value: navigatorStub,
    configurable: true,
  })
}
