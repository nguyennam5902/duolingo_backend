const mongoose = require('mongoose');

const Task = mongoose.model('Task', new mongoose.Schema({
   type: Number,
   text: String
}))
module.exports = Task