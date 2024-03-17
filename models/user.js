const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const History = require('./history');

const userSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      min: 6,
      max: 64,
    },
    weekScore: {
      type: Number,
      default: 0,
    },
  },
  {
    methods: {
      /**
       * Get user's total score
       * @returns {Promise<number>} 
       */
      async getTotalScore() {
        const histories = await History.find({ userID: this._id }).exec();
        var sum = 0;
        for (let i = 0; i < histories.length; i++) {
          const history = histories[i];
          sum += history.point;
        }
        return sum;
      }
    }
  },

  { timestamps: true }
);

module.exports = model("User", userSchema);
