import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import {build} from 'esbuild'
import {compile, preprocess} from 'svelte/compiler'
import autoPreprocess from 'svelte-preprocess'
import {beforeAll, describe, expect, it} from 'vitest'

import type {TodoItem} from '../src/_types'
import * as obsidian from './__mocks__/obsidian'

describe('Svelte accessibility warnings', () => {
  it.each(['App', 'CheckCircle', 'ChecklistGroup', 'Icon', 'ChecklistItem', 'Header'])(
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

describe('accessible task labels', () => {
  let component: {render: (props: Record<string, unknown>) => {html: string}}

  beforeAll(async () => {
    const filename = fileURLToPath(
      new URL('../src/svelte/ChecklistItem.svelte', import.meta.url),
    )
    const result = await build({
      entryPoints: [filename],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      write: false,
      external: ['obsidian'],
      plugins: [{
        name: 'svelte-label-test',
        setup(builder) {
          builder.onLoad({filter: /\.svelte$/}, async ({path}) => {
            const source = await readFile(path, 'utf8')
            const processed = await preprocess(source, autoPreprocess(), {filename: path})
            const {js} = compile(processed.code, {filename: path, generate: 'ssr'})
            return {contents: js.code, loader: 'js'}
          })
        },
      }],
    })
    const module: {exports: {default?: typeof component}} = {exports: {}}
    const require = createRequire(import.meta.url)
    runInNewContext(result.outputFiles[0].text, {
      module,
      exports: module.exports,
      require: (id: string) => id === 'obsidian' ? obsidian : require(id),
    })
    if (!module.exports.default) throw new Error('Missing compiled task component')
    component = module.exports.default
  })

  const item = (displayText: string, children: TodoItem[] = []): TodoItem => ({
    checked: false,
    filePath: 'note.md',
    fileName: 'note.md',
    fileLabel: 'note',
    fileCreatedTs: 1,
    fileModifiedTs: 1,
    line: 0,
    filterTags: [],
    children,
    sourceLine: '- [ ] visible <!-- private --> text',
    originalText: 'visible <!-- private --> text',
    displayText,
    rawHTML: '<p>visible text</p>\n',
  })

  it('uses display text, not unstripped source text, for the checkbox label', () => {
    const {html} = component.render({item: item('visible text')})
    expect(html).toContain('Complete: visible text')
    expect(html).not.toContain('private')
    expect(html).toContain('role="link"')
    expect(html).toContain('tabindex="0"')
  })

  it('retains comments in accessible labels when hiding is disabled', () => {
    const {html} = component.render({item: item('visible <!-- private --> text')})
    expect(html).toContain('Complete: visible &lt;!-- private --> text')
  })

  it('uses safe display labels for nested children too', () => {
    const child = {...item('child text'), line: 1, parentLine: 0}
    const {html} = component.render({item: item('parent text', [child])})
    expect(html).toContain('Complete: parent text')
    expect(html).toContain('Complete: child text')
    expect(html).not.toContain('private')
  })
})
