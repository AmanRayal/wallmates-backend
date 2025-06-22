import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Wallpaper } from "../models/wallpaper.model.js";
import cloudinary from "cloudinary"; 
import { uploadAdminWallpaperOnCloudinary } from "../utils/cloudinaryAdminWallpaper.js";
import { AdminWallpaper } from "../models/admin.model.js";  



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Admin Login

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    throw new ApiError(401, "Invalid admin credentials!");
  }

  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, "JWT Secret is not configured.");
  }

 const token = jwt.sign({ isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res
    .status(200)
    .json(new ApiResponse(200, "Admin logged in successfully!", { token }));
});

// upload Wallpaper

const uploadAdminWallpaper = asyncHandler(async (req, res) => {
  const { title, description, category, resolution, tags } = req.body;

  // Validate required fields
  if (!title || !category) {
    throw new ApiError(400, "Title and Category are required!");
  }

  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  const mimetype = req.file.mimetype;
  const isVideo = mimetype.startsWith("video/");
  const folderName = isVideo ? "admin_videos" : "admin_images";

  // Upload to Cloudinary
  const result = await uploadAdminWallpaperOnCloudinary(
    req.file.buffer,
    mimetype,
    folderName
  );

  if (!result) {
    throw new ApiError(500, "Cloudinary upload failed");
  }

  // Format tags (if provided)
  const parsedTags = tags
    ? tags.split(",").map((tag) => tag.trim()).filter(Boolean)
    : [];

  const wallpaper = new AdminWallpaper({
    title: title.trim(),
    description: description?.trim() || "",
    category: category.trim(),
    resolution: resolution?.trim() || `${result.width}x${result.height}` || "",
    size: req.file.size,
    type: isVideo ? "video" : "image",
    urls: [result.secure_url],
    public_ids: [result.public_id],
    tags: parsedTags,
    uploadedBy: "admin",
    status: "approved",
    views: 0,
    likes: 0,
    downloads: 0,
  });

  await wallpaper.save();

  return res
    .status(201)
    .json(new ApiResponse(201, "Wallpaper uploaded successfully", wallpaper));
});


// Get Pending Wallpapers

const getPendingWallpapers = asyncHandler(async (req, res) => {

  const pendingWallpapers = await Wallpaper.find({ isApproved: false });

  if (!pendingWallpapers || pendingWallpapers.length === 0) {
    return res.status(404).json(new ApiResponse(404, "No pending wallpapers found."));
  }

  
  const response = {
  totalPendingWallpapers: pendingWallpapers.length,
  pendingWallpapers: pendingWallpapers.map(wallpaper => ({
    _id: wallpaper._id,
    title: wallpaper.title,
    category: wallpaper.category,
    userId: wallpaper.userId,
    status: wallpaper.isApproved ? 'Approved' : 'Pending',
    urls: wallpaper.urls, 
    createdAt: wallpaper.createdAt,
    updatedAt: wallpaper.updatedAt
  })),
  message: "Pending wallpapers fetched successfully."
};

  res.status(200).json(new ApiResponse(200, "Pending wallpapers fetched!", response));
});


// Approve Wallpaper

const approveWallpaper = asyncHandler(async (req, res) => {
  const { wallpaperId } = req.params;

  if (!wallpaperId) {
    throw new ApiError(400, "Wallpaper ID is required!");
  }

  const wallpaper = await Wallpaper.findById(wallpaperId);
  if (!wallpaper) {
    throw new ApiError(404, "Wallpaper not found!");
  }

  try {
    wallpaper.status = "approved";
    wallpaper.isApproved = true;
    await wallpaper.save();
  } catch (error) {
    throw new ApiError(500, "Failed to approve wallpaper.");
  }

  res
    .status(200)
    .json(new ApiResponse(200,{wallpaper},  "Wallpaper approved successfully!", 
   
  ));
});

// Reject Wallpaper
const rejectWallpaper = asyncHandler(async (req, res) => {
  const { wallpaperId } = req.params;

  if (!wallpaperId) {
    throw new ApiError(400, "Wallpaper ID is required!");
  }

  const wallpaper = await Wallpaper.findById(wallpaperId);
  if (!wallpaper) {
    throw new ApiError(404, "Wallpaper not found!");
  }

  if (!wallpaper.public_ids || wallpaper.public_ids.length === 0) {
    throw new ApiError(400, "No public ID found for this wallpaper.");
  }

  try {
   
    await cloudinary.uploader.destroy(wallpaper.public_ids[0]);

    
    await Wallpaper.deleteOne({ _id: wallpaperId });

    res
      .status(200)
      .json(new ApiResponse(200, "Wallpaper rejected & deleted successfully!"));
  } catch (error) {
    throw new ApiError(500, "Failed to reject and delete wallpaper.");
  }
});

export { adminLogin, approveWallpaper, rejectWallpaper, getPendingWallpapers, uploadAdminWallpaper };
