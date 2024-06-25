const languagesRouter = require('./api/languages');
const authRouter = require('./api/user');
const courseRouter = require('./api/courses');
const userRouter = require('./api/profile');
const leaderBoardRouter = require('./api/leaderboard');
const questionRouter = require('./api/question');
const scoringRouter = require('./api/scoring');
const speakingRouter = require('./api/speaking');
const followRouter = require('./api/follow');
const testRouter = require('./api/test');

function route(app) {
    app.use('/api/languages/', languagesRouter);
    app.use('/api/courses/', courseRouter);
    app.use('/api/profile', userRouter);
    app.use('/api/leaderboard', leaderBoardRouter);
    app.use('/api/question', questionRouter);
    app.use('/api', authRouter);
    app.use('/api/scoring/', scoringRouter);
    app.use('/api/speaking/', speakingRouter);
    app.use('/api/follow/', followRouter)
    app.use('/api/test/', testRouter)
}

module.exports = route;