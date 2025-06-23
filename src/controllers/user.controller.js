import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

// generate access token and refresh token

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User does not exist");
    }



    const accessToken = user.generateAccessToken();
  
    const refreshToken = user.generateRefreshToken();
    
    try {
      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
    } catch (error) {
      throw new ApiError(500, "Failed to save refresh token to database");
    }

    return { accessToken, refreshToken };
  } catch (error) {
  
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access tokens"
    );
  }
};

// registerUser

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, username } = req.body;

  if (
    [fullName, email, password, username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new ApiError(400, "User with email or username already exists");
  }

  let avatarUrl = null;

  if (req.file) {
    avatarUrl = await uploadOnCloudinary(req.file.buffer);
  }

  const user = await User.create({
    fullName,
    email,
    password,
    avatar: avatarUrl ? avatarUrl.secure_url : null,
    username: username.toLowerCase(),
  });

 

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Error while creating user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

// login user

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or Email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password");
  }


  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);


  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");


  // const options = {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === "production", 
  //   sameSite: "Lax",
  //   maxAge: 7 * 24 * 60 * 60 * 1000, 
  // };

  const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "None",
  maxAge: 7 * 24 * 60 * 60 * 1000, 
};




  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
        },
        "User logged in successfully"
      )
    );
});


// logout user

const logoutUser = asyncHandler(async (req, res) => {
  


  
  await User.findByIdAndUpdate(req.user._id, {
    $set: { refreshToken: null }, 
  });

 
  const options = {
    httpOnly: true,  
    secure: process.env.NODE_ENV === 'production',  
    sameSite: "strict",
  };




  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);


  return res.status(200).json({
    message: "Logged out successfully.",
  });
});



// refresh access token

const refereshAccessToken = asyncHandler(async (req, res) => {
  // get refresh token from cookies
  // check || verify if refresh token is valid
  // generate new access token
  // send new access token to frontend

  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized requesr");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(404, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used ");
    }

    const option = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);


      

    user.refreshToken = newRefreshToken;
    await user.save();

    return res
      .status(200)
      .cookie("accessToken", accessToken, option)
      .cookie("refreshToken", newRefreshToken, option)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
  
    
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// change password

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { newPassword }, "Password changed successfully")
    );
});
// update user profile

const updateUserProfile = asyncHandler(async (req, res) => {
  const { fullName, email, username } = req.body;
  if (!fullName && !email && !username) {
    throw new ApiError(400, "Atleast one field is required to update");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email,
        username,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile updated successfully"));
});

// update avatar

const updateAvatar = asyncHandler(async (req, res) => {
  
  if (!req.file) {
    throw new ApiError(400, "Avatar file is missing");
  }

  try {
    // Upload avatar to Cloudinary
    const avatarUpload = await uploadOnCloudinary(req.file.buffer);

    if (!avatarUpload || !avatarUpload.secure_url) {
      throw new ApiError(400, "Error while uploading avatar to Cloudinary");
    }

    // Update the user's avatar in the database
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { avatar: avatarUpload.secure_url },
      { new: true }
    ).select("-password -refreshToken"); 

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Avatar updated successfully"));
  } catch (error) {
    throw new ApiError(500, "Internal server error");
  }
});

// view like wallpaper

const getLikedWallpapers = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId).populate({
    path: "likedWallpapers",
    select: "_id title category likes"
  });

  if (!user) throw new ApiError(404, "User not found!");

  const likedWallpapers = user.likedWallpapers || [];

  res.status(200).json(
    new ApiResponse(200, "Liked wallpapers fetched!", {
      total: likedWallpapers.length,
      wallpapers: likedWallpapers
    })
  );
});


export {
  registerUser,
  loginUser,
  logoutUser,
  refereshAccessToken,
  updateUserProfile,
  updateAvatar,
  changeCurrentPassword,
  getLikedWallpapers,
};
