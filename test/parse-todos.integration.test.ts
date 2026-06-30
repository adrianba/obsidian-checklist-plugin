import {describe, expect, it} from 'vitest'

import {parseTodos} from '../src/utils/tasks'

const makeFile = (path: string, mtime = 100, ctime = 10) => ({
  path,
  name: path.split('/').pop() ?? path,
  stat: {mtime, ctime},
}) as any

const tagAt = (tag: string, line: number) => ({
  tag,
  position: {start: {line}},
})

const makeCache = (entries: Record<string, any>) => ({
  getFileCache: (file: {path: string}) => entries[file.path] ?? {},
}) as any

const makeVault = (contents: Record<string, string>) => ({
  cachedRead: async (file: {path: string}) => contents[file.path] ?? '',
}) as any

const todoTexts = (todos: any[]) => todos.map(todo => todo.originalText)

describe('parseTodos integration', () => {
  it('excludes files older than lastRerender and processes files updated at or after it', async () => {
    const oldFile = makeFile('old.md', 99)
    const currentFile = makeFile('current.md', 100)
    const cache = makeCache({})
    const vault = makeVault({
      'old.md': '- [ ] old task',
      'current.md': '- [ ] current task',
    })

    const result = await parseTodos(
      [oldFile, currentFile],
      ['*'],
      cache,
      vault,
      '',
      true,
      false,
      100,
    )

    expect(result.has(oldFile)).toBe(false)
    expect(result.get(currentFile)).toHaveLength(1)
    expect(todoTexts(result.get(currentFile) ?? [])).toEqual(['current task'])
  })

  it('honors includeFiles minimatch patterns and defaults empty includeFiles to all files', async () => {
    const rootFile = makeFile('root.md')
    const subdirFile = makeFile('subdir/note.md')
    const cache = makeCache({})
    const vault = makeVault({
      'root.md': '- [ ] root task',
      'subdir/note.md': '- [ ] subdir task',
    })

    const subdirOnly = await parseTodos(
      [rootFile, subdirFile],
      ['*'],
      cache,
      vault,
      'subdir/**',
      true,
      false,
      0,
    )
    const defaultInclude = await parseTodos(
      [rootFile, subdirFile],
      ['*'],
      cache,
      vault,
      '',
      true,
      false,
      0,
    )

    expect([...subdirOnly.keys()]).toEqual([subdirFile])
    expect([...defaultInclude.keys()]).toEqual([rootFile, subdirFile])
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

    const result = await parseTodos(
      [blockTagged, frontmatterTagged, untagged],
      ['work'],
      cache,
      vault,
      '',
      true,
      false,
      0,
    )

    expect([...result.keys()]).toEqual([blockTagged, frontmatterTagged])
    expect(todoTexts(result.get(blockTagged) ?? [])).toEqual(['work task'])
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

    const result = await parseTodos(
      [tagged, untagged],
      ['*'],
      cache,
      vault,
      '',
      true,
      false,
      0,
    )

    expect([...result.keys()]).toEqual([tagged, untagged])
    expect(todoTexts(result.get(tagged) ?? [])).toEqual([
      'task one',
      'task two',
      'after blank',
    ])
    expect(todoTexts(result.get(untagged) ?? [])).toEqual(['untagged task'])
  })

  it('parses the entire file when the matching tag is in frontmatter', async () => {
    const file = makeFile('frontmatter.md')
    const cache = makeCache({
      'frontmatter.md': {frontmatter: {tag: 'work'}},
    })
    const vault = makeVault({
      'frontmatter.md': '---\ntag: work\n---\n- [ ] first task\n\n- [ ] after blank',
    })

    const result = await parseTodos(
      [file],
      ['work'],
      cache,
      vault,
      '',
      true,
      false,
      0,
    )

    const todos = result.get(file) ?? []
    expect(todoTexts(todos)).toEqual(['first task', 'after blank'])
    expect(todos.map(todo => todo.mainTag)).toEqual(['work', 'work'])
  })

  it('filters checked todos when showChecked is false and keeps them when true', async () => {
    const file = makeFile('checked.md')
    const cache = makeCache({})
    const vault = makeVault({
      'checked.md': '- [ ] open task\n- [x] done task',
    })

    const withoutChecked = await parseTodos(
      [file],
      ['*'],
      cache,
      vault,
      '',
      false,
      false,
      0,
    )
    const withChecked = await parseTodos(
      [file],
      ['*'],
      cache,
      vault,
      '',
      true,
      false,
      0,
    )

    expect(todoTexts(withoutChecked.get(file) ?? [])).toEqual(['open task'])
    expect(todoTexts(withChecked.get(file) ?? [])).toEqual([
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

    const result = await parseTodos(
      [file],
      ['work'],
      cache,
      vault,
      '',
      true,
      true,
      0,
    )

    expect(todoTexts(result.get(file) ?? [])).toEqual([
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

    const result = await parseTodos(
      [file],
      ['*'],
      cache,
      vault,
      '',
      true,
      false,
      0,
    )

    expect(result.has(file)).toBe(true)
    expect(result.get(file)).toEqual([])
  })
})
