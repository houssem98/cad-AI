// L8 T4: the desktop window. It runs the local server with Electron's own Node (ELECTRON_RUN_AS_NODE) from the
// unpacked app folder, keeps its data in the user's app-data folder, and shows the app the server serves.
const { app, BrowserWindow } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || '3000';
// The package name is a template's; the data folder is the product's (council X15). Uninstall keeps it (the human's decision).
app.setPath('userData', path.join(app.getPath('appData'), 'cad-AI'));
let server;
let win;

// One instance per data folder: a second server would close the first one's running operations as crashed (council X2).
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    win = new BrowserWindow({ width: 1440, height: 900 });
    server = spawn(process.execPath, ['--import', 'tsx', path.join(ROOT, 'server.ts')], {
      cwd: ROOT,
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      windowsHide: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'production', PORT,
        CAD_DATA_DIR: process.env.CAD_DATA_DIR || path.join(app.getPath('userData'), 'data') },
    });
    // The window loads only once this app's server listens, so it never shows another program on the port (council X16).
    server.on('message', (m) => { if (m === 'ready') win.loadURL(`http://127.0.0.1:${PORT}/`); });
    server.on('exit', (code) => {
      if (!code || win.isDestroyed()) return;
      const page = `<title>cad-AI could not start</title><body style="font:15px sans-serif;padding:32px">
        <h1>cad-AI could not start</h1><p>Its local server stopped with exit code ${code}.</p>
        <p>Another program may be using port ${PORT} on this machine. Close it and start cad-AI again.</p></body>`;
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page)}`);
    });
  });
}

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => server?.kill());
