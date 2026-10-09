import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'

import {compile, preprocess} from 'svelte/compiler'
import autoPreprocess from 'svelte-preprocess'
import {describe, expect, it} from 'vitest'

describe('Svelte accessibility warnings', () => {
  it.each(['ChecklistGroup', 'Icon', 'ChecklistItem', 'Header'])(
    '%s compiles without accessibility warnings',
    async name => {
      const filename = fileURLToPath(
        new URL(`../src/svelte/${name}.svelte`, import.meta.url),
      )
      const source = await readFile(filename, 'utf8')
      const processed = await preprocess(source, autoPreprocess(), {filename})
      const {warnings} = compile(processed.code, {filename, css: true})

      expect(
        warnings.filter(warning => warning.code.startsWith('a11y-')),
      ).toEqual([])
    },
  )
})
