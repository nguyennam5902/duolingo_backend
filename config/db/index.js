const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

const mongoUrl = `mongodb+srv://W6EIwZwSAhN7vi0Y:W6EIwZwSAhN7vi0Y@duolingo.jolnnpg.mongodb.net/duolingo`
// const mongoUrl = `mongodb://127.0.0.1:27017/duolingo`

let gfs = null, audioGFS = null, gridfsBucket = null, audioBucket = null
const conn = mongoose.connection;

const getGFS = () => {
    if (gfs == null) {
        console.log("1st gfs");
        gfs = Grid(conn.db, mongoose.mongo);
        gfs.collection('uploads');
    }
    return gfs;
}
const getAudioGFS = () => {
    if (audioGFS == null) {
        console.log("1st audio gfs");
        audioGFS = Grid(conn.db, mongoose.mongo);
        audioGFS.collection('audio');
    }
    return audioGFS;
}

const getBucket = () => {
    if (gridfsBucket == null) {
        console.log("1st bucket");
        gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
            bucketName: 'uploads'
        });
    }
    return gridfsBucket;
}

const getAudioBucket = () => {
    if (audioBucket == null) {
        console.log("1st audio bucket");
        audioBucket = new mongoose.mongo.GridFSBucket(conn.db, {
            bucketName: 'audio'
        });
    }
    return audioBucket;
}

async function connect() {
    try {
        await mongoose.connect(mongoUrl);
        console.log('Connect MongoDB Successfully!!');
    } catch (error) {
        console.log('Connect MongoDB failure: ' + error.message);
    }
}


module.exports = { connect, getBucket, getGFS, getAudioBucket, getAudioGFS };