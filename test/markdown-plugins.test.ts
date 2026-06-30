import {describe, expect, it} from 'vitest'
import MD from 'markdown-it'

import {commentPlugin} from '../src/plugins/comment'
import {highlightPlugin} from '../src/plugins/highlight'
import {linkPlugin} from '../src/plugins/link'
import {tagPlugin} from '../src/plugins/tag'

const linkMap = new Map([['MyNote', {filePath: 'MyNote', linkName: 'My Note'}]])

const createRenderer = () =>
  new MD().use(commentPlugin).use(linkPlugin(linkMap)).use(tagPlugin).use(highlightPlugin)

describe('markdown render plugins', () => {
  it('renders tags as Obsidian tag anchors', () => {
    const md = createRenderer()

    expect(md.renderInline('#work')).toBe(
      '<a href="#work" data-type="link" class="tag" target="_blank" rel="noopener">#work</a>',
    )
  })

  it('escapes special characters in tag anchors', () => {
    const md = createRenderer()

    expect(md.renderInline('#a&b"\'<x>')).toBe(
      '<a href="#a&amp;b&quot;&#39;&lt;x&gt;" data-type="link" class="tag" target="_blank" rel="noopener">#a&amp;b&quot;&#39;&lt;x&gt;</a>',
    )
  })

  it('renders highlight markup as mark elements', () => {
    const md = createRenderer()

    expect(md.renderInline('==text==')).toBe('<mark>text</mark>')
  })

  it('renders comments with the current stray brace quirk', () => {
    const md = createRenderer()

    // Known quirk: commentPlugin currently emits an extra `}` before `-->`.
    expect(md.renderInline('%%note%%')).toBe('<!--note}-->')
  })

  it('renders resolved wiki links with link metadata', () => {
    const md = createRenderer()

    expect(md.renderInline('[[MyNote]]')).toBe(
      '<a data-href="MyNote" data-type="link" data-filepath="MyNote" class="internal-link">My Note</a>',
    )
  })

  it('renders resolved wiki links with labels', () => {
    const md = createRenderer()

    expect(md.renderInline('[[MyNote|Alias]]')).toBe(
      '<a data-href="MyNote" data-type="link" data-filepath="MyNote" class="internal-link">Alias</a>',
    )
  })

  it('trims spaces around wiki link pipes before resolving', () => {
    const md = createRenderer()

    expect(md.renderInline('[[ MyNote | Alias ]]')).toBe(
      '<a data-href="MyNote" data-type="link" data-filepath="MyNote" class="internal-link">Alias</a>',
    )
  })

  it('passes unresolved wiki links through unchanged', () => {
    const md = createRenderer()

    expect(md.renderInline('[[Unknown]]')).toBe('[[Unknown]]')
  })

  it('renders mixed todo text through the full production plugin pipeline', () => {
    const md = createRenderer()

    expect(md.render('#work ==text== [[MyNote]]')).toBe(
      '<p><a href="#work" data-type="link" class="tag" target="_blank" rel="noopener">#work</a> <mark>text</mark> <a data-href="MyNote" data-type="link" data-filepath="MyNote" class="internal-link">My Note</a></p>\n',
    )
  })
})
