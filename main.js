// ============================================================
// main.js
// ============================================================
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

// 单实例锁（可选）
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  return;
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: "#0e0e10",
    title: "HAR 解密查看器",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,   // 必须：让 preload 的 contextBridge 生效
      nodeIntegration: false,   // 必须：安全
      sandbox: false,           // preload 里要 require("electron")
      webSecurity: true,
      spellcheck: false,
    },
  });

  mainWindow.loadFile("index.html");

  // 首屏完成后再显示，避免白屏
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // 开发调试：按需打开
  // mainWindow.webContents.openDevTools({ mode: "detach" });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 隐藏 Electron 默认菜单（保留快捷键：F5 刷新、Ctrl+Shift+I 开 DevTools）
Menu.setApplicationMenu(Menu.buildFromTemplate([
  {
    label: "视图",
    submenu: [
      { role: "reload", accelerator: "F5" },
      { role: "forceReload", accelerator: "Ctrl+Shift+F5" },
      { role: "toggleDevTools", accelerator: "Ctrl+Shift+I" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  },
]));

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});