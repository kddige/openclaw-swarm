"use strict";
const electron = require("electron");
window.addEventListener("message", (event) => {
  if (event.data === "start-orpc-client") {
    const [serverPort] = event.ports;
    electron.ipcRenderer.postMessage("start-orpc-server", null, [serverPort]);
  }
});
