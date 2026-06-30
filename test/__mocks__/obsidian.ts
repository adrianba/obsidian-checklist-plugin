/**
 * Minimal runtime stub for the `obsidian` package, which ships type
 * declarations only (no runtime JS). Vitest aliases `obsidian` to this file so
 * value imports (`parseFrontMatterTags`, `TFile`, `Vault`, ...) resolve in tests.
 *
 * Only the surface actually exercised by the parsing code is implemented; the
 * rest are inert placeholder classes so transitive value imports don't blow up.
 */

const normalizeTag = (tag: string): string =>
  tag.startsWith('#') ? tag : `#${tag}`

/**
 * Faithful-enough reimplementation of Obsidian's `parseFrontMatterTags`.
 * Reads the `tags` and `tag` frontmatter fields (each may be a string or an
 * array of strings; strings may be comma/space separated) and returns them as
 * `#`-prefixed tag strings, or `null` when there is no frontmatter.
 */
export function parseFrontMatterTags(
  frontmatter: Record<string, unknown> | null | undefined,
): string[] | null {
  if (!frontmatter) return null
  const out: string[] = []
  for (const key of ['tags', 'tag']) {
    const value = (frontmatter as Record<string, unknown>)[key]
    if (value == null) continue
    const items = Array.isArray(value) ? value : String(value).split(/[,\s]+/)
    for (const item of items) {
      const trimmed = String(item).trim()
      if (trimmed) out.push(normalizeTag(trimmed))
    }
  }
  return out.length ? out : null
}

export class TFile {
  path = ''
  name = ''
  basename = ''
  extension = ''
  stat = {ctime: 0, mtime: 0, size: 0}
}

export class TAbstractFile {}
export class TFolder {}
export class Vault {}
export class MetadataCache {}
export class App {}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class ItemView {}
export class MarkdownView {}
export class WorkspaceLeaf {}
export const Keymap = {
  isModEvent: () => false,
}

export type CachedMetadata = unknown
export type TagCache = unknown
export type LinkCache = unknown
export type FrontMatterCache = unknown
