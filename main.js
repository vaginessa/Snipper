'use strict';


const path = require('path');

 //handle setupevents as quickly as possible
 const setupEvents = require("./setupEvents")
 if (setupEvents.handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
 }


const {app, BrowserWindow, ipcMain, globalShortcut, clipboard} = require('electron');
const config = require('./secrets');
const electronOauth2 = require('electron-oauth2');
const axios = require('axios');
const U = require('./utils');

let githubUser = (void 0)
const githubConfig = {
    clientId: config.github.clientId,
    clientSecret: config.github.secret,
    authorizationUrl: 'http://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    useBasicAuthorizationHeader: false,
    redirectUri: 'http://localhost/'
};

const githubLogin = electronOauth2(githubConfig, {
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
        nodeIntegration: false
    }
})


const url = require('url');
// const db = require('./mongohandler');
const db = require('./nehandler');
let mainWindow = null;
let snipWindow = null;


app.on('ready', function () {
    const screen = require('electron').screen;
    registerShortcut();
    const {width, height} = screen.getPrimaryDisplay().workAreaSize
    mainWindow = new BrowserWindow({width, height, icon: path.join(__dirname, 'public_static', 'images', 'icon.ico')});

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'public_static', 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

     //mainWindow.webContents.openDevTools()

    require('./menu')
});

function registerShortcut() {
    const ret = globalShortcut.register('CommandOrControl+N', () => {
            newSnip();
})
    ;

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

    //snipWindow.openDevTools()

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
    if (hotkey != null && hotkey != "") {
        globalShortcut.unregister(hotkey);
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
    if (snip.hotkey == undefined) {
        snip.hotkey = null;
    }
    if (snip.makeGist) {
        const dateString = U.now();
        const fileName = `snipper-${snip.title}-${dateString}.${snip.language}`
        const payload = {
            description: snip.title,
            public: true,
            files: {
                [fileName]: {
                    content: snip.code
                }
            }
        }

        githubLogin.getAccessToken({
            scope: 'user,gist'
        })
            .then(token => {
                return axios.post('https://api.github.com/gists', payload, {
                    headers: {
                        Authorization: `token ${token.access_token}`
                    },
                    json: true
                })
            })
            .then(gist => {
            })
            .catch(err=> {
                console.error(err)
            })
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
    db.searchSnip(arg, function (result) {
        mainWindow.webContents.send('all-snips', result, false);
    })
});

process.on('uncaughtException', function (err) {
    mainWindow.webContents.send('invalid_key_error', err);
});

ipcMain.on('hotkey-set', function (event, id, value, code) {


    let msg;
    let ret = globalShortcut.register(value, function () {
        db.getcode(id, function (newcode) {
            clipboard.writeText(newcode);
        });
    });
    if (!ret) {
        const isr = globalShortcut.isRegistered(value);

        if (isr) {
            msg = " Already Registered";
        } else {
            msg = " Invalid Format ";
        }
        mainWindow.webContents.send('hotkey-set-return', false, id, msg, value);
    }
    else {
        db.updateHotKey(id, value, function (istrue) {
            const msg = " Registration Successful ";
            mainWindow.webContents.send('hotkey-set-return', true, id, msg, value);
        });
    }


});

ipcMain.on('hotkey-unset', function (event, id, hotkey) {
    db.removehotkey(id);

    if (hotkey != null) {
        globalShortcut.unregister(hotkey);
    }
});

ipcMain.on("openhelp", function (event) {
    let helpWindow = new BrowserWindow({
        width: 800,
        height: 600
    });

    helpWindow.loadURL('https://github.com/electron/electron/blob/master/docs/api/accelerator.md');
    //mainWindow.openDevTools() //opens inspect console

    /*githubLogin.getAccessToken({
        scope: 'user,gist'
    }).then(token => {
        // yay with token
    }).catch(err=> {
        console.error(err)
    })
    */

});

ipcMain.on('sort-dec', function (event, arg1, arg2) {
    db.sort(arg1, arg2, -1, function (result) {
        mainWindow.webContents.send('all-snips', result, false);
    });
});

ipcMain.on('sort-inc', function (event, arg1, arg2) {
    db.sort(arg1, arg2, 1, function (result) {
        mainWindow.webContents.send('all-snips', result, false);
    });
});

ipcMain.on('github-login', function (event, arg1, arg2) {
    githubLogin.getAccessToken({
     scope: 'user'
     })
        .then(token => {
            return axios.get('https://api.github.com/user',{
                headers: {
                    Authorization: `token ${token.access_token}`
                },
                json: true
            })
        })
        .then(user => {
            githubUser = user
            mainWindow.webContents.send('githubUser', githubUser, false);
        })
        .catch(err=> {
            console.error(err)
        })
})

ipcMain.on('sync-gists', function (event) {
    githubLogin.getAccessToken({
        scope: 'user'
    })
        .then(token => {
            return axios.get('https://api.github.com/gists',{
                headers: {
                    Authorization: `token ${token.access_token}`
                },
                json: true
            })
        })
        .then(response => {
            const gists = response.data
            const snipperGists = gists.filter(gist => {
                const filteredFiles = Object.keys(gist.files).filter(key => {
                    return /^snipper-.*$/.test(key)
                })

                return filteredFiles.length != 0
            })

            const promises = snipperGists.map(gist => {
                const fileName = Object.keys(gist.files)[0]
                const file = gist.files[fileName]
                const url = file.raw_url

                return (
                    axios.get(url)
                    .then( ({data}) => {
                        file.content = data
                        return file
                    })
                    .then(file => {
                        return new Promise(resolve => {
                            db.insertSnip({
                                title: file.filename,
                                language: file.language,
                                code: file.content,
                                timestamp: Math.floor(Date.now() / 1000),
                                hotkey: null
                            }, function () {
                                resolve()
                            })
                        })
                    })
                )
            })
            return Promise.all(promises)
        })
        .then( () => {
            sendAllSnips(false)
        })
        .catch(err=> {
            console.error(err)
        })
})

ipcMain.on('getGithubUser', function (event, window) {
    if (window === 'main')
        mainWindow.webContents.send('githubUser', githubUser, false);
    else
        snipWindow.send('githubUser', githubUser, false)
})

module.exports = {sendAllSnips, newSnip};

