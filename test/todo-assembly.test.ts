import {describe, expect, it} from 'vitest'

import type {FileInfo} from '../src/_types'
import {getTagMeta} from '../src/utils/parsing'
import {
  findAllTodosFromTagBlock,
  findAllTodosInFile,
  formTodo,
} from '../src/utils/tasks'

const makeFileInfo = (overrides: Partial<FileInfo> = {}): FileInfo =>
  ({
    content: '',
    cache: undefined,
    parseEntireFile: true,
    frontmatterTag: undefined,
    file: {
      path: 'Folder/Test Note.md',
      name: 'Test Note.md',
      stat: {ctime: 1234, mtime: 5678},
    },
    validTags: [],
    ...overrides,
  }) as FileInfo

const linkAtLine = (line: number, link: string, displayText = link) =>
  ({
    link,
    displayText,
    position: {start: {line}},
  }) as any

const tagAtLine = (line: number, tag: string) =>
  ({
    tag,
    position: {start: {line}},
  }) as any

describe('formTodo', () => {
  it('assembles todo metadata and strips the active tag from rendered HTML', () => {
    const file = makeFileInfo()
    const todo = formTodo('- [ ] do #work thing', file, [], 3, getTagMeta('#work'))

    expect(todo).toMatchObject({
      checked: false,
      filePath: 'Folder/Test Note.md',
      fileName: 'Test Note.md',
      fileLabel: 'Test Note',
      fileCreatedTs: 1234,
      mainTag: 'work',
      subTag: undefined,
      line: 3,
      spacesIndented: 0,
      originalText: 'do #work thing',
      fileInfo: file,
    })
    expect(todo.rawHTML).toBe('<p>do thing</p>\n')
  })

  it('renders resolved wiki links on the same line as internal-link anchors', () => {
    const file = makeFileInfo()
    const todo = formTodo(
      '- [x] Review [[Project Note]]',
      file,
      [linkAtLine(8, 'Project Note'), linkAtLine(1, 'Unrelated Note')],
      8,
    )

    expect(todo.checked).toBe(true)
    expect(todo.rawHTML).toContain(
      '<a data-href="Project Note" data-type="link" data-filepath="Project Note" class="internal-link">Project Note</a>',
    )
    expect(todo.rawHTML).toContain('Review ')
  })
})

describe('findAllTodosInFile', () => {
  it('returns only valid todos from the entire file in line order', () => {
    const todos = findAllTodosInFile(
      makeFileInfo({
        content: ['- [ ] a', '', 'plain text', '# heading', '- [x] b', '  - [ ] child'].join(
          '\n',
        ),
        parseEntireFile: true,
      }),
    )

    expect(todos).toHaveLength(3)
    expect(todos.map(todo => todo.originalText)).toEqual(['a', 'b', 'child'])
    expect(todos.map(todo => todo.line)).toEqual([0, 4, 5])
    expect(todos.map(todo => todo.checked)).toEqual([false, true, false])
  })

  it('returns no todos for empty content when parsing the entire file', () => {
    expect(
      findAllTodosInFile(makeFileInfo({content: '', parseEntireFile: true})),
    ).toEqual([])
  })
})

describe('findAllTodosFromTagBlock', () => {
  it('returns only the tagged todo when the tag is on a todo line', () => {
    const file = makeFileInfo({
      content: ['# heading', '- [ ] do #work now', '- [ ] later'].join('\n'),
    })
    const todos = findAllTodosFromTagBlock(file, tagAtLine(1, '#work'))

    expect(todos).toHaveLength(1)
    expect(todos[0]).toMatchObject({
      mainTag: 'work',
      subTag: undefined,
      line: 1,
      originalText: 'do #work now',
      rawHTML: '<p>do now</p>\n',
    })
  })

  it('collects the contiguous todo block below a tag heading and stops at the first later blank line', () => {
    const file = makeFileInfo({
      content: ['#work', '', '- [ ] first', '- [x] second', '', '- [ ] after blank'].join(
        '\n',
      ),
    })
    const todos = findAllTodosFromTagBlock(file, tagAtLine(0, '#work'))

    expect(todos).toHaveLength(2)
    expect(todos.map(todo => todo.originalText)).toEqual(['first', 'second'])
    expect(todos.map(todo => todo.line)).toEqual([2, 3])
    expect(todos.map(todo => todo.checked)).toEqual([false, true])
  })
})
