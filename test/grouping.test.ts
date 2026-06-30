import {describe, it, expect} from 'vitest'

import {groupTodos} from '../src/utils/groups'

import type {TodoItem, SortDirection} from '../src/_types'

const todo = (overrides: Partial<TodoItem>): TodoItem =>
  ({
    filePath: 'notes/default.md',
    fileLabel: 'Default',
    mainTag: 'work',
    subTag: undefined,
    fileCreatedTs: 1,
    originalText: 'default todo',
    ...overrides,
  }) as TodoItem

const group = (
  items: TodoItem[],
  groupBy: 'page' | 'tag',
  sortGroups: SortDirection = 'a->z',
  sortItems: SortDirection = 'a->z',
  subGroups = false,
  subGroupSort: SortDirection = 'a->z',
) => groupTodos(items, groupBy, sortGroups, sortItems, subGroups, subGroupSort)

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

    expect(groups).toHaveLength(2)
    expect(groups.map(g => g.id)).toEqual(['notes/alpha.md', 'notes/beta.md'])
    expect(groups[0]).toMatchObject({
      type: 'page',
      pageName: 'Alpha Page',
      sortName: 'Alpha Page',
      className: 'alphaPage',
      oldestItem: 100,
      newestItem: 200,
    })
    expect(groups[0].todos.map(t => t.originalText)).toEqual([
      'alpha task',
      'beta task',
    ])
    expect(groups[1]).toMatchObject({
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

    expect(groups.map(g => g.id)).toEqual(['#home/chores', '#work', '#work/urgent'])
    expect(groups[0]).toMatchObject({
      type: 'tag',
      mainTag: 'home',
      subTags: 'chores',
      sortName: 'homechores',
      className: 'homechores',
    })
    expect(groups[1]).toMatchObject({
      type: 'tag',
      mainTag: 'work',
      subTags: undefined,
      sortName: 'work0',
      className: 'work',
    })
    expect(groups[2]).toMatchObject({
      type: 'tag',
      mainTag: 'work',
      subTags: 'urgent',
      sortName: 'workurgent',
      className: 'workurgent',
    })
    expect(groups[2].todos.map(t => t.originalText)).toEqual(['first', 'second'])
  })

  it('sorts groups a->z and z->a by sortName', () => {
    const items = [
      todo({filePath: 'c.md', fileLabel: 'Charlie'}),
      todo({filePath: 'a.md', fileLabel: 'Alpha'}),
      todo({filePath: 'b.md', fileLabel: 'Bravo'}),
    ]

    expect(group(items, 'page', 'a->z').map(g => g.sortName)).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
    ])
    expect(group(items, 'page', 'z->a').map(g => g.sortName)).toEqual([
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

    expect(group(items, 'page', 'new->old').map(g => g.id)).toEqual([
      'b.md',
      'c.md',
      'a.md',
    ])
    expect(group(items, 'page', 'old->new').map(g => g.id)).toEqual([
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

    expect(group(items, 'page', 'a->z', 'a->z')[0].todos.map(t => t.originalText)).toEqual([
      'alpha',
      'bravo',
      'charlie',
    ])
    expect(
      group(items, 'page', 'a->z', 'new->old')[0].todos.map(
        t => t.fileCreatedTs,
      ),
    ).toEqual([300, 200, 100])
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

    expect(pageGroups[0]).toMatchObject({id: 'alpha.md', type: 'page'})
    expect(pageGroups[0].groups?.map(g => ({id: g.id, type: g.type}))).toEqual([
      {id: '#home', type: 'tag'},
      {id: '#work/urgent', type: 'tag'},
    ])
    expect(pageGroups[0].groups?.[1].todos.map(t => t.originalText)).toEqual([
      'work urgent',
    ])

    const tagGroups = group(items, 'tag', 'a->z', 'a->z', true, 'a->z')
    const workUrgent = tagGroups.find(g => g.id === '#work/urgent')
    expect(workUrgent?.groups?.map(g => ({id: g.id, type: g.type}))).toEqual([
      {id: 'alpha.md', type: 'page'},
      {id: 'beta.md', type: 'page'},
    ])
  })

  it('returns only groups that contain todos', () => {
    expect(group([], 'page')).toEqual([])

    const groups = group(
      [
        todo({filePath: 'alpha.md', fileLabel: 'Alpha'}),
        todo({filePath: 'beta.md', fileLabel: 'Beta'}),
      ],
      'page',
    )

    expect(groups).not.toHaveLength(0)
    expect(groups.every(g => g.todos.length > 0)).toBe(true)
  })
})
