// ============================================================
// preload.js
// ============================================================
// 当前版本所有数据都存在 localStorage / IndexedDB 中，
// 不需要任何主进程 IPC；这个文件仅保留最小骨架，方便未来扩展。
// 若要新增能力，只需在下面 electronAPI 对象里加方法即可。
// ============================================================
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // 预留：目前 panel.js 不依赖这里的任何方法。
  // 如未来需要读本地文件：
  //   readFile: (absPath) => ipcRenderer.invoke("read-file", absPath),
  // 记得同时在 main.js 里注册 ipcMain.handle("read-file", ...)。
});