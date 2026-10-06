import assert from 'node:assert/strict'
import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('..', import.meta.url))
const publicDataDir = join(root, 'public', 'data')
const MAX_FILE_SIZE = 500 * 1024

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

test('public/data contains no file larger than 500 KB', async () => {
  const files = await collectFiles(publicDataDir)
  const oversized = []

  for (const file of files) {
    const { size } = await stat(file)
    if (size > MAX_FILE_SIZE) {
      oversized.push(`${relative(root, file)}: ${(size / 1024).toFixed(1)} KB`)
    }
  }

  assert.deepEqual(
    oversized,
    [],
    `Files in public/data exceed the 500 KB deployment limit:\n${oversized.join('\n')}`,
  )
})
