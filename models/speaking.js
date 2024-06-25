const mongoose = require('mongoose');

const Speaking = mongoose.model('Speaking', new mongoose.Schema({
   part: Number,
   text: String
}))
module.exports = Speaking