const {buildSync} = require('esbuild')
const Module = require('node:module')
const path = require('node:path')

class TFile {
  constructor(name = '', content = '') {
    this.path = name
    this.name = name
    this.extension = 'md'
    this.stat = {mtime: 10, ctime: 1}
    this.content = content
  }
}
class ItemView {
  constructor(leaf) {
    this.app = leaf.app
  }
  registerEvent() {}
}
const obsidian = {
  TFile,
  ItemView,
  Notice: class {},
  FuzzySuggestModal: class {},
  Plugin: class {
    onunload() {}
  },
  PluginSettingTab: class {},
  Keymap: {isModEvent: () => false},
  MarkdownView: class {},
  parseFrontMatterTags(frontmatter) {
    if (!frontmatter) return null
    const tags = []
    for (const key of ['tags', 'tag']) {
      const value = frontmatter[key]
      if (value == null) continue
      const items = Array.isArray(value) ? value : String(value).split(/[,\s]+/)
      for (const item of items) {
        const trimmed = String(item).trim()
        if (trimmed) tags.push(trimmed.startsWith('#') ? trimmed : '#' + trimmed)
      }
    }
    return tags.length ? tags : null
  },
}

function load(entry) {
  const result = buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    external: ['obsidian', '*.svelte'],
  })
  const m = new Module(path.resolve(entry))
  m.paths = module.paths
  m.require = id =>
    id === 'obsidian'
      ? obsidian
      : id.endsWith('.svelte')
      ? class {}
      : require(id)
  m._compile(result.outputFiles[0].text, path.resolve(entry))
  return m.exports
}

module.exports = {TFile, obsidian, load}
