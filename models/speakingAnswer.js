const mongoose = require('mongoose');

const SpeakingAnswer = mongoose.model('speaking_answers', new mongoose.Schema({
   speakingID: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Speaking' }],
   audioData: Buffer,
   score: { type: Number, default: -1 }
}))
module.exports = SpeakingAnswer