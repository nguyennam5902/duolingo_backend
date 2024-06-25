const mongoose = require('mongoose');

const ReadingAnswer = mongoose.model('reading_answer', new mongoose.Schema({
   readingID: [{ type: mongoose.Schema.Types.ObjectId, ref: 'reading' }],
   choices: Array,
   score: { type: Number, default: -1 }
}))
module.exports = ReadingAnswer