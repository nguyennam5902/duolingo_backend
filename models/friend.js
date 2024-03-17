const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { Schema } = mongoose;
const friendSchema = new Schema({
   userID: ObjectId,
   following: [ObjectId],
   followers: [ObjectId]
});
module.exports = mongoose.model("friend", friendSchema);