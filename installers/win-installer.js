var electronInstaller = require('electron-winstaller');

resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: './installers/Snipper-win32-x64',
    outputDirectory: './installers/win-setup',
    authors: 'Coding Blocks.',
    exe: 'Snipper.exe',
    setupExe: 'Snipper-setup-main.exe'
  });

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e.message}`));