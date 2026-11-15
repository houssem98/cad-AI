import { _electron as electron, expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// L8 T4: installs the NSIS build silently into a fresh folder, launches the installed app, checks that its window shows
// the app served by its own local server and that the server opened its store, then uninstalls. Python with build123d
// is a prerequisite on the machine; the installer does not bundle it.
const RELEASE = join(import.meta.dirname, '..', 'release');
const PORT = '3907'; // not the dev server's 3000

test('the installer installs an app that opens its window over its own local server', async () => {
  const setup = existsSync(RELEASE) ? readdirSync(RELEASE).find((f) => /Setup.*\.exe$/.test(f)) : undefined;
  expect(setup, 'no installer in release/: run npm run dist').toBeTruthy();
  const dir = mkdtempSync(join(tmpdir(), 'cad-installed-'));
  const data = mkdtempSync(join(tmpdir(), 'cad-installed-data-'));
  execFileSync(join(RELEASE, setup!), ['/S', `/D=${dir}`]); // NSIS wants /D= last and unquoted
  expect(existsSync(join(dir, 'cad-AI.exe'))).toBe(true);
  // An editor's extension host sets ELECTRON_RUN_AS_NODE, which would start the app as plain Node; a double-click never has it.
  const { ELECTRON_RUN_AS_NODE: _, ...env } = process.env;
  let app: Awaited<ReturnType<typeof electron.launch>> | undefined;
  try {
    app = await electron.launch({ executablePath: join(dir, 'cad-AI.exe'), env: { ...env, PORT, CAD_DATA_DIR: data, MODEL_MODE: 'replay' } as Record<string, string> });
    const win = await app.firstWindow();
    await expect(win).toHaveTitle(/MechForge AI/, { timeout: 120_000 });
    expect(win.url()).toBe(`http://127.0.0.1:${PORT}/`);
    expect(await win.evaluate(async () => (await fetch('/api/jobs')).status)).toBe(200);
    expect(existsSync(join(data, 'cad.db'))).toBe(true);
  } finally {
    await app?.close();
    execFileSync(join(dir, 'Uninstall cad-AI.exe'), ['/S', `_?=${dir}`]); // _?= runs the uninstaller in place, so it is done when it exits
    rmSync(dir, { recursive: true, force: true });
    rmSync(data, { recursive: true, force: true });
  }
});
