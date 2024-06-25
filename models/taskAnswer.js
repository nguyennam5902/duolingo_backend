const mongoose = require('mongoose');

const TaskAnswer = mongoose.model('task_answer', new mongoose.Schema({
   taskID: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
   answer: String,
   score: { type: Number, default: -1 }
}))
module.exports = TaskAnswer