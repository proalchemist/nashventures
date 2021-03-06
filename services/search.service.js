const Q = require('q');
const request = require('request-promise');
const download = require('image-downloader');
const uniqid = require('uniqid');
const minify = require('minify-images');
const fs = require('fs-extra');
const jimp = require('jimp');
const SearchHistory = require('../models/searchHistory.model');

const service = {};

service.refreshLoc = refreshDir;
service.deleteLoc = emptyDir;
service.download = imgDownloader;
service.gsearch = googleit;
service.compress = compress;
service.bwfilter = filterBlackWhite;
service.save2DB = save2Db;
service.retrieve4DB = get4rmDb;
service.getHistoryData = getHistoryData;

module.exports = service;

// Refresh the location

function refreshDir(location) {
    if (!fs.existsSync(location)) {
        fs.mkdirSync(location);
    }
}

//  Remove the directory

function emptyDir(location) {
    fs.removeSync(location);
}

// Hit the resource from google

function googleit(url) {
    return request(url);
}

// Download the image from google and revert a promise

function imgDownloader(imgUrl, destination) {
    const deferred = Q.defer();
    const imgname = uniqid() + '.jpg';
    download.image({url: imgUrl, dest: destination + imgname}).then(({filename, image}) => {
        deferred.resolve(imgname);
    }).catch((err) => {
        deferred.reject('Failed to save image');
    });
    return deferred.promise;
}

// Apply Black and White Filter and revert a promise

function filterBlackWhite(files) {
    const deferred = Q.defer();
    let filesProcess = files.map((file) => {
        return jimp.read(file)
    });
    Q.all(filesProcess).then((filesLoaded) => {
        filesLoaded.forEach((file, at) => {
            file.greyscale().write(files[at]);
        });
        deferred.resolve(files);
    }).catch((err) => {
        deferred.reject('Failed to apply filter');
    });
    return deferred.promise;
}

// Compress the image file and revert a promise

function compress(destination, tmpLocation) {
    const deferred = Q.defer();
    minify.compress({
        src: tmpLocation,
        dest: destination,
    }).then(files => {
        deferred.resolve(files);
    }).catch(error => {
        deferred.reject('Failed to compress image')
    });
    return deferred.promise;
}

// Save image search to database for history and revert promise

function save2Db(searchstr, searchRes) {
    const deferred = Q.defer();
    const history = new SearchHistory({searchstr, searchRes});
    history.save((err) => {
        if (err) {
            deferred.reject('Failed to save to history');
        }
        deferred.resolve('saved successfully');
    });
    return deferred.promise;
}

// Get the history from database and revert a promise

function get4rmDb() {
    const deferred = Q.defer();
    SearchHistory.find({}, {searchstr: 1}, (err, history) => {
        if (err) {
            deferred.reject('Failed to fetch history');
        }
        history = history.map((histdoc) => {
            return {[histdoc.id]: histdoc.searchstr};
        });
        deferred.resolve(history);
    });
    return deferred.promise;
}

// Get the list for history data wrt ID  and revert a promise

function getHistoryData(id, downloadUrl) {
    const deferred = Q.defer();
    SearchHistory.findById({_id: id}, {searchRes: 1}, (err, historyData) => {
        if (err) {
            deferred.reject('Failed to fetch historyData');
        }
        deferred.resolve(historyData.searchRes);
    });
    return deferred.promise;
}
