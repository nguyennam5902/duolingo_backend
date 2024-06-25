const mongoose = require('mongoose');

const TestAnswer = mongoose.model('test_answers', new mongoose.Schema({
   listeningAnswerID: { type: mongoose.Schema.Types.ObjectId, ref: 'listening_answer' },
   readingAnswerID: { type: mongoose.Schema.Types.ObjectId, ref: 'reading_answer' },
   taskAnswerID: [{ type: mongoose.Schema.Types.ObjectId, ref: 'task_answer' }],
   speakingAnswerID: { type: mongoose.Schema.Types.ObjectId, ref: 'speaking_answers' },
   userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }))
module.exports = TestAnswer