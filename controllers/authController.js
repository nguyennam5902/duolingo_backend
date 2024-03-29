const User = require("../models/user");
const auth_utils = require("../utils/auth");
const jwt = require("jsonwebtoken");
const BaseResponse = require("../utils/baseResponse");

class AuthController {

    async register(req, res) {
        try {
            // console.log(req.body);
            const { name, email, password } = req.body;
            // validation
            if (!name) return res.send(BaseResponse.ofError("Name is required", 400));
            if (!password || password.length < 6) {
                return res.send(BaseResponse.ofError("Password is required and should be min 6 characters long", 400));
            }
            let userExist = await User.findOne({ email }).exec();
            if (userExist) return res.send(BaseResponse.ofError("Email is taken", 400));

            // hash password
            const hashedPassword = await auth_utils.hashPassword(password);

            // register
            const user = new User({
                name,
                email,
                password: hashedPassword,
            });
            await user.save();
            return res.json(BaseResponse.ofSucceed(user));
        } catch (err) {
            console.log(err);
            return res.send(BaseResponse.ofError(err, 400));
        }
    };

    async login(req, res) {
        try {
            const { email, password } = req.body;
            // check if our db has user with that email
            const user = await User.findOne({ email }).exec();
            if (!user) return res.send(BaseResponse.ofError("No user found", 400));
            // check password
            const match = await auth_utils.comparePassword(password, user.password);
            if (!match) return res.send(BaseResponse.ofError("Wrong password", 400));

            // create signed jwt
            const token = jwt.sign({ _id: user._id }, "HJKAHFKJ4O930909JEJR998392J0R9H89438RH3490R043", {
                expiresIn: "7d",
            });
            // return user and token to client, exclude hashed password
            req.session.user = String(user._id);
            user.password = undefined;
            // send token in cookie
            res.cookie("token", token, {
                httpOnly: true,
                // secure: true, // only works on https
            });
            // send user as json response
            res.send(BaseResponse.ofSucceed(user));
        } catch (err) {
            console.log(err);
            return res.send(BaseResponse.ofError(err, 400));
        }
    };

    async logout(req, res) {
        try {
            res.clearCookie("token");
            return res.send(BaseResponse.ofSucceed({ message: "Signout success" }));
        } catch (err) {
            console.log(err);
            return res.send(BaseResponse.ofError(err, 400));
        }
    };

    async currentUser(req, res) {
        try {
            const user = await User.findById(req.user._id).select("-password").exec();
            console.log("CURRENT_USER", user);
            return res.send(BaseResponse.ofSucceed(user));
        } catch (err) {
            console.log(err);
            return res.send(BaseResponse.ofError(err, 400));
        }
    };

    async updatePassword(req, res) {
        try {
            const { userId, oldPassword, newPassword } = req.body;
            if (!userId || !oldPassword || !newPassword) {
                res.send(BaseResponse.ofError("Invalid parameter", 404))
            }
            const user = await User.findById(userId).exec();
            if (user == null) {
                res.send(BaseResponse.ofError("User not found", 404))
            }
            const isMatched = await auth_utils.comparePassword(oldPassword, user.password);
            if (!isMatched) {
                res.send(BaseResponse.ofError("Wrong password", 404))
            } else {
                user.password = await auth_utils.hashPassword(newPassword);
                await user.save();
                res.send(BaseResponse.ofSucceed(null));
            }
        }
        catch (e) {
            res.send(BaseResponse.ofError("Invalid parameter", 404))
        }
    }
}

module.exports = new AuthController();