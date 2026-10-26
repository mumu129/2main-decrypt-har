const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const vm = require('vm');

// ============================================================
// 目录规划
//   开发时：项目目录/config、项目目录/plugins
//   打包后：userData/config、userData/plugins
// ============================================================
function projectRoot() { return __dirname; }
function getConfigDir() {
  return app.isPackaged
    ? path.join(app.getPath('userData'), 'config')
    : path.join(projectRoot(), 'config');
}
function getPluginsDir() {
  return app.isPackaged
    ? path.join(app.getPath('userData'), 'plugins')
    : path.join(projectRoot(), 'plugins');
}

async function ensureDirs() {
  await fs.mkdir(getConfigDir(), { recursive: true });
  await fs.mkdir(getPluginsDir(), { recursive: true });

  // 初始化空配置文件
  const dPath = path.join(getConfigDir(), 'decoders.js');
  const rPath = path.join(getConfigDir(), 'rules.js');
  try { await fs.access(dPath); } catch {
    await fs.writeFile(dPath, 'window.HAR_TEMPLATES = {};\nwindow.HAR_DECODERS = {};\n', 'utf-8');
  }
  try { await fs.access(rPath); } catch {
    await fs.writeFile(rPath, 'window.HAR_RULES = [];\n', 'utf-8');
  }
}

// ============================================================
// 窗口
// ============================================================
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'HAR 解密查看器',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(projectRoot(), 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.loadFile(path.join(projectRoot(), 'renderer', 'index.html'));
  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(async () => {
  await ensureDirs();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ============================================================
// 配置 IPC
// ============================================================
async function readConfigFile(type) {
  const p = path.join(getConfigDir(), type === 'decoders' ? 'decoders.js' : 'rules.js');
  try {
    const content = await fs.readFile(p, 'utf-8');
    const sandbox = { window: {}, console };
    vm.createContext(sandbox);
    vm.runInContext(content, sandbox, { timeout: 1000 });
    return { success: true, content, data: sandbox.window, path: p };
  } catch (e) {
    return { success: false, content: '', data: {}, error: e.message, path: p };
  }
}

ipcMain.handle('config:read', async (e, { type }) => readConfigFile(type));

ipcMain.handle('config:write', async (e, { type, content }) => {
  try {
    const p = path.join(getConfigDir(), type === 'decoders' ? 'decoders.js' : 'rules.js');
    await fs.writeFile(p, content, 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('config:getDir', async () => getConfigDir());

ipcMain.handle('config:openDir', async () => {
  shell.openPath(getConfigDir());
  return { success: true, dir: getConfigDir() };
});

// ============================================================
// 插件 IPC
// ============================================================
ipcMain.handle('plugins:list', async () => {
  try {
    const dir = getPluginsDir();
    const files = (await fs.readdir(dir)).filter(f => f.endsWith('.js'));
    const result = [];
    for (const f of files) {
      const content = await fs.readFile(path.join(dir, f), 'utf-8');
      result.push({ name: f, content, size: content.length });
    }
    return { success: true, dir, files: result };
  } catch (e) {
    return { success: false, dir: getPluginsDir(), files: [], error: e.message };
  }
});

ipcMain.handle('plugins:openDir', async () => {
  shell.openPath(getPluginsDir());
  return { success: true, dir: getPluginsDir() };
});

ipcMain.handle('plugins:write', async (e, { name, content }) => {
  try {
    if (!/^[A-Za-z0-9_\-.]+\.js$/.test(name)) throw new Error('文件名不合法');
    await fs.writeFile(path.join(getPluginsDir(), name), content, 'utf-8');
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('plugins:delete', async (e, { name }) => {
  try {
    if (!/^[A-Za-z0-9_\-.]+\.js$/.test(name)) throw new Error('文件名不合法');
    await fs.unlink(path.join(getPluginsDir(), name));
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});