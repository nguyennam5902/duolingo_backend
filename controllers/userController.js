const User = require('../models/user');
const cron = require('node-cron');
const BaseResponse = require('../utils/baseResponse');
const Friend = require('../models/friend');
const mongoose = require('mongoose');

class UserController {
    async getWeekScore(req, res) {
        try {
            const user = await User.findById(req.user._id).select("-password").exec();
            return res.status(200).send(BaseResponse.ofSucceed({
                "user_id": user._id,
                "week_score": user.weekScore
            }));
        } catch (err) {
            console.log(err);
            return res.status(400).send(BaseResponse.ofError(err))
        }
    };

    async updateWeekScore(req, res) {
        try {
            const user = await User.findById(req.user_id).select("-password").exec();
            user.weekScore = user.weekScore + req.score;
            await user.save();
            return res.status(200).send(BaseResponse.ofSucceed({
                "user_id": user._id,
                "week_score": user.weekScore
            }));
        } catch (err) {
            return res.status(400).send(BaseResponse.ofError(err))
        }
    }

    async addScore(req, res) {
        try {
            const { id, score } = req.body;

            if (!score || isNaN(score)) {
                return res.status(400).json({ error: 'Invalid score provided' });
            }

            const user = await User.findById(id).exec();

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            user.weekScore += parseFloat(score);
            await user.save();

            return res.json(user);
        } catch (err) {
            console.error('Error adding score:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };

    async userData(req, res) {
        try {
            const user = await User.findById(req.user._id).select("-password").exec();
            console.log("CURRENT_USER", user);
            return res.json(user);
        } catch (err) {
            console.log(err);
        }
    };
    
    async follow(req, res) {
        try {
            const userID = req.body.userID;
            const friendID = req.body.friendID;
            const userFriend = await Friend.findOne({ userID: new mongoose.Types.ObjectId(userID) }).exec();
            const friendFriend = await Friend.findOne({ userID: new mongoose.Types.ObjectId(friendID) }).exec();
            if (!userFriend) {
                const newFriend = new Friend({
                    userID: userID,
                    following: [friendID],
                    followers: []
                });
                newFriend.save();
            } else {
                if (!userFriend.following.includes(friendID)) {
                    userFriend.following.push(friendID);
                    userFriend.save();
                }
            }
            if (!friendFriend) {
                const newFriend = new Friend({
                    userID: friendID,
                    following: [],
                    followers: [userID]
                });
                newFriend.save();
            } else {
                if (!friendFriend.followers.includes(userID)) {
                    friendFriend.followers.push(userID);
                    friendFriend.save();
                }
            }
            res.send(BaseResponse.ofSucceed(null));
        } catch (error) {
            console.log(error);
            res.send(BaseResponse.ofError("Invalid parameter", 404))
        }
    }

    async unfollow(req, res) {
        try {
            const userID = req.body.userID;
            const friendID = req.body.friendID;
            const userFriend = await Friend.findOne({ userID: new mongoose.Types.ObjectId(userID) }).exec();
            const friendFriend = await Friend.findOne({ userID: new mongoose.Types.ObjectId(friendID) }).exec();
            if (userFriend) {
                if (userFriend.following.includes(friendID)) {
                    Friend.findOneAndUpdate({ userID: userID },
                        { $pull: { following: friendID } },
                        { new: true },
                    ).catch((e) => console.error('Error: ', e));
                }
            }
            if (friendFriend) {
                if (friendFriend.followers.includes(userID)) {
                    Friend.findOneAndUpdate({ userID: friendID },
                        { $pull: { followers: userID } },
                        { new: true },
                    ).catch((e) => console.error('Error: ', e));
                }
            }
            res.send(BaseResponse.ofSucceed(null));
        } catch (error) {
            console.log(error);
            res.send(BaseResponse.ofError("Invalid parameter", 404))
        }
    }
    constructor() {
        cron.schedule('0 0 * * 1', async () => {
            try {
                const users = await User.find().exec();

                for (const user of users) {
                    user.weekScore = 0;
                    await user.save();
                }

                console.log('Week scores reset successfully.');
            } catch (err) {
                console.error('Error resetting week scores:', err);
            }
        });
    }
}

module.exports = new UserController();
