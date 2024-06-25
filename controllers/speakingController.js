const mongoose = require('mongoose');
const Speaking = require("../models/speaking");
const SpeakingAnswer = require("../models/speakingAnswer");

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
      const answer = new SpeakingAnswer({
         speakingID: ids.map(id => new mongoose.Types.ObjectId(id)),
         userID: new mongoose.Types.ObjectId(req.body.userID),
         audioData: buffer
      })
      answer.save()
      res.send({ data: answer._id });
   }

   async answer(req, res) {
      try {
         const audioData = await SpeakingAnswer.findById(req.params.id).exec();
         if (!audioData) {
            return res.status(404).send('Audio not found');
         }

         const audioBuffer = audioData.audioData;
         const fileSize = audioBuffer.length;

         const range = req.headers.range
         if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            const chunksize = (end - start) + 1;

            res.writeHead(206, {
               'Content-Range': `bytes ${start}-${end}/${fileSize}`,
               'Accept-Ranges': 'bytes',
               'Content-Length': chunksize,
               'Content-Type': 'audio/wav'
            });

            res.end(audioBuffer.slice(start, end + 1), 'binary');
            // console.log(`START:${start},END:${end},SIZE:${fileSize}`);
         } else {
            res.writeHead(200, {
               'Content-Length': fileSize,
               'Content-Type': 'audio/wav'
            });
            res.end(audioBuffer, 'binary');
         }
      } catch (error) {
         console.error(error);
         res.status(500).send('Internal Server Error');
      }
   }
}
module.exports = new SpeakingController()