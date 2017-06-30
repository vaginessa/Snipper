'use strict';

const {app, BrowserWindow, ipcMain, globalShortcut, clipboard} = require('electron');

const path = require('path');
const url = require('url');
// const db = require('./mongohandler');
const db = require('./nehandler');
let mainWindow = null;
let snipWindow = null;


app.on('ready', function () {
    const screen = require('electron').screen;
    registerShortcut();
    const {width, height} = screen.getPrimaryDisplay().workAreaSize
    mainWindow = new BrowserWindow({width, height});

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'public_static', 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // mainWindow.webContents.openDevTools()

    require('./menu')
});

function registerShortcut() {
    const ret = globalShortcut.register('CommandOrControl+N', () => {
        newSnip();
    });

    if (!ret) {
        console.log('registration failed')
    }

    // Check whether a shortcut is registered.
    console.log(globalShortcut.isRegistered('CommandOrControl+N'))

}

function newSnip() {
    snipWindow = new BrowserWindow({
        height: 578,
        width: 800,
        frame: false,

    });

    snipWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'public_static', 'snip.html'),
        protocol: 'file:',
        slashes: true
    }));
}


function sendAllSnips(isNewSession) {
    db.allSnips(function (snips) {
        let result = [];
        for (let i = 0; i < snips.length; i++) {
            result.push({
                title: snips[i].title,
                language: snips[i].language,
                _id: snips[i]._id.toString(),
                code: snips[i].code,
                timestamp: snips[i].timestamp,
                hotkey: snips[i].hotkey
            })
        }
        mainWindow.webContents.send('all-snips', result, isNewSession);
    })
}

/* IPC's */

ipcMain.on('new-snip', function (event, arg) {
   newSnip();
});

ipcMain.on('get-snips', function () {
    sendAllSnips(true);
});

ipcMain.on('delete-snip', function (event, arg, hotkey) {
    if(hotkey!=null){
        globalShortcut.unregister(hotkey);
        console.log("unregistered "+hotkey);
    }
    db.deleteSnip(arg, function () {
        sendAllSnips(false);
    });
});


ipcMain.on('edit-snip', function (event, arg) {
    db.findSnip(arg, function (result) {
        editSnip(result)
    })
});

ipcMain.on('close-snip-win', function (event, arg) {
    if (snipWindow) {
        snipWindow.close();
    }
});

ipcMain.on('new-snip-add', function (event, arg) {

    let snip = JSON.parse(arg);
    if(snip.hotkey==undefined){
        snip.hotkey=null;
    }
    if (snip._id) {
        db.updateSnip(snip._id, {
            title: snip.title,
            language: snip.language,
            code: snip.code,
            timestamp: Math.floor(Date.now() / 1000),
            hotkey: snip.hotkey
        }, function () {
            sendAllSnips(false);
        });
    }
    else {
        db.insertSnip(snip, function () {
            sendAllSnips(false);
            if (snipWindow) {
                snipWindow.close();
            }
        })
    }
});

ipcMain.on('copy-to-clip', function (event, code) {
    clipboard.writeText(code);
});

ipcMain.on('search-snip', function (event, arg) {
    db.searchSnip(arg,function (result) {
        mainWindow.webContents.send('all-snips', result, false);
    })
})


ipcMain.on('hotkey-set', function(event, id, value, code){


    var ret = globalShortcut.register(value, function(){
        db.getcode(id,function(newcode){
            clipboard.writeText(newcode);
        });
    });
    if (!ret) {
        console.log('registration failed');

        var isr = globalShortcut.isRegistered(value);

        if (isr){
            var msg = " already registered"
        }
        else{
            var msg = " invalid format "
        }
        mainWindow.webContents.send('hotkey-set-return', false, id, msg, value);
    }
    else{
        console.log('registration successful')
        db.updateHotKey(id,value,function (istrue) {

            var msg = " registration successful "
            mainWindow.webContents.send('hotkey-set-return', true, id, msg, value);        
        });
    }


});

ipcMain.on('hotkey-unset', function (event, id, hotkey) {
    db.removehotkey(id);
    console.log('unregistering ' +hotkey)
    if(hotkey!=null){
        globalShortcut.unregister(hotkey);
        console.log("unregistered "+hotkey);
    }
});

ipcMain.on("openhelp", function(event){
    var helpWindow = new BrowserWindow ({
        width: 800,
        height: 600
    })
    helpWindow.loadURL('https://github.com/electron/electron/blob/master/docs/api/accelerator.md')
    //mainWindow.openDevTools() //opens inspect console

});

ipcMain.on('sort-dec', function (event, arg1,arg2) {
    db.sort(arg1,arg2,-1,function (result) {
        mainWindow.webContents.send('all-snips', result, false);
    });
});

ipcMain.on('sort-inc', function (event, arg1,arg2) {
    db.sort(arg1,arg2,1,function (result) {
        mainWindow.webContents.send('all-snips', result, false);
    });
});

module.exports = {sendAllSnips, newSnip}

