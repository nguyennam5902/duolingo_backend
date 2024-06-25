const mongoose = require('mongoose');

const Reading = mongoose.model('reading', new mongoose.Schema({
   text: String,
   questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'choice_question' }]
}))
module.exports = Reading