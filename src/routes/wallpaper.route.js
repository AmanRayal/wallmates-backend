import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multerWallpaper.middleware.js";
import {
  uploadWallpaper,
  getUserWallpaper,
  editWallpaper,
  deleteWallpaper,
  viewWallpaper,
  likeWallpaper,
  downloadWallpaper,
  searchWallpapers,
  getAllWallpapers,
  getSingleWallpaper,
  getSingleUserWallpaper,
  getSingleWallpaperWithRelated
} from "../controllers/wallpaper.controller.js";

const router = Router();

router.route("/uploadWallpapers").post(
  verifyJwt,
  upload.array("wallpaper", 10),
  uploadWallpaper
);
router.get("/getallWallpapers", getAllWallpapers);
router.get("/getSinglewallpapers/:id", getSingleWallpaper);
router.get("/getUserSingleWallpaper/:wallpaperId", verifyJwt, getSingleUserWallpaper);
router.route("/getUserWallpaper").get( getUserWallpaper); // remover verifyJwt
router.route("/editUserWallpaper/:wallpaperId").put(verifyJwt, editWallpaper);
router.route("/deleteWallpaper/:wallpaperId").delete(verifyJwt, deleteWallpaper);
router.route("/wallpapers/:wallpaperId/view").get(verifyJwt, viewWallpaper);
router.route("/like/:wallpaperId").post(verifyJwt, likeWallpaper);
router.get("/download/:wallpaperId", downloadWallpaper);
router.get("/relate/:wallpaperId", getSingleWallpaperWithRelated);
// router.get("/:wallpaperId/download", downloadWallpaper);



router.get("/search", searchWallpapers);




export default router;
