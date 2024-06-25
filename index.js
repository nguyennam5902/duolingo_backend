const multer = require('multer');
const { connect, getGFS, getBucket } = require('./config/db')
const route = require('./routes');
const express = require("express");
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require("cookie-parser");
const { GridFsStorage } = require('multer-gridfs-storage');

const BaseResponse = require("./utils/baseResponse");
const session = require('cookie-session');
const fs = require('fs');
const User = require('./models/user');
const ChoiceQuestion = require('./models/choiceQuestion');
const { default: mongoose } = require('mongoose');
const Friend = require('./models/friend');
const Listening = require('./models/listening');
const Image = require('./models/image');
const ListeningAnswer = require('./models/listeningAnswer');
const ReadingAnswer = require('./models/readingAnswer');
const Reading = require('./models/reading');
const Task = require('./models/task');
const TaskAnswer = require('./models/taskAnswer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

connect()
// const audioStorage = new GridFsStorage({
//   url: 'mongodb://127.0.0.1:27017/duolingo',
//   file: (req, file) => {
//     return {
//       bucketName: 'uploads',
//       filename: file.originalname
//     };
//   }
// });
// const audioUpload = multer({ audioStorage });

const app = express();

app.disable('etag')
app.use(cors());
app.use(express.json({ limit: "500mb" })); // limiting the request body size to 500MB
app.use(cookieParser());
app.use(morgan("dev"));
app.use(morgan('combined'));
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

app.get('/api/tasks', async (req, res) => {
  const t0 = await Task.aggregate([{ $match: { type: 1 } }, { $sample: { size: 1 } }]).exec();
  const t1 = await Task.aggregate([{ $match: { type: 2 } }, { $sample: { size: 1 } }]).exec();
  res.send({
    data: [t0[0], t1[0]]
  })
})

app.post('/api/task/submit', async (req, res) => {
  const body = req.body;
  const taskID = body.taskID;
  const userID = body.userID;
  const content = body.content;
  const newAnswer = new TaskAnswer({
    taskID,
    userID,
    answer: content
  });
  await newAnswer.save()
  res.send({ data: newAnswer._id });
})

app.get('/api/reading/', async (req, res) => {
  const readingsUp = await Reading.aggregate([{ $sample: { size: 4 } }]).exec();
  const readingsDown = await Reading.populate(readingsUp, { path: "questions" })
  res.send({
    data: readingsDown
  })
})

app.get('/api/choice-questions/:id', async (req, res) => {
  const q = await ChoiceQuestion.findById(req.params.id).select('-_id -__v').lean()
  res.send({ data: q })
})

app.post('/api/reading/submit', async (req, res) => {
  const readingIDs = req.body.readingIDs;
  const userID = req.body.userID;
  const choices = req.body.choices;
  const score = req.body.score;
  const readingAnswer = new ReadingAnswer({
    userID: userID,
    readingID: [...readingIDs].map(id => new mongoose.Types.ObjectId(id)),
    choices: choices,
    score: score
  })
  await readingAnswer.save()
  res.send({
    data: readingAnswer._id
  });
})

app.get('/api/listen/', async (req, res) => {
  const doc = (await Listening.aggregate([{ $sample: { size: 1 } }]).exec());
  const docPopulated = await Listening.populate(doc, { path: 'questions' });
  const file = await getGFS().files.findOne({ _id: docPopulated[0].fileID });
  res.send({
    filename: file.filename,
    data: docPopulated[0]
  })
})

app.post(`/api/listen/submit/`, async (req, res) => {
  const listeningID = req.body.listeningID;
  const userID = req.body.userID;
  const choices = req.body.choices;
  const score = req.body.score;
  const listeningAnswer = new ListeningAnswer({
    userID: userID,
    listeningID: listeningID,
    choices: choices,
    score: score
  })
  await listeningAnswer.save();
  res.send({
    data: listeningAnswer._id
  })
})

app.get('/api/audio/:filename', async (req, res) => {
  try {
    const file = await getGFS().files.findOne({ filename: req.params.filename });
    const readStream = getBucket().openDownloadStream(file._id);
    res.type('audio/mpeg')
    readStream.pipe(res);
  } catch (error) {
    console.log(error);
    res.send("ERROR");
  }
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
      const followingData = []
      for (let i = 0; i < userFriend?.following.length ?? 0; i++) {
        const tmp = await User.findById(userFriend.following[i]).select('-password').exec();
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

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
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

app.listen(app.get('port'), () => {
  console.log(`Node app is running on port ${app.get('port')}`);
});