import {TFile} from 'obsidian'
import type {CachedMetadata, MetadataCache, Vault} from 'obsidian'
import {describe, expect, it} from 'vitest'

import {parseTodos} from '../src/utils/tasks'

const position = (line: number) => ({
  start: {line, col: 0, offset: 0},
  end: {line, col: 0, offset: 0},
})

const tagAtLine = (line: number, tag: string) => ({
  tag,
  position: position(line),
})

const assemble = async (
  content: string,
  metadata: CachedMetadata = {},
  tags: string[] = ['*'],
  hideHtmlComments = false,
) => {
  const file = new TFile()
  file.path = 'Folder/Test Note.md'
  file.name = 'Test Note.md'
  file.stat = {ctime: 1234, mtime: 5678, size: content.length}
  const cache = {getFileCache: () => metadata} as MetadataCache
  const vault = {cachedRead: async () => content} as Vault
  const result = await parseTodos(
    [file], tags, cache, vault, '', true, false, 0, [], undefined,
    false, hideHtmlComments,
  )
  return result.get(file) ?? []
}

describe('task assembly', () => {
  it('assembles metadata and strips the active tag from rendered HTML', async () => {
    const source = '- [ ] do #work thing'
    const [todo] = await assemble(
      `\n\n\n${source}`,
      {tags: [tagAtLine(3, '#work')]},
      ['work'],
    )

    expect(todo).toMatchObject({
      checked: false,
      filePath: 'Folder/Test Note.md',
      fileName: 'Test Note.md',
      fileLabel: 'Test Note',
      fileCreatedTs: 1234,
      fileModifiedTs: 5678,
      mainTag: 'work',
      subTag: undefined,
      line: 3,
      sourceLine: source,
      originalText: 'do #work thing',
      displayText: 'do #work thing',
      rawHTML: '<p>do thing</p>\n',
    })
  })

  it.each([
    ['keep <!-- secret --> this', 'keep this', '<p>keep this</p>\n'],
    ['<!-- leading --> text <!-- trailing -->', 'text', '<p>text</p>\n'],
    ['a<!-- joined -->b', 'ab', '<p>ab</p>\n'],
    ['one <!-- a --> two <!-- b --> three', 'one two three', '<p>one two three</p>\n'],
    ['<!-- only -->', '', ''],
  ])('hides literal comments in %s without changing source text', async (text, display, html) => {
    const source = `- [ ] ${text}`
    const [todo] = await assemble(source, {}, ['*'], true)

    expect(todo.rawHTML).toBe(html)
    expect(todo.displayText).toBe(display)
    expect(todo.originalText).toBe(text)
    expect(todo.sourceLine).toBe(source)
  })

  it('renders HTML comments as text by default', async () => {
    const [todo] = await assemble('- [ ] keep <!-- secret --> this')

    expect(todo.rawHTML).toBe('<p>keep &lt;!-- secret --&gt; this</p>\n')
    expect(todo.displayText).toBe('keep <!-- secret --> this')
    expect(todo.originalText).toBe('keep <!-- secret --> this')
  })

  it.each([false, true])('renders Obsidian comments correctly with hiding=%s', async hiding => {
    const [todo] = await assemble('- [ ] before %%note%% after', {}, ['*'], hiding)
    expect(todo.rawHTML).toBe('<p>before <!--note--> after</p>\n')
  })

  it('renders resolved wiki links as native keyboard-accessible anchors', async () => {
    const [todo] = await assemble('- [x] Review [[Project Note]]', {
      links: [{link: 'Project Note', displayText: 'Project Note', position: position(0)}],
    })

    expect(todo.checked).toBe(true)
    expect(todo.rawHTML).toContain(
      '<a href="#" data-href="Project Note" data-type="link" data-filepath="Project Note" class="internal-link">Project Note</a>',
    )
    expect(todo.rawHTML).toContain('Review ')
  })

  it('returns valid todos from the entire file in line order', async () => {
    const todos = await assemble(
      ['- [ ] a', '', 'plain text', '# heading', '- [x] b', '  - [ ] child'].join('\n'),
    )

    expect(todos.map(todo => todo.originalText)).toEqual(['a', 'b', 'child'])
    expect(todos.map(todo => todo.line)).toEqual([0, 4, 5])
    expect(todos.map(todo => todo.checked)).toEqual([false, true, false])
  })

  it('returns no todos for empty content', async () => {
    expect(await assemble('')).toEqual([])
  })

  it('selects only the tagged inline task in flat mode', async () => {
    const todos = await assemble(
      '# heading\n- [ ] do #work now\n- [ ] later',
      {tags: [tagAtLine(1, '#work')]},
      ['work'],
    )
    expect(todos).toHaveLength(1)
    expect(todos[0]).toMatchObject({
      mainTag: 'work', line: 1, originalText: 'do #work now',
      rawHTML: '<p>do now</p>\n',
    })
  })

  it('collects a tagged block until its first later blank line', async () => {
    const todos = await assemble(
      '#work\n\n- [ ] first\n- [x] second\n\n- [ ] after blank',
      {tags: [tagAtLine(0, '#work')]},
      ['work'],
    )
    expect(todos.map(todo => todo.originalText)).toEqual(['first', 'second'])
    expect(todos.map(todo => todo.line)).toEqual([2, 3])
    expect(todos.map(todo => todo.checked)).toEqual([false, true])
  })
})
