const ChoiceQuestion = require("../models/choiceQuestion")
const Listening = require("../models/listening")
const Reading = require("../models/reading")
const Speaking = require("../models/speaking")
const Task = require("../models/task")
const TestAnswer = require("../models/testAnswer")

class TestController {
   async search(req, res) {
      const userID = req.params.userID
      try {
         const tests = await TestAnswer.find({ userID: userID }).select('_id createdAt').sort({ createdAt: -1 })
         res.send({ data: tests })
      } catch (err) {
         console.log("ERROR:", err)
         res.send({ data: [] })
      }
   }

   async detail(req, res) {
      const id = req.params.id
      try {
         const test = await TestAnswer.findById(id).populate(['listeningAnswerID', 'readingAnswerID', 'taskAnswerID', 'speakingAnswerID']).select('-__v').lean(true)
         if (test == null) {
            return res.send({ data: {} })
         }
         test.listeningAnswerID.listeningID = await Listening.findById(test.listeningAnswerID.listeningID).select('-__v').lean(true)
         test.listeningAnswerID.listeningID.fileID = (await getGFS().files.findOne({ _id: test.listeningAnswerID.listeningID.fileID })).filename
         const questions = test.listeningAnswerID.listeningID.questions.map(id => id.toString())
         for (let i = 0; i < questions.length; i++) {
            questions[i] = await ChoiceQuestion.findById(questions[i]).select('-_id -__v').lean(true)
         }
         test.listeningAnswerID.listeningID.questions = questions

         for (let i = 0; i < test.readingAnswerID.readingID.length; i++) {
            const id = test.readingAnswerID.readingID[i]
            test.readingAnswerID.readingID[i] = await Reading.findById(id).populate(['questions']).select('-_id -__v')
         }

         for (let i = 0; i < test.taskAnswerID.length; i++) {
            test.taskAnswerID[i].taskID = await Task.findById(test.taskAnswerID[i].taskID).select('-_id -__v').lean(true)
         }

         test.speakingAnswerID.audioData = null
         for (let i = 0; i < test.speakingAnswerID.speakingID.length; i++) {
            test.speakingAnswerID.speakingID[i] = await Speaking.findById(test.speakingAnswerID.speakingID[i]).select('-_id -__v').lean(true)
         }

         res.send({ data: test })
      } catch (err) {
         console.log("ERROR:", err)
         res.send({ data: {}, error: err.toString() })
      }
   }

   async submit(req, res) {
      const test = new TestAnswer({
         listeningAnswerID: req.body.listeningAnswerID,
         readingAnswerID: req.body.readingAnswerID,
         taskAnswerID: req.body.taskAnswerID,
         speakingAnswerID: req.body.speakingAnswerID,
         userID: req.body.userID
      })
      await test.save()
      res.send({ data: test._id })
   }
}
module.exports = new TestController()