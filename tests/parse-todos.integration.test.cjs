const assert = require('node:assert/strict')
const {load} = require('./helpers/runtime.cjs')
const {describe, it} = require('node:test')
const {parseTodos} = load('src/utils/tasks.ts')
const makeFile = (path, mtime = 100, ctime = 10) => ({
  path,
  name: path.split('/').pop() ?? path,
  stat: {mtime, ctime},
})
const tagAt = (tag, line) => ({
  tag,
  position: {start: {line}},
})
const makeCache = (entries) => ({
  getFileCache: (file) => entries[file.path] ?? {},
})
const makeVault = (contents) => ({
  cachedRead: async (file) => contents[file.path] ?? '',
})
const todoTexts = (todos) => todos.map(todo => todo.originalText)
describe('parseTodos integration', () => {
  it('excludes files older than lastRerender and processes files updated at or after it', async () => {
    const oldFile = makeFile('old.md', 99)
    const currentFile = makeFile('current.md', 100)
    const cache = makeCache({})
    const vault = makeVault({
      'old.md': '- [ ] old task',
      'current.md': '- [ ] current task',
    })
    const result = await parseTodos([oldFile, currentFile], ['*'], cache, vault, '', true, false, 100)
    assert.equal(result.has(oldFile), false)
    assert.equal(result.get(currentFile).length, 1)
    assert.deepEqual(todoTexts(result.get(currentFile) ?? []), ['current task'])
  })
  it('honors includeFiles minimatch patterns and defaults empty includeFiles to all files', async () => {
    const rootFile = makeFile('root.md')
    const subdirFile = makeFile('subdir/note.md')
    const cache = makeCache({})
    const vault = makeVault({
      'root.md': '- [ ] root task',
      'subdir/note.md': '- [ ] subdir task',
    })
    const subdirOnly = await parseTodos([rootFile, subdirFile], ['*'], cache, vault, 'subdir/**', true, false, 0)
    const defaultInclude = await parseTodos([rootFile, subdirFile], ['*'], cache, vault, '', true, false, 0)
    assert.deepEqual([...subdirOnly.keys()], [rootFile, subdirFile])
    assert.deepEqual(subdirOnly.get(rootFile), [])
    assert.deepEqual(todoTexts(subdirOnly.get(subdirFile) ?? []), ['subdir task'])
    assert.deepEqual([...defaultInclude.keys()], [rootFile, subdirFile])
  })
  it('filters non-wildcard todoTags using cache tags and frontmatter tags', async () => {
    const blockTagged = makeFile('block-tagged.md')
    const frontmatterTagged = makeFile('frontmatter-tagged.md')
    const untagged = makeFile('untagged.md')
    const cache = makeCache({
      'block-tagged.md': {tags: [tagAt('#work', 0)]},
      'frontmatter-tagged.md': {frontmatter: {tags: ['work']}},
      'untagged.md': {tags: [tagAt('#home', 0)]},
    })
    const vault = makeVault({
      'block-tagged.md': '#work\n- [ ] work task\n\n- [ ] outside block',
      'frontmatter-tagged.md': '---\ntags: [work]\n---\n- [ ] frontmatter task',
      'untagged.md': '#home\n- [ ] home task',
    })
    const result = await parseTodos([blockTagged, frontmatterTagged, untagged], ['work'], cache, vault, '', true, false, 0)
    assert.deepEqual([...result.keys()], [blockTagged, frontmatterTagged, untagged])
    assert.deepEqual(result.get(untagged), [])
    assert.deepEqual(todoTexts(result.get(blockTagged) ?? []), ['work task'])
  })
  it('processes every included updated file and parses the entire file when todoTags is wildcard', async () => {
    const tagged = makeFile('tagged.md')
    const untagged = makeFile('untagged.md')
    const cache = makeCache({
      'tagged.md': {tags: [tagAt('#work', 0)]},
      'untagged.md': {},
    })
    const vault = makeVault({
      'tagged.md': '#work\n- [ ] task one\n- [x] task two\n\n- [ ] after blank',
      'untagged.md': '- [ ] untagged task',
    })
    const result = await parseTodos([tagged, untagged], ['*'], cache, vault, '', true, false, 0)
    assert.deepEqual([...result.keys()], [tagged, untagged])
    assert.deepEqual(todoTexts(result.get(tagged) ?? []), [
      'task one',
      'task two',
      'after blank',
    ])
    assert.deepEqual(todoTexts(result.get(untagged) ?? []), ['untagged task'])
  })
  it('parses the entire file when the matching tag is in frontmatter', async () => {
    const file = makeFile('frontmatter.md')
    const cache = makeCache({
      'frontmatter.md': {frontmatter: {tag: 'work'}},
    })
    const vault = makeVault({
      'frontmatter.md': '---\ntag: work\n---\n- [ ] first task\n\n- [ ] after blank',
    })
    const result = await parseTodos([file], ['work'], cache, vault, '', true, false, 0)
    const todos = result.get(file) ?? []
    assert.deepEqual(todoTexts(todos), ['first task', 'after blank'])
    assert.deepEqual(todos.map(todo => todo.mainTag), ['work', 'work'])
  })
  it('filters checked todos when showChecked is false and keeps them when true', async () => {
    const file = makeFile('checked.md')
    const cache = makeCache({})
    const vault = makeVault({
      'checked.md': '- [ ] open task\n- [x] done task',
    })
    const withoutChecked = await parseTodos([file], ['*'], cache, vault, '', false, false, 0)
    const withChecked = await parseTodos([file], ['*'], cache, vault, '', true, false, 0)
    assert.deepEqual(todoTexts(withoutChecked.get(file) ?? []), ['open task'])
    assert.deepEqual(todoTexts(withChecked.get(file) ?? []), [
      'open task',
      'done task',
    ])
  })
  it('parses the entire file when showAllTodos is true', async () => {
    const file = makeFile('show-all.md')
    const cache = makeCache({
      'show-all.md': {tags: [tagAt('#work', 0)]},
    })
    const vault = makeVault({
      'show-all.md': '#work\n- [ ] in tag block\n\n- [ ] outside tag block',
    })
    const result = await parseTodos([file], ['work'], cache, vault, '', true, true, 0)
    assert.deepEqual(todoTexts(result.get(file) ?? []), [
      'in tag block',
      'outside tag block',
    ])
  })
  it('includes processed files that have no todos with an empty array', async () => {
    const file = makeFile('empty.md')
    const cache = makeCache({})
    const vault = makeVault({
      'empty.md': '# Just a note\nNo checklist items here.',
    })
    const result = await parseTodos([file], ['*'], cache, vault, '', true, false, 0)
    assert.equal(result.has(file), true)
    assert.deepEqual(result.get(file), [])
  })
})
