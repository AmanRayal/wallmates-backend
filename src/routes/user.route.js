import { Router } from "express";
import {
     loginUser,
     registerUser,
     logoutUser,
     refereshAccessToken,
     updateUserProfile,
     updateAvatar, 
     changeCurrentPassword ,
     getLikedWallpapers,
    } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multerAvatar.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(upload.single("avatar"), registerUser);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJwt, logoutUser);

router.route("/refreshToken").post(refereshAccessToken)

router.route("/changeCurrentPassword").put(verifyJwt,changeCurrentPassword)

router.route("/updateProfile").put(verifyJwt, updateUserProfile)

router.route("/updateAvatar").put(verifyJwt, upload.single("avatar"), updateAvatar)

router.route("/likedWallpaper").get(verifyJwt, getLikedWallpapers)



export default router;
