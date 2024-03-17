const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

const Listening = mongoose.model('listening', new mongoose.Schema({
   fileID: {
      type: ObjectId,
      ref: "upload.files"
   },
   questions: [{ type: ObjectId, ref: 'choice_question' }]
}));
module.exports = Listening;