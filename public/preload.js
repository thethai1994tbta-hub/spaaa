const { contextBridge, ipcRenderer } = require('electron');

const api = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => ipcRenderer.on(channel, (e, ...args) => callback(...args)),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
};

contextBridge.exposeInMainWorld('electron', api);
contextBridge.exposeInMainWorld('ipc', api);
