import { Router } from "express";
import { adminLogin , approveWallpaper, rejectWallpaper, getPendingWallpapers , uploadAdminWallpaper} from "../controllers/admin.controller.js";
import { verifyAdmin, verifyJwt } from "../middlewares/admin.middlewares.js";
import { AdminWallpaperUploadMulter } from "../middlewares/AdminWallpaer.middleware.js";


const router = Router();

router.post("/login", adminLogin);
router.get("/admin/dashboard", verifyJwt, verifyAdmin, (req, res) => {
  res.json({ message: "Welcome to Admin Dashboard!" });
});

router
  .route("/uploadWallpapers")
  .post(
    verifyJwt,
    verifyAdmin,
    AdminWallpaperUploadMulter.single("file"),
    uploadAdminWallpaper
  );

router.route("/pendingWallpapers").get(verifyJwt, verifyAdmin, getPendingWallpapers);

router.route("/approveWallpaper/:wallpaperId").put(verifyJwt, verifyAdmin, approveWallpaper);

router.route("/rejectWallpaper/:wallpaperId").delete(verifyJwt, verifyAdmin, rejectWallpaper);



export default router;
