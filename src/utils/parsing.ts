import {LOCAL_SORT_OPT} from '../constants'

import type {SortDirection, TagMeta, LinkMeta, KeysOfType} from 'src/_types'

/**
 * Pure parsing/formatting helpers with no dependency on the Obsidian runtime.
 * Kept separate from `helpers.ts` (which is Obsidian-coupled) so this logic can
 * be unit-tested without stubbing the `obsidian` module.
 */

export const classifyString = (str: string) => {
  const sanitzedGroupName = (str ?? '').replace(/[^A-Za-z0-9]/g, '')
  const dasherizedGroupName = sanitzedGroupName.replace(
    /^([A-Z])|[\s\._](\w)/g,
    function (_, p1, p2) {
      if (p2) return '-' + p2.toLowerCase()
      return p1.toLowerCase()
    },
  )
  return dasherizedGroupName
}

export const removeTagFromText = (text: string, tag: string) => {
  if (!text) return ''
  if (!tag) return text.trim()
  return text.replace(new RegExp(`\\s?\\#${tag}[^\\s]*`, 'g'), '').trim()
}

export const getTagMeta = (tag: string): TagMeta => {
  const tagMatch = /^\#([^\/]+)\/?(.*)?$/.exec(tag)
  if (!tagMatch) return {main: null, sub: null}
  const [full, main, sub] = tagMatch
  return {main, sub}
}

export const retrieveTag = (tagMeta: TagMeta): string => {
  return tagMeta.main ? tagMeta.main : tagMeta.sub ? tagMeta.sub : ''
}

export const mapLinkMeta = (linkMeta: LinkMeta[]) => {
  const map = new Map<string, LinkMeta>()
  for (const link of linkMeta) map.set(link.filePath, link)
  return map
}

export const setLineTo = (line: string, setTo: boolean) =>
  line.replace(
    /^((\s|\>)*([\-\*]|[0-9]+\.)\s\[)([^\]]+)(\].*$)/,
    `$1${setTo ? 'x' : ' '}$5`,
  )

export const getAllLinesFromFile = (cache: string) => cache.split(/\r?\n/)
export const combineFileLines = (lines: string[]) => lines.join('\n')
export const lineIsValidTodo = (line: string) => {
  return /^(\s|\>)*([\-\*]|[0-9]+\.)\s\[(.{1})\]\s{1,4}\S+/.test(line)
}
export const extractTextFromTodoLine = (line: string) =>
  /^(\s|\>)*([\-\*]|[0-9]+\.)\s\[(.{1})\]\s{1,4}(\S{1}.*)$/.exec(line)?.[4]

/**
 * Removes literal HTML comments (`<!-- ... -->`) from a string. Any whitespace
 * runs created by the removal are collapsed to a single space and the result is
 * trimmed, so spaces that already separated words are preserved while otherwise
 * unnecessary whitespace (and comment-only text) is eliminated.
 */
export const stripHtmlComments = (text: string) =>
  text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

export const todoLineIsChecked = (line: string) =>
  /^(\s|\>)*([\-\*]|[0-9]+\.)\s\[(\S{1})\]/.test(line)
export const getFileLabelFromName = (filename: string) =>
  /^(.+)\.md$/.exec(filename)?.[1]

export const sortGenericItemsInplace = <
  T,
  NK extends KeysOfType<T, string>,
  TK extends KeysOfType<T, number>,
>(
  items: T[],
  direction: SortDirection,
  sortByNameKey: NK,
  sortByTimeKey: TK,
) => {
  if (direction === 'a->z')
    items.sort((a, b) =>
      (a[sortByNameKey] as any).localeCompare(
        b[sortByNameKey],
        navigator.language,
        LOCAL_SORT_OPT,
      ),
    )
  if (direction === 'z->a')
    items.sort((a, b) =>
      (b[sortByNameKey] as any).localeCompare(
        a[sortByNameKey],
        navigator.language,
        LOCAL_SORT_OPT,
      ),
    )
  if (direction === 'new->old')
    items.sort((a, b) => (b[sortByTimeKey] as any) - (a[sortByTimeKey] as any))
  if (direction === 'old->new')
    items.sort((a, b) => (a[sortByTimeKey] as any) - (b[sortByTimeKey] as any))
}

export const ensureMdExtension = (path: string) => {
  if (!/\.md$/.test(path)) return `${path}.md`
  return path
}
