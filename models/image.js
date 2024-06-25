const mongoose = require('mongoose');
const { Schema } = mongoose;

const Image = mongoose.model('Image', new Schema({
   userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
   },
   name: String,
   data: Buffer,
   contentType: String
}));
module.exports = Image;