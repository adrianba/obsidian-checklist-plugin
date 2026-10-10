const assert = require('node:assert/strict')
const {load} = require('./helpers/runtime.cjs')
const {assertFields} = require('./helpers/assert-fields.cjs')
const {describe, it} = require('node:test')
const {groupTodos} = load('src/utils/groups.ts')
let nextLine = 0
const todo = (overrides) => ({
  checked: false,
  filePath: 'notes/default.md',
  fileName: 'default.md',
  fileLabel: 'Default',
  fileModifiedTs: 1,
  filterTags: ['work'],
  sourceLine: '- [ ] default todo',
  children: [],
  line: nextLine++,
  mainTag: 'work',
  subTag: undefined,
  fileCreatedTs: 1,
  originalText: 'default todo',
  displayText: 'default todo',
  rawHTML: '<p>default todo</p>\n',
  ...overrides,
})
const group = (items, groupBy, sortGroups = 'a->z', sortItems = 'a->z', subGroups = false, subGroupSort = 'a->z') => groupTodos(items, groupBy, sortGroups, sortItems, subGroups, subGroupSort)
describe('groupTodos', () => {
  it('groups todos by page with page metadata and merged todos', () => {
    const items = [
      todo({
        filePath: 'notes/alpha.md',
        fileLabel: 'Alpha Page',
        fileCreatedTs: 100,
        originalText: 'beta task',
      }),
      todo({
        filePath: 'notes/alpha.md',
        fileLabel: 'Alpha Page',
        fileCreatedTs: 200,
        originalText: 'alpha task',
      }),
      todo({
        filePath: 'notes/beta.md',
        fileLabel: 'Beta Page',
        fileCreatedTs: 50,
        originalText: 'gamma task',
      }),
    ]
    const groups = group(items, 'page')
    assert.equal(groups.length, 2)
    assert.deepEqual(groups.map(g => g.id), ['notes/alpha.md', 'notes/beta.md'])
    assertFields(groups[0], {
      type: 'page',
      pageName: 'Alpha Page',
      sortName: 'Alpha Page',
      className: 'alphaPage',
      oldestItem: 100,
      newestItem: 200,
    })
    assert.deepEqual(groups[0].todos.map(t => t.originalText), [
      'alpha task',
      'beta task',
    ])
    assertFields(groups[1], {
      type: 'page',
      pageName: 'Beta Page',
      sortName: 'Beta Page',
      className: 'betaPage',
      oldestItem: 50,
      newestItem: 50,
    })
  })
  it('groups todos by tag using #main/sub ids and tag metadata', () => {
    const items = [
      todo({mainTag: 'work', subTag: 'urgent', originalText: 'second'}),
      todo({mainTag: 'work', subTag: undefined, originalText: 'third'}),
      todo({mainTag: 'home', subTag: 'chores', originalText: 'first'}),
      todo({mainTag: 'work', subTag: 'urgent', originalText: 'first'}),
    ]
    const groups = group(items, 'tag')
    assert.deepEqual(groups.map(g => g.id), ['#home/chores', '#work', '#work/urgent'])
    assertFields(groups[0], {
      type: 'tag',
      mainTag: 'home',
      subTags: 'chores',
      sortName: '#home/chores',
      className: 'homechores',
    })
    assertFields(groups[1], {
      type: 'tag',
      mainTag: 'work',
      subTags: undefined,
      sortName: '#work',
      className: 'work',
    })
    assertFields(groups[2], {
      type: 'tag',
      mainTag: 'work',
      subTags: 'urgent',
      sortName: '#work/urgent',
      className: 'workurgent',
    })
    assert.deepEqual(groups[2].todos.map(t => t.originalText), ['first', 'second'])
  })
  it('sorts groups a->z and z->a by sortName', () => {
    const items = [
      todo({filePath: 'c.md', fileLabel: 'Charlie'}),
      todo({filePath: 'a.md', fileLabel: 'Alpha'}),
      todo({filePath: 'b.md', fileLabel: 'Bravo'}),
    ]
    assert.deepEqual(group(items, 'page', 'a->z').map(g => g.sortName), [
      'Alpha',
      'Bravo',
      'Charlie',
    ])
    assert.deepEqual(group(items, 'page', 'z->a').map(g => g.sortName), [
      'Charlie',
      'Bravo',
      'Alpha',
    ])
  })
  it('sorts groups new->old by newest item and old->new by oldest item', () => {
    const items = [
      todo({filePath: 'a.md', fileLabel: 'Alpha', fileCreatedTs: 1}),
      todo({filePath: 'a.md', fileLabel: 'Alpha', fileCreatedTs: 10}),
      todo({filePath: 'b.md', fileLabel: 'Bravo', fileCreatedTs: 8}),
      todo({filePath: 'b.md', fileLabel: 'Bravo', fileCreatedTs: 30}),
      todo({filePath: 'c.md', fileLabel: 'Charlie', fileCreatedTs: 5}),
      todo({filePath: 'c.md', fileLabel: 'Charlie', fileCreatedTs: 20}),
    ]
    assert.deepEqual(group(items, 'page', 'new->old').map(g => g.id), [
      'b.md',
      'c.md',
      'a.md',
    ])
    assert.deepEqual(group(items, 'page', 'old->new').map(g => g.id), [
      'a.md',
      'c.md',
      'b.md',
    ])
  })
  it('sorts items within a group by originalText or fileCreatedTs', () => {
    const items = [
      todo({fileCreatedTs: 100, originalText: 'bravo'}),
      todo({fileCreatedTs: 300, originalText: 'alpha'}),
      todo({fileCreatedTs: 200, originalText: 'charlie'}),
    ]
    assert.deepEqual(group(items, 'page', 'a->z', 'a->z')[0].todos.map(t => t.originalText), [
      'alpha',
      'bravo',
      'charlie',
    ])
    assert.deepEqual(group(items, 'page', 'a->z', 'new->old')[0].todos.map(t => t.fileCreatedTs), [300, 200, 100])
  })
  it('creates nested groups with the opposite groupBy when subGroups is true', () => {
    const items = [
      todo({
        filePath: 'alpha.md',
        fileLabel: 'Alpha',
        mainTag: 'work',
        subTag: 'urgent',
        originalText: 'work urgent',
      }),
      todo({
        filePath: 'alpha.md',
        fileLabel: 'Alpha',
        mainTag: 'home',
        subTag: undefined,
        originalText: 'home',
      }),
      todo({
        filePath: 'beta.md',
        fileLabel: 'Beta',
        mainTag: 'work',
        subTag: 'urgent',
        originalText: 'other page',
      }),
    ]
    const pageGroups = group(items, 'page', 'a->z', 'a->z', true, 'a->z')
    assertFields(pageGroups[0], {id: 'alpha.md', type: 'page'})
    assert.deepEqual(pageGroups[0].groups?.map(g => ({id: g.id, type: g.type})), [
      {id: JSON.stringify(['alpha.md', 'tag', '#home']), type: 'tag'},
      {id: JSON.stringify(['alpha.md', 'tag', '#work/urgent']), type: 'tag'},
    ])
    assert.deepEqual(pageGroups[0].groups?.[1].todos.map(t => t.originalText), [
      'work urgent',
    ])
    const tagGroups = group(items, 'tag', 'a->z', 'a->z', true, 'a->z')
    const workUrgent = tagGroups.find(g => g.id === '#work/urgent')
    assert.deepEqual(workUrgent?.groups?.map(g => ({id: g.id, type: g.type})), [
      {id: JSON.stringify(['#work/urgent', 'page', 'alpha.md']), type: 'page'},
      {id: JSON.stringify(['#work/urgent', 'page', 'beta.md']), type: 'page'},
    ])
  })
  it('returns only groups that contain todos', () => {
    assert.deepEqual(group([], 'page'), [])
    const groups = group([
      todo({filePath: 'alpha.md', fileLabel: 'Alpha'}),
      todo({filePath: 'beta.md', fileLabel: 'Beta'}),
    ], 'page')
    assert.notEqual(groups.length, 0)
    assert.equal(groups.every(g => g.todos.length > 0), true)
  })
})
