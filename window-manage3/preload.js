const path = require('path');
const addon = require('./hello_addon/build/Release/hello_addon.node');
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
  hello: () => addon.hello()
});
