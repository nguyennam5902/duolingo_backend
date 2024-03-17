const Course = require("../models/course");
const Part = require("../models/part");
const BaseResponse = require("../utils/baseResponse");

module.exports = async (courseId) => {
   try {
      const course = await Course.findOne({
         courseID: courseId
      }).exec();
      const partsData = [];
      if (course == null) {
         return BaseResponse.ofError('Course not found', 404);
      } else {
         const partsID = course.parts;
         for (const parts of partsID) {
            const tmp = await Part.findById(parts).exec();
            partsData.push(tmp);
         }
         return BaseResponse.ofSucceed(partsData);
      }
   } catch (e) {
      return BaseResponse.ofError('Invalid parameter', 404);
   }
}