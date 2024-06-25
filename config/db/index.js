const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

const mongoUrl = `mongodb+srv://W6EIwZwSAhN7vi0Y:W6EIwZwSAhN7vi0Y@duolingo.jolnnpg.mongodb.net/duolingo`
// const mongoUrl = `mongodb://127.0.0.1:27017/duolingo`

let gfs = null, gridfsBucket = null;
const conn = mongoose.connection;

const getGFS = () => {
    if (gfs == null) {
        console.log("1st gfs");
        gfs = Grid(conn.db, mongoose.mongo);
        gfs.collection('uploads');
    }
    return gfs;
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
async function connect() {
    try {
        await mongoose.connect(mongoUrl);
        console.log('Connect MongoDB Successfully!!');
    } catch (error) {
        console.log('Connect MongoDB failure: ' + error.message);
    }
}


module.exports = { connect, getBucket, getGFS };