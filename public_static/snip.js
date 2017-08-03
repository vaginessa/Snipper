/**
 * Created by piyush0 on 22/05/17.
 */
const {ipcRenderer} = require('electron')

window.onload = function () {
    ipcRenderer.send('getGithubUser')
}

function newSnip() {
    let title = document.getElementById("title");
    let language = document.getElementById("language");
    let makeGist = document.getElementById("makeGistCheckbox").checked;
    let code = ace.edit("editor");

    const snip = {
        "title": title.value,
        "language": language.value,
        "code": code.getValue(),
        "timestamp": Math.floor(Date.now() / 1000),
        "hotkey": null,
        "makeGist": makeGist
    };
    ipcRenderer.send('new-snip-add', JSON.stringify(snip))
}

function closeWin() {
    ipcRenderer.send('close-snip-win');
}

ipcRenderer.on('githubUser', function (event, data, isNewSession) {
    console.log(data)
    if (data) {
        //user is loggedIn via github
        $('#gistCheckbox').show()
    } else {
        $('#gistCheckbox').hide()
    }
})