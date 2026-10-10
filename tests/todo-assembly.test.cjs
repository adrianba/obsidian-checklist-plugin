const assert = require('node:assert/strict')
const {TFile, load} = require('./helpers/runtime.cjs')
const {assertFields} = require('./helpers/assert-fields.cjs')
const {describe, it} = require('node:test')
const {parseTodos} = load('src/utils/tasks.ts')
const position = (line) => ({
  start: {line, col: 0, offset: 0},
  end: {line, col: 0, offset: 0},
})
const tagAtLine = (line, tag) => ({
  tag,
  position: position(line),
})
const assemble = async (content, metadata = {}, tags = ['*'], hideHtmlComments = false) => {
  const file = new TFile()
  file.path = 'Folder/Test Note.md'
  file.name = 'Test Note.md'
  file.stat = {ctime: 1234, mtime: 5678, size: content.length}
  const cache = {getFileCache: () => metadata}
  const vault = {cachedRead: async () => content}
  const result = await parseTodos(
    [file], tags, cache, vault, '', true, false, 0, [], undefined,
    false, hideHtmlComments,
  )
  return result.get(file) ?? []
}
describe('task assembly', () => {
  it('assembles metadata and strips the active tag from rendered HTML', async () => {
    const source = '- [ ] do #work thing'
    const [todo] = await assemble(`\n\n\n${source}`, {tags: [tagAtLine(3, '#work')]}, ['work'])
    assertFields(todo, {
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
  for (const [text, display, html] of [
    ['keep <!-- secret --> this', 'keep this', '<p>keep this</p>\n'],
    ['<!-- leading --> text <!-- trailing -->', 'text', '<p>text</p>\n'],
    ['a<!-- joined -->b', 'ab', '<p>ab</p>\n'],
    ['one <!-- a --> two <!-- b --> three', 'one two three', '<p>one two three</p>\n'],
    ['<!-- only -->', '', ''],
  ]) {
    it(`hides literal comments in ${text} without changing source text`, async () => {
      const source = `- [ ] ${text}`
      const todos = await assemble(source, {}, ['*'], true)
      assert.equal(todos.length, 1)
      const [todo] = todos
      assert.equal(todo.rawHTML, html)
      assert.equal(todo.displayText, display)
      assert.equal(todo.originalText, text)
      assert.equal(todo.sourceLine, source)
    })
  }
  it('renders HTML comments as text by default', async () => {
    const [todo] = await assemble('- [ ] keep <!-- secret --> this')
    assert.equal(todo.rawHTML, '<p>keep &lt;!-- secret --&gt; this</p>\n')
    assert.equal(todo.displayText, 'keep <!-- secret --> this')
    assert.equal(todo.originalText, 'keep <!-- secret --> this')
  })
  for (const hiding of [false, true]) {
    it(`renders Obsidian comments correctly with hiding=${hiding}`, async () => {
      const [todo] = await assemble('- [ ] before %%note%% after', {}, ['*'], hiding)
      assert.equal(todo.rawHTML, '<p>before <!--note--> after</p>\n')
    })
  }
  for (const hiding of [false, true]) {
    it(`escapes unresolved links created by tag removal with hiding=${hiding}`, async () => {
      const payload = '<img src=x onerror="globalThis.__checklistProbe=1">'
      const text = `[[Report #todo heading|${payload}]] #todo`
      const source = `- [ ] ${text}`
      const [todo] = await assemble(source, {
        tags: [tagAtLine(0, '#todo')],
        links: [{
          link: 'Report #todo heading',
          displayText: payload,
          position: position(0),
        }],
      }, ['todo'], hiding)
      assert.equal(todo.rawHTML, '<p>[[Report heading|&lt;img src=x onerror=&quot;globalThis.__checklistProbe=1&quot;&gt;]]</p>\n')
      assert.doesNotMatch(todo.rawHTML, /<img\b/i)
      assert.equal(todo.originalText, text)
      assert.equal(todo.sourceLine, source)
    })
  }
  it('escapes wiki links created by HTML-comment hiding without link metadata', async () => {
    const text = '[<!--split-->[Missing|<img src=x onerror="globalThis.__checklistProbe=1">]] #todo'
    const source = `- [ ] ${text}`
    const [todo] = await assemble(source, {
      tags: [tagAtLine(0, '#todo')],
    }, ['todo'], true)
    assert.equal(todo.rawHTML, '<p>[[Missing|&lt;img src=x onerror=&quot;globalThis.__checklistProbe=1&quot;&gt;]]</p>\n')
    assert.doesNotMatch(todo.rawHTML, /<img\b/i)
    assert.equal(todo.displayText, text.replace('<!--split-->', ''))
    assert.equal(todo.originalText, text)
    assert.equal(todo.sourceLine, source)
  })
  it('returns valid todos from the entire file in line order', async () => {
    const todos = await assemble(['- [ ] a', '', 'plain text', '# heading', '- [x] b', '  - [ ] child'].join('\n'))
    assert.deepEqual(todos.map(todo => todo.originalText), ['a', 'b', 'child'])
    assert.deepEqual(todos.map(todo => todo.line), [0, 4, 5])
    assert.deepEqual(todos.map(todo => todo.checked), [false, true, false])
  })
  it('returns no todos for empty content', async () => {
    assert.deepEqual(await assemble(''), [])
  })
  it('selects only the tagged inline task in flat mode', async () => {
    const todos = await assemble('# heading\n- [ ] do #work now\n- [ ] later', {tags: [tagAtLine(1, '#work')]}, ['work'])
    assert.equal(todos.length, 1)
    assertFields(todos[0], {
      mainTag: 'work', line: 1, originalText: 'do #work now',
      rawHTML: '<p>do now</p>\n',
    })
  })
  it('collects a tagged block until its first later blank line', async () => {
    const todos = await assemble('#work\n\n- [ ] first\n- [x] second\n\n- [ ] after blank', {tags: [tagAtLine(0, '#work')]}, ['work'])
    assert.deepEqual(todos.map(todo => todo.originalText), ['first', 'second'])
    assert.deepEqual(todos.map(todo => todo.line), [2, 3])
    assert.deepEqual(todos.map(todo => todo.checked), [false, true])
  })
})
