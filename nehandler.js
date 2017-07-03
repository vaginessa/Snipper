/**
 * Created by piyush0 on 03/06/17.
 */
const Datastore = require('nedb');
const {app} = require('electron');
const userData = app.getAppPath('userData').replace('/app.asar', '');
const snips = new Datastore({ filename: userData+'/db/snips.db', autoload: true });

function insertSnip(snip, done) {
    snips.insert(snip, function (err, result) {
        done(result);
    })
}

function searchSnip(title, done) {

    snips.find({

        "title": new RegExp(title)
    }).sort({"language": 1}).exec(
        function (err, result) {
            done(result);
        })
}

function findSnip(snipId, done) {
    snips.findOne({
        // _id: ObjectId(snipId.toString())
        _id: snipId
    }, function (err, result) {
        done(result);
    })
}


function allSnips(done) {

    snips.find({}).sort({"language": 1}).exec(function (err, result) {

        done(result)
    })
}

function updateSnip(snipId, snip, done) {

    snips.find({}).exec(function (err, result) {
        snips.update({
            // _id: ObjectId(snipId.toString())
            _id: snipId
        }, snip, function (err, result) {
            done(result);
        })
    })
}


function deleteSnip(snipId, done) {

    snips.remove({
        _id: snipId
    }, function (err, result) {
        done(result);
    })
}


function updateHotKey(snipId, value, done){

    snips.find({}).exec(function (err,result) {
        snips.update({
            _id: snipId
        }, { $set: { hotkey: value } }, function (err) {
            done(true);
        })
    });   

}

function removehotkey(snipId){
    snips.update({
            _id: snipId
        }, { $set: { hotkey: null } }, function (err) {
    });
}


function sort(arg1,arg2,val,done) {

    if(arg1=="title_show"){
        snips.find({
            "title": new RegExp(arg2)
        }).sort({"title" : val}).exec(
            function (err, result) {
                done(result);
            })
    }
    else if(arg1=="language_show"){
        snips.find({
            "title": new RegExp(arg2)
        }).sort({"language" : val}).exec(
            function (err, result) {
                done(result);
            })
    }
    else{
        snips.find({
            "title": new RegExp(arg2)
        }).sort({"timestamp" : val}).exec(
            function (err, result) {
                done(result);
            })
    }

}

function getcode(snipId, done){
    snips.find({ "_id": snipId }, function (err, docs) {
        done(docs[0].code);
    });
}

module.exports = {
    insertSnip, findSnip, allSnips, updateSnip, deleteSnip, searchSnip ,sort, updateHotKey, removehotkey, getcode
};