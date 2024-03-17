const db = require('./config/db');
const route = require('./routes');
const express = require("express");
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require("cookie-parser");
const csrf = require("csurf");
const BaseResponse = require("./utils/baseResponse");
const app = express();
const session = require('express-session');
const fs = require('fs');
const User = require('./models/user');
const multer = require('multer');
const { Schema, default: mongoose } = require('mongoose');
const Friend = require('./models/friend');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const Image = mongoose.model('Image', new Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: String,
  data: Buffer,
  contentType: String
}));

db.connect();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use(morgan('combined'));
app.use(express.json());

app.use(session({
  secret: 'sJuVEoVwZajx8UoKyjCxXCkwQRFxvncxPJSVUsnUldiBlen8Ig',
  resave: false,
  saveUninitialized: true
}));

const port = process.env.PORT || 3000

app.set('port', port);

route(app);

app.get('/', (req, res) => {
  res.send(BaseResponse.ofSucceed(null));
});

app.get('/api/user/progress/:userID/:courseID', require('./routes/api/progress'));
app.get('/api/user/:userID/', async (req, res) => {
  try {
    const userID = String(req.params.userID);
    const user = await User.findById(userID).exec();
    if (user == null) {
      res.send(BaseResponse.ofError("User not found", 404))
    } else {
      var sum = await user.getTotalScore();
      const userFriend = await Friend.findOne({ userID: user._id }).exec();
      console.log(userFriend);
      const followingData = []
      for (let i = 0; i < userFriend?.following.length ?? 0; i++) {
        const tmp = await User.findById(userFriend.following[i]).select('-password').exec();
        console.log(i, userFriend.following[i]);
        followingData.push({
          _id: tmp._id,
          name: tmp.name,
          totalScore: await tmp.getTotalScore()
        });
      }
      const followersData = []
      for (let i = 0; i < userFriend?.followers.length ?? 0; i++) {
        const tmp = await User.findById(userFriend.followers[i]).select('-password').exec();
        followersData.push({
          _id: tmp._id,
          name: tmp.name,
          totalScore: await tmp.getTotalScore()
        });
      }
      res.send(BaseResponse.ofSucceed({
        name: user.name,
        email: user.email,
        weekScore: user.weekScore,
        totalScore: sum,
        following: followingData,
        followers: followersData
      }))
    }
  } catch (error) {
    console.log(error);
    res.send(BaseResponse.ofError("Invalid parameter", 404))
  }
});
app.get('/api/user/search/:username', async (req, res) => {
  const username = String(req.params.username);
  const users = await User.find({
    name: {
      $regex: "^" + username + ".*",
      $options: 'i' // for case insensitive search
    }
  }).select('-password -__v').exec();
  const result = []
  for (const user of users) {
    result.push({
      _id: user._id,
      name: user.name
    })
  }
  res.send(BaseResponse.ofSucceed(result));
});

app.post('/api/follow/', async (req, res) => {
  try {
    const userID = req.body.userID;
    const friendID = req.body.friendID;
    const userFriend = await Friend.findOne({ userID: new mongoose.Types.ObjectId(userID) }).exec();
    const friendFriend = await Friend.findOne({ userID: new mongoose.Types.ObjectId(friendID) }).exec();
    console.log("USER:", userFriend?._id, "\nFRIEND: ", friendFriend?._id);
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
});

app.delete('/api/follow/', async (req, res) => {
  try {
    const userID = req.body.userID;
    const friendID = req.body.friendID;
    console.log(userID);
    // console.log(friendID);
    console.log(req.body);
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
        console.log(userFriend.following);
      }
    }
    res.send(BaseResponse.ofSucceed(null));
  } catch (error) {
    console.log(error);
    res.send(BaseResponse.ofError("Invalid parameter", 404))
  }
})

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    // const imagePath = req.file.path;
    const userID = req.body.userID;
    // Update the user document with the image path
    const image = await Image.findOne({ userID: userID }).exec();
    if (image == null) {
      // const newImage = new Image({ userID: userID, image: imagePath });
      const newImage = new Image({
        userID: userID,
        name: req.file.originalname,
        data: req.file.buffer,
        contentType: req.file.mimetype
      });
      await newImage.save().catch(err => console.log(err))
    } else {
      // image.image = imagePath;
      image.name = req.file.originalname;
      image.data = req.file.buffer;
      image.contentType = req.file.mimetype;
      await image.save().catch((err) => console.error(err));
    }
    res.send(BaseResponse.ofSucceed(null));
  } catch (error) {
    console.error('Error updating user with image:', error);
    res.send(BaseResponse.ofError("ERROR", 404));
  }
});

app.get('/api/image/:userID', async (req, res) => {
  try {
    const image = await Image.findOne({ userID: req.params.userID });
    if (!image) {
      res.set('Content-Type', 'image/jpeg');
      res.send(fs.readFileSync('default_avatar.jpg'));
    }
    else {
      res.set('Content-Type', image.contentType);
      res.send(image.data);
    }
  } catch (err) {
    console.error(err);
    // res.status(500).send('Error retrieving image');
    res.set('Content-Type', 'image/jpeg');
    res.send(fs.readFileSync('default_avatar.jpg'));
  }
});

app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.listen(app.get('port'), () => {
  console.log(`Node app is running on port ${app.get('port')}`);
});