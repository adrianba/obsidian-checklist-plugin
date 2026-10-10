const assert = require('node:assert/strict')
const {load} = require('./helpers/runtime.cjs')
const {describe, it} = require('node:test')
const {
  classifyString,
  combineFileLines,
  ensureMdExtension,
  extractTextFromTodoLine,
  getAllLinesFromFile,
  getFileLabelFromName,
  getTagMeta,
  lineIsValidTodo,
  mapLinkMeta,
  matchesTodoTag,
  removeTagFromText,
  retrieveTag,
  setLineTo,
  stripHtmlComments,
  todoLineIsChecked,
} = load('src/utils/parsing.ts')
describe('parsing helpers', () => {
  describe('lineIsValidTodo', () => {
    it('accepts supported bullets, states, indentation, and blockquotes', () => {
      assert.equal(lineIsValidTodo('- [ ] task'), true)
      assert.equal(lineIsValidTodo('* [x] task'), true)
      assert.equal(lineIsValidTodo('+ [ ] task'), true)
      assert.equal(lineIsValidTodo('1. [/] task'), true)
      assert.equal(lineIsValidTodo('  - [ ] nested'), true)
      assert.equal(lineIsValidTodo('> - [ ] quoted'), true)
    })
    it('requires one to four spaces and non-space text after the checkbox', () => {
      assert.equal(lineIsValidTodo('- [ ] task'), true)
      assert.equal(lineIsValidTodo('- [ ]    task'), true)
      assert.equal(lineIsValidTodo('- [ ]     task'), false)
      assert.equal(lineIsValidTodo('- [ ]x'), false)
      assert.equal(lineIsValidTodo('- [ ]   '), false)
    })
    it('rejects non-todo lines and empty checkbox content', () => {
      assert.equal(lineIsValidTodo('plain text'), false)
      assert.equal(lineIsValidTodo('# x'), false)
      assert.equal(lineIsValidTodo('- [] task'), false)
    })
  })
  describe('extractTextFromTodoLine', () => {
    it('extracts todo text without the bullet and checkbox', () => {
      assert.equal(extractTextFromTodoLine('- [ ] hello world'), 'hello world')
      assert.equal(extractTextFromTodoLine(' - [ ] one leading space'), 'one leading space')
      assert.equal(extractTextFromTodoLine('    - [x] four leading spaces'), 'four leading spaces')
    })
    it('returns undefined for non-todo lines', () => {
      assert.equal(extractTextFromTodoLine('hello world'), undefined)
    })
  })
  describe('stripHtmlComments', () => {
    it('removes a comment between words and keeps a single space', () => {
      assert.equal(stripHtmlComments('a <!-- c --> b'), 'a b')
    })
    it('trims a leading or trailing comment', () => {
      assert.equal(stripHtmlComments('<!-- c --> text'), 'text')
      assert.equal(stripHtmlComments('text <!-- c -->'), 'text')
    })
    it('joins when the comment has no surrounding whitespace', () => {
      assert.equal(stripHtmlComments('a<!-- c -->b'), 'ab')
    })
    it('removes multiple comments in one line', () => {
      assert.equal(stripHtmlComments('one <!-- a --> two <!-- b --> three'), 'one two three')
    })
    it('reduces a comment-only string to an empty string', () => {
      assert.equal(stripHtmlComments('<!-- only -->'), '')
    })
    it('leaves text without comments unchanged', () => {
      assert.equal(stripHtmlComments('plain task text'), 'plain task text')
    })
  })
  describe('todoLineIsChecked', () => {
    it('treats any non-space checkbox character as checked', () => {
      assert.equal(todoLineIsChecked('- [x] done'), true)
      // Current behavior: slash is checked because the regex accepts any non-space character.
      assert.equal(todoLineIsChecked('- [/] in progress'), true)
      assert.equal(todoLineIsChecked('- [ ] open'), false)
    })
  })
  describe('setLineTo', () => {
    it('checks an unchecked todo while preserving the rest of the line', () => {
      assert.equal(setLineTo('  - [ ] keep this text', true), '  - [x] keep this text')
    })
    it('unchecks a checked todo while preserving bullet type and text', () => {
      assert.equal(setLineTo('* [x] keep this text', false), '* [ ] keep this text')
      assert.equal(setLineTo('1. [x] keep this text', false), '1. [ ] keep this text')
      assert.equal(setLineTo('+ [ ] keep this text', true), '+ [x] keep this text')
    })
    it('preserves blockquote prefixes and toggles other checkbox states', () => {
      assert.equal(setLineTo('> - [/] quoted task', true), '> - [x] quoted task')
      assert.equal(setLineTo('> - [/] quoted task', false), '> - [ ] quoted task')
    })
  })
  describe('removeTagFromText', () => {
    it('handles empty text and empty tags', () => {
      assert.equal(removeTagFromText('', 'work'), '')
      assert.equal(removeTagFromText('  keep me  ', ''), 'keep me')
    })
    it('removes matching tags, subtags, and trims surrounding text', () => {
      assert.equal(removeTagFromText('before #work after', 'work'), 'before after')
      assert.equal(removeTagFromText('before #work/sub after', 'work'), 'before after')
      assert.equal(removeTagFromText('#work before #work/sub after ', 'work'), 'before after')
    })
    it('escapes tag patterns and preserves sibling prefixes', () => {
      assert.equal(removeTagFromText('keep #workshop #WORK/sub text', 'work'), 'keep #workshop text')
      assert.equal(removeTagFromText('keep #a+b #aaab text', 'a+b'), 'keep #aaab text')
    })
  })
  describe('tag metadata helpers', () => {
    it('parses tag metadata with current optional subtag behavior', () => {
      assert.deepEqual(getTagMeta('#main'), {main: 'main', sub: undefined})
      assert.deepEqual(getTagMeta('#main/sub'), {main: 'main', sub: 'sub'})
      assert.deepEqual(getTagMeta('foo'), {main: null, sub: null})
    })
    it('retrieves the main tag, subtag, or empty string', () => {
      assert.equal(retrieveTag({main: 'main', sub: 'sub'}), 'main')
      assert.equal(retrieveTag({main: null, sub: 'sub'}), 'sub')
      assert.equal(retrieveTag({main: null, sub: null}), '')
    })
    it('matches configured tags and descendants without sibling prefixes', () => {
      assert.equal(matchesTodoTag('#Work/Next/Today', [' #work/next ']), true)
      assert.equal(matchesTodoTag('#work/next-week', ['work/next']), false)
      assert.equal(matchesTodoTag('#work', ['']), false)
    })
  })
  describe('classifyString', () => {
    it('pins current sanitizing behavior', () => {
      assert.equal(classifyString('My File Name'), 'myFileName')
      assert.equal(classifyString('Foo.Bar'), 'fooBar')
    })
  })
  describe('mapLinkMeta', () => {
    it('maps link metadata by file path', () => {
      const note = {filePath: 'Folder/Note.md', displayText: 'Note'}
      const other = {filePath: 'Other.md', displayText: 'Other'}
      const map = mapLinkMeta([note, other])
      assert.equal(map.get('Folder/Note.md'), note)
      assert.equal(map.get('Other.md'), other)
    })
  })
  describe('file name helpers', () => {
    it('gets a file label only from markdown names', () => {
      assert.equal(getFileLabelFromName('Note.md'), 'Note')
      assert.equal(getFileLabelFromName('Note'), undefined)
    })
    it('ensures markdown extensions', () => {
      assert.equal(ensureMdExtension('a'), 'a.md')
      assert.equal(ensureMdExtension('a.md'), 'a.md')
    })
  })
  describe('file line helpers', () => {
    it('splits LF and CRLF file content into lines', () => {
      assert.deepEqual(getAllLinesFromFile('a\nb\nc'), ['a', 'b', 'c'])
      assert.deepEqual(getAllLinesFromFile('a\r\nb\r\nc'), ['a', 'b', 'c'])
    })
    it('combines lines with LF separators', () => {
      assert.equal(combineFileLines(['a', 'b', 'c']), 'a\nb\nc')
    })
  })
})
