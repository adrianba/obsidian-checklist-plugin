import {describe, expect, it} from 'vitest'

import {
  classifyString,
  combineFileLines,
  ensureMdExtension,
  extractTextFromTodoLine,
  getAllLinesFromFile,
  getFileLabelFromName,
  getTagMeta,
  lineIsValidTodo,
  mapLinkMeta,
  removeTagFromText,
  retrieveTag,
  setLineTo,
  todoLineIsChecked,
} from '../src/utils/parsing'

describe('parsing helpers', () => {
  describe('lineIsValidTodo', () => {
    it('accepts supported bullets, states, indentation, and blockquotes', () => {
      expect(lineIsValidTodo('- [ ] task')).toBe(true)
      expect(lineIsValidTodo('* [x] task')).toBe(true)
      expect(lineIsValidTodo('1. [/] task')).toBe(true)
      expect(lineIsValidTodo('  - [ ] nested')).toBe(true)
      expect(lineIsValidTodo('> - [ ] quoted')).toBe(true)
    })

    it('requires one to four spaces and non-space text after the checkbox', () => {
      expect(lineIsValidTodo('- [ ] task')).toBe(true)
      expect(lineIsValidTodo('- [ ]    task')).toBe(true)
      expect(lineIsValidTodo('- [ ]     task')).toBe(false)
      expect(lineIsValidTodo('- [ ]x')).toBe(false)
      expect(lineIsValidTodo('- [ ]   ')).toBe(false)
    })

    it('rejects non-todo lines and empty checkbox content', () => {
      expect(lineIsValidTodo('plain text')).toBe(false)
      expect(lineIsValidTodo('# x')).toBe(false)
      expect(lineIsValidTodo('- [] task')).toBe(false)
    })
  })

  describe('extractTextFromTodoLine', () => {
    it('extracts todo text without the bullet and checkbox', () => {
      expect(extractTextFromTodoLine('- [ ] hello world')).toBe('hello world')
      expect(extractTextFromTodoLine(' - [ ] one leading space')).toBe('one leading space')
      expect(extractTextFromTodoLine('    - [x] four leading spaces')).toBe(
        'four leading spaces',
      )
    })

    it('returns undefined for non-todo lines', () => {
      expect(extractTextFromTodoLine('hello world')).toBeUndefined()
    })
  })

  describe('todoLineIsChecked', () => {
    it('treats any non-space checkbox character as checked', () => {
      expect(todoLineIsChecked('- [x] done')).toBe(true)
      // Current behavior: slash is checked because the regex accepts any non-space character.
      expect(todoLineIsChecked('- [/] in progress')).toBe(true)
      expect(todoLineIsChecked('- [ ] open')).toBe(false)
    })
  })

  describe('setLineTo', () => {
    it('checks an unchecked todo while preserving the rest of the line', () => {
      expect(setLineTo('  - [ ] keep this text', true)).toBe('  - [x] keep this text')
    })

    it('unchecks a checked todo while preserving bullet type and text', () => {
      expect(setLineTo('* [x] keep this text', false)).toBe('* [ ] keep this text')
      expect(setLineTo('1. [x] keep this text', false)).toBe('1. [ ] keep this text')
    })

    it('preserves blockquote prefixes and toggles other checkbox states', () => {
      expect(setLineTo('> - [/] quoted task', true)).toBe('> - [x] quoted task')
      expect(setLineTo('> - [/] quoted task', false)).toBe('> - [ ] quoted task')
    })
  })

  describe('removeTagFromText', () => {
    it('handles empty text and empty tags', () => {
      expect(removeTagFromText('', 'work')).toBe('')
      expect(removeTagFromText('  keep me  ', '')).toBe('keep me')
    })

    it('removes matching tags, subtags, and trims surrounding text', () => {
      expect(removeTagFromText('before #work after', 'work')).toBe('before after')
      expect(removeTagFromText('before #work/sub after', 'work')).toBe('before after')
      expect(removeTagFromText('#work before #work/sub after ', 'work')).toBe('before after')
    })
  })

  describe('tag metadata helpers', () => {
    it('parses tag metadata with current optional subtag behavior', () => {
      expect(getTagMeta('#main')).toEqual({main: 'main', sub: undefined})
      expect(getTagMeta('#main/sub')).toEqual({main: 'main', sub: 'sub'})
      expect(getTagMeta('foo')).toEqual({main: null, sub: null})
    })

    it('retrieves the main tag, subtag, or empty string', () => {
      expect(retrieveTag({main: 'main', sub: 'sub'})).toBe('main')
      expect(retrieveTag({main: null, sub: 'sub'})).toBe('sub')
      expect(retrieveTag({main: null, sub: null})).toBe('')
    })
  })

  describe('classifyString', () => {
    it('pins current sanitizing behavior', () => {
      expect(classifyString('My File Name')).toBe('myFileName')
      expect(classifyString('Foo.Bar')).toBe('fooBar')
    })
  })

  describe('mapLinkMeta', () => {
    it('maps link metadata by file path', () => {
      const note = {filePath: 'Folder/Note.md', displayText: 'Note'}
      const other = {filePath: 'Other.md', displayText: 'Other'}

      const map = mapLinkMeta([note, other] as any)

      expect(map.get('Folder/Note.md')).toBe(note)
      expect(map.get('Other.md')).toBe(other)
    })
  })

  describe('file name helpers', () => {
    it('gets a file label only from markdown names', () => {
      expect(getFileLabelFromName('Note.md')).toBe('Note')
      expect(getFileLabelFromName('Note')).toBeUndefined()
    })

    it('ensures markdown extensions', () => {
      expect(ensureMdExtension('a')).toBe('a.md')
      expect(ensureMdExtension('a.md')).toBe('a.md')
    })
  })

  describe('file line helpers', () => {
    it('splits LF and CRLF file content into lines', () => {
      expect(getAllLinesFromFile('a\nb\nc')).toEqual(['a', 'b', 'c'])
      expect(getAllLinesFromFile('a\r\nb\r\nc')).toEqual(['a', 'b', 'c'])
    })

    it('combines lines with LF separators', () => {
      expect(combineFileLines(['a', 'b', 'c'])).toBe('a\nb\nc')
    })
  })
})
