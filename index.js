const multer = require('multer');
const db = require('./config/db');
const route = require('./routes');
const express = require("express");
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require("cookie-parser");
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const path = require('path');
const { ObjectId } = require("mongodb");

const BaseResponse = require("./utils/baseResponse");
const session = require('cookie-session');
const fs = require('fs');
const User = require('./models/user');
const ChoiceQuestion = require('./models/choiceQuestion');
const { Schema, default: mongoose } = require('mongoose');
const Friend = require('./models/friend');
const Listening = require('./models/listening');
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
const conn = mongoose.connection;
let gfs, gridfsBucket;
conn.once('open', () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'uploads'
  });
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
})
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
const Reading = mongoose.model('reading', new mongoose.Schema({
  text: String,
  questions: [{ type: ObjectId, ref: 'choice_question' }]
}))
const ReadingAnswer = mongoose.model('reading_answer', new mongoose.Schema({
  readingID: [{ type: ObjectId, ref: 'reading' }],
  choices: Array,
  score: { type: Number, default: -1 }
}, { timestamps: true }))
const ListeningAnswer = mongoose.model('listening_answer', new mongoose.Schema({
  listeningID: { type: ObjectId, ref: 'listening' },
  choices: Array,
  score: { type: Number, default: -1 }
}, { timestamps: true }))
const Task = mongoose.model('Task', new mongoose.Schema({
  type: Number,
  text: String
}))
const TaskAnswer = mongoose.model('task_answer', new mongoose.Schema({
  taskID: { type: ObjectId, ref: 'Task' },
  answer: String,
  score: { type: Number, default: -1 }
}, { timestamps: true }))
const Speaking = mongoose.model('Speaking', new mongoose.Schema({
  part: Number,
  text: String
}))

const SpeakingAnswer = mongoose.model('speaking_answers', new mongoose.Schema({
  speakingID: [{ type: ObjectId, ref: 'Speaking' }],
  audioData: Buffer,
  score: { type: Number, default: -1 }
}, { timestamps: true }))

const TestAnswer = mongoose.model('test_answers', new mongoose.Schema({
  listeningAnswerID: { type: ObjectId, ref: 'listening_answer' },
  readingAnswerID: { type: ObjectId, ref: 'reading_answer' },
  taskAnswerID: [{ type: ObjectId, ref: 'task_answer' }],
  speakingAnswerID: { type: ObjectId, ref: 'speaking_answers' },
  userID: { type: ObjectId, ref: 'User' },
}, { timestamps: true }))

app.post('/api/test', async (req, res) => {
  const test = new TestAnswer({
    listeningAnswerID: req.body.listeningAnswerID,
    readingAnswerID: req.body.readingAnswerID,
    taskAnswerID: req.body.taskAnswerID,
    speakingAnswerID: req.body.speakingAnswerID,
    userID: req.body.userID
  })
  await test.save()
  res.send({ data: test._id })
})

app.get('/api/test/search/:userID', async (req, res) => {
  const userID = req.params.userID
  try {
    const tests = await TestAnswer.find({ userID: userID }).select('_id createdAt').sort({ createdAt: -1 })
    res.send({
      data: tests
    })
  } catch (err) {
    console.log("ERROR:", err)
    res.send({ data: [] })
  }
})

app.get('/api/view-test/:id', async (req, res) => {
  const id = req.params.id
  try {
    const test = await TestAnswer.findById(id).populate(['listeningAnswerID', 'readingAnswerID', 'taskAnswerID', 'speakingAnswerID']).select('-__v').lean(true)
    if (test == null) {
      return res.send({ data: {} })
    }
    test.listeningAnswerID.listeningID = await Listening.findById(test.listeningAnswerID.listeningID).select('-__v').lean(true)
    test.listeningAnswerID.listeningID.fileID = (await gfs.files.findOne({ _id: test.listeningAnswerID.listeningID.fileID })).filename
    const questions = test.listeningAnswerID.listeningID.questions.map(id => id.toString())
    for (let i = 0; i < questions.length; i++) {
      questions[i] = await ChoiceQuestion.findById(questions[i]).select('-_id -__v').lean(true)
    }
    test.listeningAnswerID.listeningID.questions = questions

    for (let i = 0; i < test.readingAnswerID.readingID.length; i++) {
      const id = test.readingAnswerID.readingID[i]
      test.readingAnswerID.readingID[i] = await Reading.findById(id).populate(['questions']).select('-_id -__v')
    }

    for (let i = 0; i < test.taskAnswerID.length; i++) {
      test.taskAnswerID[i].taskID = await Task.findById(test.taskAnswerID[i].taskID).select('-_id -__v').lean(true)
    }

    test.speakingAnswerID.audioData = null
    for (let i = 0; i < test.speakingAnswerID.speakingID.length; i++) {
      test.speakingAnswerID.speakingID[i] = await Speaking.findById(test.speakingAnswerID.speakingID[i]).select('-_id -__v').lean(true)
    }

    res.send({ data: test })
  } catch (err) {
    console.log("ERROR:", err)
    res.send({ data: {}, error: err.toString() })
  }
})

app.get('/api/scoring/listening/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const listeningAnswer = await ListeningAnswer.findById(id).populate(['listeningID']).select('-_id -__v').lean(true).exec()
    if (listeningAnswer != null) {
      listeningAnswer.listeningID.fileID = (await gfs.files.findOne({ _id: listeningAnswer.listeningID.fileID })).filename
    }
    // console.log(listeningAnswer.score);
    res.send({
      data: listeningAnswer
    })
  } catch (e) {
    res.send({ data: {} })
  }
})

app.get('/api/scoring/reading/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const readingAnswer = await ReadingAnswer.findById(id).select('-__v').populate(['readingID'])
    // console.log(readingAnswer);
    res.send({
      data: readingAnswer
    })
  } catch (e) {
    res.send({ data: {} })
  }
})

app.get('/api/scoring/writing/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const taskAnswer = await TaskAnswer.findById(id).select('-__v').populate(['taskID'])
    res.send({
      data: taskAnswer
    })
  } catch (e) {
    res.send({ data: {} })
  }
})

app.post('/api/scoring/writing/', async (req, res) => {
  const id = req.body.id;
  const score = req.body.score;
  try {
    const taskAnswer = await TaskAnswer.findById(id)
    taskAnswer.score = score;
    taskAnswer.save()
    res.send({
      data: taskAnswer._id
    })
  } catch (e) {
    res.send({ data: {} })
  }
})

app.get('/api/scoring/speaking/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const speakingAnswer = await SpeakingAnswer.findById(id).select('-__v -audioData').populate(['speakingID'])
    res.send({
      data: speakingAnswer
    })
  } catch (e) {
    res.send({ data: {} })
  }
})

app.post('/api/scoring/speaking/', async (req, res) => {
  const id = req.body.id;
  const score = req.body.score;
  try {
    const speakingAnswer = await SpeakingAnswer.findById(id)
    speakingAnswer.score = score
    speakingAnswer.save()
    res.send({
      data: speakingAnswer._id
    })
  } catch (e) {
    res.send({ data: {} })
  }
})

app.get('/api/scoring/student/:id', async (req, res) => {
  if (String(req.params.id).length != 8) {
    return res.send({
      data: {}
    })
  }
  const id = String(req.params.id).slice(-6);
  const emailRegex = new RegExp(`${id}@sis.hust.edu.vn$`, 'i');
  const user = await User.findOne({ email: emailRegex }).exec();
  const result = {}
  const l = [], r = [], w = [], s = []
  if (user) {
    const testAnswers = await TestAnswer.find({ userID: user._id }).exec()
    for (let i = 0; i < testAnswers.length; i++) {
      let listeningAnswer = await ListeningAnswer.findById(testAnswers[i].listeningAnswerID).populate(['listeningID'])
        .select('-__v').sort({ createdAt: -1 }).lean(true)
      listeningAnswer.listeningID.filename = (await gfs.files.findOne({ _id: listeningAnswer.listeningID.fileID })).filename
      console.log(listeningAnswer);
      l.push(listeningAnswer)

      let readingAnswer = await ReadingAnswer.findById(testAnswers[i].readingAnswerID).select('-__v').populate(['readingID'])
      r.push(readingAnswer)

      for (let j = 0; j < testAnswers[i].taskAnswerID.length; j++) {
        let writingAnswer = await TaskAnswer.findById(testAnswers[i].taskAnswerID[j]).select('-__v').populate(['taskID'])
        w.push(writingAnswer)
      }

      const speakingAnswer = await SpeakingAnswer.findById(testAnswers[i].speakingAnswerID).select('-__v -audioData').populate(['speakingID'])
      s.push(speakingAnswer)
    }
  }
  result.l = l
  result.r = r
  result.w = w
  result.s = s
  res.send({
    data: result
  })
})

app.get('/api/speaking/', async (req, res) => {
  try {
    const result = []
    for (let i = 1; i < 4; i++) {
      let tmp = await Speaking.aggregate([{ $match: { part: i } }, { $sample: { size: 1 } }]).exec();
      // console.log(tmp);
      result.push(tmp[0]);
    }
    res.send(result);
  } catch (err) {
    console.log(err);
    res.send('ERROR');
  }
})

app.post('/api/speaking/upload/', async (req, res) => {
  const ids = req.body.parts;
  const buffer = Buffer.from(req.body.file.data)
  const answer = new SpeakingAnswer({
    speakingID: ids.map(id => new mongoose.Types.ObjectId(id)),
    userID: new mongoose.Types.ObjectId(req.body.userID),
    audioData: buffer
  })
  answer.save()
  res.send({ data: answer._id });
})

app.get('/api/speaking/answers/:id', async (req, res) => {
  try {
    const audioData = await SpeakingAnswer.findById(req.params.id).exec();
    if (!audioData) {
      return res.status(404).send('Audio not found');
    }

    const audioBuffer = audioData.audioData;
    const fileSize = audioBuffer.length;

    const range = req.headers.range
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/wav'
      });

      res.end(audioBuffer.slice(start, end + 1), 'binary');
      console.log(`START:${start},END:${end},SIZE:${fileSize}`);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/wav'
      });
      res.end(audioBuffer, 'binary');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
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
  const file = await gfs.files.findOne({ _id: docPopulated[0].fileID });
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
    const file = await gfs.files.findOne({ filename: req.params.filename });
    const readStream = gridfsBucket.openDownloadStream(file._id);
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

app.post('/api/follow/', async (req, res) => {
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
});

app.delete('/api/follow/', async (req, res) => {
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
})

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

app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.listen(app.get('port'), () => {
  console.log(`Node app is running on port ${app.get('port')}`);
});