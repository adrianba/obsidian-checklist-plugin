const assert = require('node:assert/strict')
const {assertFields} = require('./helpers/assert-fields.cjs')
const {describe, it} = require('node:test')
const manifest = require('../manifest.json')
const pkg = require('../package.json')
const versions = require('../versions.json')
describe('fork manifest', () => {
  it('preserves the fork identity independently of upstream metadata', () => {
    assertFields(manifest, {
      id: 'obsidian-checklist-plugin-adrianba',
      name: 'Checklist (adrianba)',
      author: 'adrianba',
    })
  })
  it('keeps release and minimum-app versions consistent', () => {
    assert.equal(manifest.version, pkg.version)
    assert.equal(versions[manifest.version], manifest.minAppVersion)
  })
})
