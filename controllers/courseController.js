const Course = require("../models/course");
const partsAPI = require('../middlewares/part');
const BaseResponse = require("../utils/baseResponse");

class CourseController {
   async courses(_req, res) {
      const courses = await Course.find({}).exec();
      res.send(BaseResponse.ofSucceed(courses));
   }
   async parts(req, res) {
      res.send(await partsAPI(req.params.courseId));
   }
}
module.exports = new CourseController();