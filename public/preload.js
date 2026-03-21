import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
});
