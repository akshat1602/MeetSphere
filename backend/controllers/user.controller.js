import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";

const login = async (req, res) => {
  const username = req.body.username?.trim();
  const password = req.body.password;

  if (!username || !password) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: "Username and password are required",
    });
  }

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "User not found",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Invalid username or password",
      });
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.token = token;
    await user.save();

    return res.status(httpStatus.OK).json({ token });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Something went wrong during login",
    });
  }
};

const register = async (req, res) => {
  const name = req.body.name?.trim();
  const username = req.body.username?.trim();
  const password = req.body.password;

  if (!name || !username || !password) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: "Name, username and password are required",
    });
  }

  try {
    const newUser = new User({
      name,
      username,
      password: await bcrypt.hash(password, 10),
    });

    await newUser.save();

    return res.status(httpStatus.CREATED).json({
      message: "User registered successfully",
    });
  } catch (e) {
    console.error("Register error:", e);

    if (e.code === 11000) {
      return res.status(httpStatus.CONFLICT).json({
        message: "Username already exists",
      });
    }

    if (e.name === "ValidationError") {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: Object.values(e.errors)
          .map((err) => err.message)
          .join(", "),
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Something went wrong during registration",
    });
  }
};

const getUserHistory = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: "Token is required",
    });
  }

  try {
    const user = await User.findOne({ token });

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "User not found",
      });
    }

    const meetings = await Meeting.find({ user_id: user.username });
    return res.status(httpStatus.OK).json(meetings);
  } catch (e) {
    console.error("Get history error:", e);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Something went wrong while fetching history",
    });
  }
};

const addToHistory = async (req, res) => {
  const { token, meeting_code } = req.body;

  if (!token || !meeting_code) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: "Token and meeting code are required",
    });
  }

  try {
    const user = await User.findOne({ token });

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "User not found",
      });
    }

    const newMeeting = new Meeting({
      user_id: user.username,
      meetingCode: meeting_code.trim().toUpperCase(),
    });

    await newMeeting.save();

    return res.status(httpStatus.CREATED).json({
      message: "Added code to history",
    });
  } catch (e) {
    console.error("Add history error:", e);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Something went wrong while saving history",
    });
  }
};

export { login, register, getUserHistory, addToHistory };