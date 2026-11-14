import { spawnSync } from 'node:child_process'
import { mkdir, readdir, utimes, copyFile, mkdtemp, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.status !== 0) throw new Error(`${command} failed: ${result.error ?? result.status}`)
}
run('npm', ['run', 'build'], { env: { ...process.env, VITE_CUSTOM_EVENTS: 'false', VITE_TELEMETRY_DEBUG: 'false', VITE_SUPPORT_URL: '' } })
const staging = await mkdtemp(join(tmpdir(), 'prime-suspects-package-'))
const files = []
async function stage(directory = '') {
  for (const entry of (await readdir(join('dist', directory), { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    const name = join(directory, entry.name)
    if (entry.isDirectory()) { await mkdir(join(staging, name), { recursive: true }); await stage(name) }
    else {
      await copyFile(join('dist', name), join(staging, name))
      await utimes(join(staging, name), new Date('2000-01-01T00:00:00Z'), new Date('2000-01-01T00:00:00Z'))
      files.push(name)
    }
  }
}
await stage()
await mkdir('release', { recursive: true })
const temporary = resolve(staging, 'package.zip')
run('zip', ['-X', '-q', temporary, ...files.sort()], { cwd: staging, env: { ...process.env, TZ: 'UTC' } })
await copyFile(temporary, 'release/prime-suspects-html5.zip')
await writeFile('release/README.txt', 'Not published. Serve the extracted index.html over HTTP. Custom analytics and support links are disabled in this ZIP. No service worker; file:// and offline hosted reload are not supported.\n')
console.log('Created release/prime-suspects-html5.zip with index.html at its root.')
