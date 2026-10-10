const assert = require('node:assert/strict')
const {load} = require('./helpers/runtime.cjs')
const {describe, it} = require('node:test')
const MD = require('markdown-it')
// Bundle the plugins together so their shared regex rule counter stays unique.
const {commentPlugin, highlightPlugin, linkPlugin, tagPlugin} =
  load('tests/helpers/markdown.ts')
const linkMap = new Map([['MyNote', {filePath: 'MyNote', linkName: 'My Note'}]])
const createRenderer = () => new MD().use(commentPlugin).use(linkPlugin(linkMap)).use(tagPlugin).use(highlightPlugin)
describe('markdown render plugins', () => {
  it('renders tags as Obsidian tag anchors', () => {
    const md = createRenderer()
    assert.equal(md.renderInline('#work'), '<a href="#work" data-type="tag" class="tag" target="_blank" rel="noopener">#work</a>')
  })
  it('escapes special characters in tag anchors', () => {
    const md = createRenderer()
    assert.equal(md.renderInline('#a&b"\'<x>'), '<a href="#a&amp;b&quot;&#39;&lt;x&gt;" data-type="tag" class="tag" target="_blank" rel="noopener">#a&amp;b&quot;&#39;&lt;x&gt;</a>')
  })
  it('renders highlight markup as mark elements', () => {
    const md = createRenderer()
    assert.equal(md.renderInline('==text=='), '<mark>text</mark>')
  })
  it('renders %%...%% as an HTML comment', () => {
    const md = createRenderer()
    assert.equal(md.renderInline('%%note%%'), '<!--note-->')
  })
  it('renders resolved wiki links with link metadata', () => {
    const md = createRenderer()
    assert.equal(md.renderInline('[[MyNote]]'), '<a href="#" data-href="MyNote" data-type="link" data-filepath="MyNote" class="internal-link">My Note</a>')
  })
  it('renders resolved wiki links with labels', () => {
    const md = createRenderer()
    assert.equal(md.renderInline('[[MyNote|Alias]]'), '<a href="#" data-href="MyNote" data-type="link" data-filepath="MyNote" class="internal-link">Alias</a>')
  })
  it('trims spaces around wiki link pipes before resolving', () => {
    const md = createRenderer()
    assert.equal(md.renderInline('[[ MyNote | Alias ]]'), '<a href="#" data-href="MyNote" data-type="link" data-filepath="MyNote" class="internal-link">Alias</a>')
  })
  it('passes unresolved wiki links through unchanged', () => {
    const md = createRenderer()
    assert.equal(md.renderInline('[[Unknown]]'), '[[Unknown]]')
  })
  for (const [source, escaped] of [
    [
      '[[<img src=x onerror="globalThis.__checklistProbe=1">]]',
      '[[&lt;img src=x onerror=&quot;globalThis.__checklistProbe=1&quot;&gt;]]',
    ],
    [
      '[[Missing|<svg onload="globalThis.__checklistProbe=1">]]',
      '[[Missing|&lt;svg onload=&quot;globalThis.__checklistProbe=1&quot;&gt;]]',
    ],
  ]) {
    it(`escapes HTML in unresolved wiki links: ${source}`, () => {
      const md = createRenderer()
      assert.equal(md.renderInline(source), escaped)
    })
  }
  it('escapes normalized wiki-link attributes and labels', () => {
    const target = 'A"&B'
    const md = new MD().use(linkPlugin(new Map([
      [target, {filePath: 'Folder/"<&>.md', linkName: 'unused'}],
    ])))
    assert.equal(md.renderInline(`[[ ${target} | <Alias> ]]`), '<a href="#" data-href="A&quot;&amp;B" data-type="link" data-filepath="Folder/&quot;&lt;&amp;&gt;.md" class="internal-link">&lt;Alias&gt;</a>')
  })
  it('renders mixed todo text through the full production plugin pipeline', () => {
    const md = createRenderer()
    assert.equal(md.render('#work ==text== [[MyNote]]'), '<p><a href="#work" data-type="tag" class="tag" target="_blank" rel="noopener">#work</a> <mark>text</mark> <a href="#" data-href="MyNote" data-type="link" data-filepath="MyNote" class="internal-link">My Note</a></p>\n')
  })
})
