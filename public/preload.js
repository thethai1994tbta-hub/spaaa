const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] Loading preload script');

try {
  // Expose IPC to both window.electron and window.ipc for compatibility
  const ipcAPI = {
    invoke: (channel, ...args) => {
      console.log('[IPC] invoke:', channel);
      return ipcRenderer.invoke(channel, ...args);
    },
    on: (channel, func) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  };

  contextBridge.exposeInMainWorld('electron', ipcAPI);
  contextBridge.exposeInMainWorld('ipc', ipcAPI);

  console.log('[Preload] IPC exposed successfully');
} catch (error) {
  console.error('[Preload] Error:', error);
}
