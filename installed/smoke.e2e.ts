import { _electron as electron, expect, test } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// L8 T4: installs the NSIS build silently into a fresh folder, launches the installed app, builds a part through its own
// server and kernel, and checks what an install must not do; then uninstalls and checks nothing is left. Python with
// build123d is a prerequisite on the machine; the installer does not bundle it.
const RELEASE = join(import.meta.dirname, '..', 'release');
const PORT = '3907'; // not the dev server's 3000
const KEY = /sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35}/;
// An editor's extension host sets ELECTRON_RUN_AS_NODE, which would start the app as plain Node; a double-click never has it.
const { ELECTRON_RUN_AS_NODE: _, ...base } = process.env;
const files = (dir: string): string[] => readdirSync(dir, { recursive: true, encoding: 'utf8' }).map((f) => join(dir, f)).filter((f) => statSync(f).isFile());
const exits = (exe: string, env: object, ms: number) => new Promise<boolean>((resolve) => {
  const p = spawn(exe, [], { env: env as NodeJS.ProcessEnv });
  const t = setTimeout(() => { p.kill(); resolve(false); }, ms);
  p.on('exit', () => { clearTimeout(t); resolve(true); });
});
const running = () => execFileSync('tasklist', ['/FI', 'IMAGENAME eq cad-AI.exe', '/NH'], { encoding: 'utf8' }).includes('cad-AI.exe');
const stops = async () => { for (let i = 0; i < 20 && running(); i++) await new Promise((r) => setTimeout(r, 500)); return !running(); };
const registered = () => {
  try { return execFileSync('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall', '/s', '/f', 'cad-AI', '/d'], { encoding: 'utf8' }).includes('cad-AI'); }
  catch { return false; } // reg exits 1 when nothing matches
};

test('the installer installs an app that builds a part over its own local server, and uninstalls cleanly', async () => {
  const setup = existsSync(RELEASE) ? readdirSync(RELEASE).find((f) => /Setup.*\.exe$/.test(f)) : undefined;
  expect(setup, 'no installer in release/: run npm run dist').toBeTruthy();
  const dir = mkdtempSync(join(tmpdir(), 'cad-installed-'));
  const data = mkdtempSync(join(tmpdir(), 'cad-installed-data-'));
  const exe = join(dir, 'cad-AI.exe');
  const env = { ...base, PORT, CAD_DATA_DIR: data, MODEL_MODE: 'replay' };
  execFileSync(join(RELEASE, setup!), ['/S', `/D=${dir}`]); // NSIS wants /D= last and unquoted
  let app: Awaited<ReturnType<typeof electron.launch>> | undefined;
  let blocker: ReturnType<typeof createServer> | undefined;
  try {
    expect(existsSync(exe)).toBe(true);
    const packaged = join(dir, 'resources', 'app');
    expect(existsSync(join(packaged, 'src/services/agent/recordings/spend.json')), 'the spend counter ships with the code (council X4)').toBe(false);
    const keyed = files(packaged).filter((f) => !f.includes(`${join('app', 'node_modules')}`) && KEY.test(readFileSync(f, 'latin1')));
    expect(keyed, 'a key shape in the installed files (council X13)').toEqual([]);

    app = await electron.launch({ executablePath: exe, env: env as Record<string, string> });
    expect(await app.evaluate(({ app: a }) => a.getPath('userData'))).toMatch(/[\\/]cad-AI$/); // council X15
    const win = await app.firstWindow();
    await expect(win).toHaveTitle(/MechForge AI/, { timeout: 120_000 });
    expect(win.url()).toBe(`http://127.0.0.1:${PORT}/`);
    // The installed app's own kernel builds a part, on recorded model answers (council X3).
    const chat = win.locator('[data-panel="chat"]');
    await chat.getByRole('textbox', { name: 'Message' }).fill('Plate 100 mm by 60 mm by 5 mm.');
    await chat.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(chat.getByTestId('agent-request').last().getByTestId('report')).toContainText('30000 mm3', { timeout: 120_000 });
    expect(readFileSync(join(data, 'operations.log'), 'utf8')).toContain('"status":"succeeded"');
    // A second launch leaves the first one alone (council X2).
    expect(await exits(exe, env, 30_000), 'a second instance kept running').toBe(true);
    expect(await win.evaluate(async () => (await fetch('/api/jobs')).status)).toBe(200);
    await app.close();
    app = undefined;

    // Another program on the port: the window says so instead of showing it, and the app stays open (council X16).
    blocker = createServer((_q, r) => r.end('<title>someone else</title>')).listen(Number(PORT), '127.0.0.1');
    app = await electron.launch({ executablePath: exe, env: env as Record<string, string> });
    await expect(await app.firstWindow()).toHaveTitle('cad-AI could not start', { timeout: 120_000 });
  } finally {
    await app?.close();
    blocker?.close();
    execFileSync(join(dir, 'Uninstall cad-AI.exe'), ['/S', `_?=${dir}`]); // _?= runs the uninstaller in place, so it is done when it exits
    expect(existsSync(exe), 'the uninstaller left the app').toBe(false);
    expect(registered(), 'the uninstaller left its registry entry').toBe(false);
    expect(await stops(), 'a cad-AI process is still running').toBe(true);
    rmSync(dir, { recursive: true, force: true }); // the in-place uninstaller itself stays behind under _?=
    rmSync(data, { recursive: true, force: true });
  }
});
