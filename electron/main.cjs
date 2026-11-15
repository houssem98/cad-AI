// L8 T4: the desktop window. It runs the local server with Electron's own Node (ELECTRON_RUN_AS_NODE) from the
// unpacked app folder, keeps its data in the user's app-data folder, and shows the app the server serves.
const { app, BrowserWindow } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || '3000';
let server;

app.whenReady().then(() => {
  server = spawn(process.execPath, ['--import', 'tsx', path.join(ROOT, 'server.ts')], {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'production', PORT,
      CAD_DATA_DIR: process.env.CAD_DATA_DIR || path.join(app.getPath('userData'), 'data') },
  });
  server.on('exit', (code) => { if (code) app.quit(); });
  const win = new BrowserWindow({ width: 1440, height: 900 });
  // The server needs a few seconds for the kernel worker; until it listens, retry.
  const load = () => win.loadURL(`http://127.0.0.1:${PORT}/`).catch(() => setTimeout(load, 500));
  load();
});

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => server?.kill());
