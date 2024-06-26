const mongoose = require('mongoose');
const Speaking = require("../models/speaking");
const SpeakingAnswer = require("../models/speakingAnswer");
const { Readable } = require('stream');
const { getAudioBucket, getAudioGFS } = require('../config/db');

class SpeakingController {
   async speaking(req, res) {
      try {
         const result = []
         for (let i = 1; i < 4; i++) {
            let tmp = await Speaking.aggregate([{ $match: { part: i } }, { $sample: { size: 1 } }]).exec();
            result.push(tmp[0]);
         }
         res.send(result);
      } catch (err) {
         console.log(err);
         res.send('ERROR');
      }
   }

   async upload(req, res) {
      const ids = req.body.parts;
      const buffer = Buffer.from(req.body.file.data)

      const readableAudioStream = new Readable();
      readableAudioStream.push(buffer);
      readableAudioStream.push(null);
      const filename = 'speaking_audio_' + Date.now()
      const uploadStream = getAudioBucket().openUploadStream(filename, {
         contentType: 'audio/wav' // Set the correct content type as per your requirement
      });
      readableAudioStream.pipe(uploadStream)
         .on('error', (error) => {
            console.log("ERROR:", error.message);
            res.status(500).send(error.message);
         })
         .on('finish', async () => {
            const answer = new SpeakingAnswer({
               speakingID: ids,
               filename: filename
            });
            await answer.save();
            res.send({ data: answer._id });
         });
   }

   async answer(req, res) {
      try {
         const file = await getAudioGFS().files.findOne({ filename: req.params.filename });
         const readStream = getAudioBucket().openDownloadStream(file._id);
         res.type('audio/mpeg')
         readStream.pipe(res);
      } catch (error) {
         console.log("error: ", error);
         res.send("ERROR");
      }

   }
}
module.exports = new SpeakingController()