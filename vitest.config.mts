import {fileURLToPath} from 'node:url'

import {defineConfig} from 'vitest/config'

export default defineConfig({
  resolve: {
    // Honor tsconfig `baseUrl` so `import ... from 'src/_types'` resolves.
    tsconfigPaths: true,
    alias: {
      // `obsidian` ships types only; point tests at a runtime stub.
      obsidian: fileURLToPath(
        new URL('./test/__mocks__/obsidian.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
  },
})
