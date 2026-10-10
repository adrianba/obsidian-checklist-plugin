const {readFile} = require('node:fs/promises')
const path = require('node:path')
const {runInNewContext} = require('node:vm')
const {before, describe, it} = require('node:test')
const assert = require('node:assert/strict')
const {build} = require('esbuild')
const {compile, preprocess} = require('svelte/compiler')
const autoPreprocess = require('svelte-preprocess')
const {obsidian} = require('./helpers/runtime.cjs')

describe('Svelte accessibility warnings', () => {
  for (const name of ['App', 'CheckCircle', 'ChecklistGroup', 'Icon', 'ChecklistItem', 'Header']) {
    it(`${name} compiles without accessibility warnings`, async () => {
      const filename = path.resolve(__dirname, `../src/svelte/${name}.svelte`)
      const source = await readFile(filename, 'utf8')
      const processed = await preprocess(source, autoPreprocess(), {filename})
      const {warnings} = compile(processed.code, {filename, css: true})

      assert.deepEqual(
        warnings.filter(warning => warning.code.startsWith('a11y-')),
        [],
      )
    })
  }
})

describe('accessible task labels', () => {
  let component

  before(async () => {
    const filename = path.resolve(__dirname, '../src/svelte/ChecklistItem.svelte')
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
    const module = {exports: {}}
    runInNewContext(result.outputFiles[0].text, {
      module,
      exports: module.exports,
      require: id => id === 'obsidian' ? obsidian : require(id),
    })
    if (!module.exports.default) throw new Error('Missing compiled task component')
    component = module.exports.default
  })

  const item = (displayText, children = []) => ({
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
    assert.ok(html.includes('Complete: visible text'))
    assert.ok(!html.includes('private'))
    assert.ok(html.includes('role="link"'))
    assert.ok(html.includes('tabindex="0"'))
  })

  it('retains comments in accessible labels when hiding is disabled', () => {
    const {html} = component.render({item: item('visible <!-- private --> text')})
    assert.ok(html.includes('Complete: visible &lt;!-- private --> text'))
  })

  it('uses safe display labels for nested children too', () => {
    const child = {...item('child text'), line: 1, parentLine: 0}
    const {html} = component.render({item: item('parent text', [child])})
    assert.ok(html.includes('Complete: parent text'))
    assert.ok(html.includes('Complete: child text'))
    assert.ok(!html.includes('private'))
  })
})
