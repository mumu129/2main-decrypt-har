const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 配置
  readConfig: (type) => ipcRenderer.invoke('config:read', { type }),
  writeConfig: (type, content) => ipcRenderer.invoke('config:write', { type, content }),
  getConfigDir: () => ipcRenderer.invoke('config:getDir'),
  openConfigDir: () => ipcRenderer.invoke('config:openDir'),

  // 插件
  listPlugins: () => ipcRenderer.invoke('plugins:list'),
  openPluginsDir: () => ipcRenderer.invoke('plugins:openDir'),
  writePlugin: (name, content) => ipcRenderer.invoke('plugins:write', { name, content }),
  deletePlugin: (name) => ipcRenderer.invoke('plugins:delete', { name }),
});