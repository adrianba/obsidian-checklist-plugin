export type TodoItem = {
  completionExpiresAt?: number
  checked: boolean
  filePath: string
  fileName: string
  fileLabel: string
  fileCreatedTs: number
  fileModifiedTs: number
  filterTags: string[]
  sourceLine: string
  parentLine?: number
  children: TodoItem[]
  mainTag?: string
  subTag?: string
  line: number
  originalText: string
  displayText: string
  rawHTML: string
}

type BaseGroup = {
  path?: string
  label?: string
  type: GroupByType
  todos: TodoItem[]
  id: string
  sortName: string
  className: string
  oldestItem: number
  newestItem: number
  groups?: TodoGroup[]
}

type PageGroup = BaseGroup & {
  type: 'page'
  pageName?: string
}
type TagGroup = BaseGroup & {
  type: 'tag'
  mainTag?: string
  subTags?: string
}

type FolderGroup = BaseGroup & {type: 'folder'}
export type TodoGroup =
  | PageGroup
  | TagGroup
  | FolderGroup
  | (BaseGroup & {type: 'none'})

export type TagMeta = {main: string; sub: string}
export type LinkMeta = {filePath: string; linkName: string}

export type GroupByType = 'none' | 'page' | 'tag' | 'folder'
export type SortDirection =
  | 'new->old'
  | 'old->new'
  | 'a->z'
  | 'z->a'
  | 'source'
  | 'modified'
  | 'configured'

export type Icon = 'chevron' | 'settings'
