import {app, BrowserWindow, screen} from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let win: BrowserWindow = null;
const args = process.argv
const serve = args.some(val => val === '--serve');
var host = args.find(it => it.includes("host"))?.split("=").slice(-1)[0]
var modoOperacao = args.find(it => it.includes("modoOperacao"))?.split("=").slice(-1)[0]


function loadAngular(win : BrowserWindow){
  if (serve) {
    win.loadURL('http://localhost:4200');
  } else {
    let pathIndex = './index.html';
    if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
      pathIndex = '../dist/index.html';
    }
    const url = new URL(path.join('file:', __dirname, pathIndex));
    win.loadURL(url.href)
  }
}

function createWindow(): BrowserWindow {
  const size = screen.getPrimaryDisplay().workAreaSize;
  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: (serve),
      contextIsolation: false,  // false if you want to run e2e test with Spectron
    },
  });
  if(!host)
    host = "http://localhost:8080"
  if(!modoOperacao)
    modoOperacao = "external"

  console.log("host: ",host)
  console.log("modoOperacao",modoOperacao)
  console.log("args",args)
  
  loadAngular(win)
  
  win.webContents.executeJavaScript("localStorage.setItem('host','"+host+"')").then((value) => {
    win.webContents.executeJavaScript("localStorage.setItem('modoOperacao','"+modoOperacao+"')",true).then(value => {
      loadAngular(win)
    });
  });
  
  win.on('closed', () => {
    win = null;
  });
  return win;
}

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on('ready', () => {
    setTimeout(createWindow, 400);
    // app.commandLine.appendSwitch('--enable-features=GuestViewCrossProcessFrames');    
  });

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

} catch (e) {
  // Catch Error
  // throw e;
}
