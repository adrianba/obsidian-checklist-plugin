import {CachedMetadata, parseFrontMatterTags, TFile, Vault} from 'obsidian'

import {getTagMeta} from './parsing'

/**
 * Obsidian-coupled helpers. Pure parsing helpers live in `./parsing` and are
 * re-exported below so existing `./helpers` import sites keep working.
 */
export * from './parsing'

export const getFrontmatterTags = (
  cache: CachedMetadata,
  todoTags: string[] = [],
) => {
  const frontMatterTags: string[] =
    parseFrontMatterTags(cache?.frontmatter) ?? []
  if (todoTags.length > 0)
    return frontMatterTags.filter((tag: string) =>
      todoTags.includes(getTagMeta(tag).main),
    )
  return frontMatterTags
}

export const getAllTagsFromMetadata = (cache: CachedMetadata): string[] => {
  if (!cache) return []
  const frontmatterTags = getFrontmatterTags(cache)
  const blockTags = (cache.tags ?? []).map(e => e.tag)
  return [...frontmatterTags, ...blockTags]
}

export const getFileFromPath = (vault: Vault, path: string) => {
  let file = vault.getAbstractFileByPath(path)
  if (file instanceof TFile) return file
  const files = vault.getMarkdownFiles()
  file = files.find(e => e.name === path)
  if (file instanceof TFile) return file
}
