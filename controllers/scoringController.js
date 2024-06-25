const { getGFS } = require("../config/db");
const ListeningAnswer = require("../models/listeningAnswer");
const ReadingAnswer = require("../models/readingAnswer");
const SpeakingAnswer = require("../models/speakingAnswer");
const TaskAnswer = require("../models/taskAnswer");
const TestAnswer = require("../models/testAnswer");
const User = require('../models/user')

class ScoringController {
   async search(req, res) {
      if (String(req.params.id).length != 8) {
         return res.send({
            data: {}
         })
      }
      const id = String(req.params.id).slice(-6);
      const emailRegex = new RegExp(`${id}@sis.hust.edu.vn$`, 'i');
      const user = await User.findOne({ email: emailRegex }).exec();
      const result = {}
      const l = [], r = [], w = [], s = []
      if (user) {
         const testAnswers = await TestAnswer.find({ userID: user._id }).exec()
         for (let i = 0; i < testAnswers.length; i++) {
            let listeningAnswer = await ListeningAnswer.findById(testAnswers[i].listeningAnswerID).populate(['listeningID'])
               .select('-__v').sort({ createdAt: -1 }).lean(true)
            listeningAnswer.listeningID.filename = (await getGFS().files.findOne({ _id: listeningAnswer.listeningID.fileID })).filename
            listeningAnswer.createdAt = testAnswers[i].createdAt
            l.push(listeningAnswer)

            let readingAnswer = await ReadingAnswer.findById(testAnswers[i].readingAnswerID).select('-__v').populate(['readingID']).lean(true)
            readingAnswer.createdAt = testAnswers[i].createdAt
            r.push(readingAnswer)

            for (let j = 0; j < testAnswers[i].taskAnswerID.length; j++) {
               let writingAnswer = await TaskAnswer.findById(testAnswers[i].taskAnswerID[j]).select('-__v').populate(['taskID']).lean(true)
               writingAnswer.createdAt = testAnswers[i].createdAt
               w.push(writingAnswer)
            }

            const speakingAnswer = await SpeakingAnswer.findById(testAnswers[i].speakingAnswerID).select('-__v -audioData').populate(['speakingID']).lean(true)
            speakingAnswer.createdAt = testAnswers[i].createdAt
            s.push(speakingAnswer)
         }
      }
      result.l = l
      result.r = r
      result.w = w
      result.s = s
      res.send({
         data: result
      })

   }

   async listening(req, res) {
      const id = req.params.id;
      try {
         const listeningAnswer = await ListeningAnswer.findById(id).populate(['listeningID']).select('-_id -__v').lean(true).exec()
         if (listeningAnswer != null) {
            listeningAnswer.listeningID.fileID = (await getGFS().files.findOne({ _id: listeningAnswer.listeningID.fileID })).filename
         }
         res.send({
            data: listeningAnswer
         })
      } catch (e) {
         res.send({ data: {} })
      }

   }
   async reading(req, res) {
      const id = req.params.id;
      try {
         const readingAnswer = await ReadingAnswer.findById(id).select('-__v').populate(['readingID'])
         res.send({
            data: readingAnswer
         })
      } catch (e) {
         res.send({ data: {} })
      }
   }
   async writing(req, res) {
      const id = req.params.id;
      try {
         const taskAnswer = await TaskAnswer.findById(id).select('-__v').populate(['taskID'])
         res.send({
            data: taskAnswer
         })
      } catch (e) {
         res.send({ data: {} })
      }
   }
   async submitWriting(req, res) {
      const id = req.body.id;
      const score = req.body.score;
      try {
         const taskAnswer = await TaskAnswer.findById(id)
         taskAnswer.score = score;
         taskAnswer.save()
         res.send({
            data: taskAnswer._id
         })
      } catch (e) {
         res.send({ data: {} })
      }
   }
   async speaking(req, res) {
      const id = req.params.id;
      try {
         const speakingAnswer = await SpeakingAnswer.findById(id).select('-__v -audioData').populate(['speakingID'])
         res.send({
            data: speakingAnswer
         })
      } catch (e) {
         res.send({ data: {} })
      }
   }
   async submitSpeaking(req, res) {
      const id = req.body.id;
      const score = req.body.score;
      try {
         const speakingAnswer = await SpeakingAnswer.findById(id)
         speakingAnswer.score = score
         speakingAnswer.save()
         res.send({
            data: speakingAnswer._id
         })
      } catch (e) {
         res.send({ data: {} })
      }
   }
}
module.exports = new ScoringController()