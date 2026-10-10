const assert = require('node:assert/strict')

function assertFields(actual, expected) {
  for (const [key, value] of Object.entries(expected)) {
    assert.deepEqual(actual[key], value, `Mismatch in ${key}`)
  }
}

module.exports = {assertFields}
