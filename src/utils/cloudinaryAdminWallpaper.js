// utils/uploadOnCloudinary.js

import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper Function
const uploadAdminWallpaperOnCloudinary = async (fileBuffer, mimetype, folderName) => {
  try {
    if (!fileBuffer) return null;

    const isVideo = mimetype.startsWith("video/");
    const isImage = mimetype.startsWith("image/");

    if (isImage) {
      const base64Image = `data:${mimetype};base64,${fileBuffer.toString("base64")}`;

      const response = await cloudinary.uploader.upload(base64Image, {
        folder: folderName,
        resource_type: "image",
      });

      return response;
    }

    if (isVideo) {
      const response = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            folder: folderName,
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
      });

      return response;
    }

    return null;
  } catch (error) {
    return null;
  }
};

export { uploadAdminWallpaperOnCloudinary };
