import multer from "multer";

const storage = multer.memoryStorage(); // store in memory buffer only

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed!"), false);
  }
};

export const AdminWallpaperUploadMulter = multer({ storage, fileFilter });
