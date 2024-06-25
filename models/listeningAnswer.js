const mongoose = require('mongoose');

const ListeningAnswer = mongoose.model('listening_answer', new mongoose.Schema({
   listeningID: { type: mongoose.Schema.Types.ObjectId, ref: 'listening' },
   choices: Array,
   score: { type: Number, default: -1 }
}))

module.exports = ListeningAnswer;