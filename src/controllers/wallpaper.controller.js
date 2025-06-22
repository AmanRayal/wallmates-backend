import { uploadOnCloudinary } from "../utils/cloudinaryWallpaper.js";
import { Wallpaper } from "../models/wallpaper.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { AdminWallpaper } from "../models/admin.model.js";
import mongoose from "mongoose";


import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});



// upload Wallpaper

const uploadWallpaper = asyncHandler(async (req, res) => {
  const { title, category, tags, description } = req.body;

  if (!title || !category) {
    throw new ApiError(400, "Title and Category are required!");
  }

  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "At least one wallpaper is required!");
  }


  const uploadedWallpapers = [];
  const publicIds = [];
  let resolution = null;
  let totalSize = 0;

  for (const file of req.files) {
    const result = await uploadOnCloudinary(file.buffer, "user_wallpapers");

    if (result) {
      uploadedWallpapers.push(result.secure_url);
      publicIds.push(result.public_id);
      resolution = `${result.width}x${result.height}`;
      totalSize += file.size;
    }
  }

  const newWallpaper = new Wallpaper({
    title,
    description,
    category,
    urls: uploadedWallpapers,
    public_ids: publicIds,
    uploadedBy: req.user.id,
    resolution,
    size: totalSize,
    tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
    views: 0,
    status: "pending",
    isApproved: false,
  });

  await newWallpaper.save();

  return res
    .status(201)
    .json(
      new ApiResponse(201, "Wallpapers uploaded successfully!", newWallpaper)
    );
});

// get wallpapers uploaded by user

const getUserWallpaper = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const userWallpapers = await Wallpaper.find({ uploadedBy: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalWallpapers = await Wallpaper.countDocuments({
    uploadedBy: userId,
  });
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        wallpaper: userWallpapers,
        totalWallpapers,
        currentPage: page,
        totalPages: Math.ceil(totalWallpapers / limit),
      },
      "User wallpapers fetched successfully"
    )
  );
});

// get single wallpaper by id 

const getSingleWallpaper = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try finding in AdminWallpaper collection first
  let wallpaper = await AdminWallpaper.findById(id);
  
  // If not found, try user-uploaded Wallpaper
  if (!wallpaper) {
    wallpaper = await Wallpaper.findById(id);
  }

  if (!wallpaper) {
    throw new ApiError(404, "Wallpaper not found");
  }

  res.status(200).json(new ApiResponse(200, "Wallpaper fetched successfully", wallpaper));
});

// get user single wallpaper

const getSingleUserWallpaper = asyncHandler(async (req, res) => {
  const { wallpaperId } = req.params;
  const userId = req.user.id;

  if (!wallpaperId) {
    throw new ApiError(400, "Wallpaper ID is required!");
  }

  const wallpaper = await Wallpaper.findOne({
    _id: wallpaperId,
    uploadedBy: userId,
  }).populate("uploadedBy", "name email"); 

  if (!wallpaper) {
    throw new ApiError(404, "Wallpaper not found or you are not the owner");
  }

  return res.status(200).json(
    new ApiResponse(200, "User's wallpaper fetched successfully!", wallpaper)
  );
});



// edit Wallpapers

const editWallpaper = asyncHandler(async (req, res) => {
  const { title, category, tags } = req.body;
  const { wallpaperId } = req.params; 

  if (!wallpaperId) {
    throw new ApiError(400, "Wallpaper ID is required!");
  }

  const wallpaper = await Wallpaper.findById(wallpaperId);

  if (!wallpaper) {
    throw new ApiError(404, "Wallpaper not found!");
  }


  if (wallpaper.uploadedBy.toString() !== req.user.id) {
    throw new ApiError(403, "You are not allowed to edit this wallpaper!");
  }

  wallpaper.title = title || wallpaper.title;
  wallpaper.category = category || wallpaper.category;
  wallpaper.tags = tags
    ? tags.split(",").map((tag) => tag.trim())
    : wallpaper.tags;

  await wallpaper.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Wallpaper updated successfully!", wallpaper));
});

// delete Wallpaper

const deleteWallpaper = asyncHandler(async (req, res) => {
  const { wallpaperId } = req.params;

  if (!wallpaperId) {
    throw new ApiError(400, "Wallpaper ID is required!");
  }

  const wallpaper = await Wallpaper.findById(wallpaperId);

  if (!wallpaper) {
    throw new ApiError(404, "Wallpaper not found!");
  }


  if (wallpaper.uploadedBy.toString() !== req.user.id) {
    throw new ApiError(403, "You are not allowed to delete this wallpaper!");
  }

  // Delete from Cloudinary
  if (wallpaper.public_ids) {
    await cloudinary.uploader.destroy(wallpaper.public_ids);
  }

  // Delete from database
  await Wallpaper.findByIdAndDelete(wallpaperId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Wallpaper deleted successfully!"));
});

// views in wallpaper

const viewWallpaper = asyncHandler(async (req, res) => {
  const { wallpaperId } = req.params;
  if (!wallpaperId) throw new ApiError(400, "Wallpaper ID is required!");

  const wallpaper = await Wallpaper.findById(wallpaperId);
  if (!wallpaper) throw new ApiError(404, "Wallpaper not found!");

  // Check if the user already viewed this wallpaper
  if (!wallpaper.viewedBy.includes(req.user.id)) {
    wallpaper.views += 1;
    wallpaper.viewedBy.push(req.user.id);
    await wallpaper.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, wallpaper, "Wallpaper viewed successfully!"));
});

// like wallpaper


const likeWallpaper = asyncHandler(async (req, res) => {
  const { wallpaperId } = req.params;
  const userId = req.user.id;

  // Try finding the wallpaper in both collections
  let wallpaper = await Wallpaper.findById(wallpaperId);
  let isAdminWallpaper = false;

  if (!wallpaper) {
    wallpaper = await AdminWallpaper.findById(wallpaperId);
    isAdminWallpaper = true;
  }

  if (!wallpaper) {
    throw new ApiError(404, "Wallpaper not found!");
  }

  // Find the user
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  const alreadyLiked = user.likedWallpapers.some(
    (item) => item.wallpaperId.toString() === wallpaperId
  );

  if (alreadyLiked) {
    // Unlike logic
    if (wallpaper.likes > 0) wallpaper.likes -= 1;

    wallpaper.likedBy = wallpaper.likedBy.filter(
      (id) => id.toString() !== userId
    );

    user.likedWallpapers = user.likedWallpapers.filter(
      (item) => item.wallpaperId.toString() !== wallpaperId
    );
  } else {
    // Like logic
    wallpaper.likes += 1;
    wallpaper.likedBy.push(userId);

    user.likedWallpapers.push({
      wallpaperId,
      isAdmin: isAdminWallpaper,
    });
  }

  // Save updated documents
  await wallpaper.save();
  await user.save();

  res.status(200).json(
    new ApiResponse(
      200,
      alreadyLiked ? "Wallpaper unliked!" : "Wallpaper liked!",
      {
        isLiked: !alreadyLiked,
        likes: wallpaper.likes,
      }
    )
  );
});



// download wallpaper

// const downloadWallpaper = asyncHandler(async (req, res) => {
//   const { wallpaperId } = req.params;
//   const userId = req.user ? req.user.id : null;

//   // Try to find the wallpaper in both User and Admin wallpapers
//   let wallpaper = await Wallpaper.findById(wallpaperId);
//   let isAdminWallpaper = false;

//   if (!wallpaper) {
//     wallpaper = await AdminWallpaper.findById(wallpaperId);
//     isAdminWallpaper = true;
//   }

//   if (!wallpaper) throw new ApiError(404, "Wallpaper not found!");

//   // Check if the wallpaper is approved for download (only for admin wallpapers)
//   if (isAdminWallpaper && wallpaper.status !== 'approved') {
//     throw new ApiError(403, "Admin wallpaper is not approved for download!");
//   }

//   // If user is logged in and not already downloaded the wallpaper
//   if (userId && !wallpaper.downloadedBy.includes(userId)) {
//     wallpaper.downloads += 1;
//     wallpaper.downloadedBy.push(userId);
//     await wallpaper.save();
//   }

//   // --- Safe filename creation ---
//   const originalUrl = wallpaper.urls[0];

//   if (!originalUrl.includes('/upload/')) {
//     throw new ApiError(500, "Invalid Cloudinary URL format");
//   }

//   // Sanitize filename: only letters, numbers, _, -
//   const filename = (wallpaper.title || 'wallpaper').replace(/[^a-zA-Z0-9_-]/g, "_");

//   // Split URL for Cloudinary
//   const parts = originalUrl.split('/upload/');
  
//   // Create the downloadable URL
//   const downloadableUrl = `${parts[0]}/upload/fl_attachment:${filename}/${parts[1]}`;


//   return res.status(200).json(
//     new ApiResponse(200, "Download URL generated!", {
//       downloads: wallpaper.downloads,
//       downloadUrl: downloadableUrl, // Assuming URLs are stored in the 'urls' field
//     })
//   );
// });

const downloadWallpaper = asyncHandler(async (req, res) => {
  const { wallpaperId } = req.params;
  const userId = req.user ? req.user.id : null;

  let wallpaper = await Wallpaper.findById(wallpaperId);
  let isAdminWallpaper = false;

  if (!wallpaper) {
    wallpaper = await AdminWallpaper.findById(wallpaperId);
    isAdminWallpaper = true;
  }

  if (!wallpaper) throw new ApiError(404, "Wallpaper not found!");

  if (isAdminWallpaper && wallpaper.status !== 'approved') {
    throw new ApiError(403, "Admin wallpaper is not approved for download!");
  }


  wallpaper.downloads += 1;


  if (userId && !wallpaper.downloadedBy.includes(userId)) {
    wallpaper.downloadedBy.push(userId);
  }

  await wallpaper.save();

  const originalUrl = wallpaper.urls[0];

  if (!originalUrl.includes('/upload/')) {
    throw new ApiError(500, "Invalid Cloudinary URL format");
  }

  const filename = (wallpaper.title || 'wallpaper').replace(/[^a-zA-Z0-9_-]/g, "_");
  const parts = originalUrl.split('/upload/');
  const downloadableUrl = `${parts[0]}/upload/fl_attachment:${filename}/${parts[1]}`;

  return res.status(200).json(
    new ApiResponse(200, "Download URL generated!", {
      downloads: wallpaper.downloads,
      downloadUrl: downloadableUrl,
    })
  );
});





// Search wallpaper

const searchWallpapers = asyncHandler(async (req, res) => {
  let { query, page = 1, limit = 10 } = req.query;

  if (!query || query.trim() === "") {
    throw new ApiError(400, "Search query is required!");
  }

  query = query.trim();
  const searchRegex = new RegExp(query, "i");

  // Search condition for both models
  const searchCondition = {
    $or: [
      { title: { $regex: searchRegex } },
      { category: { $regex: searchRegex } },
      { tags: { $elemMatch: { $regex: searchRegex } } },
    ],
  };

  // Only include approved wallpapers from user model
  const userWallpapersPromise = Wallpaper.find({
    isApproved: true,
    ...searchCondition,
  });

  // Admin wallpapers are always approved by default (as per your schema)
  const adminWallpapersPromise = AdminWallpaper.find(searchCondition);

  // Fetch both sets
  const [userWallpapers, adminWallpapers] = await Promise.all([
    userWallpapersPromise,
    adminWallpapersPromise,
  ]);

  // Combine results
  const allWallpapers = [...userWallpapers, ...adminWallpapers];

  // Paginate combined result manually
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedResults = allWallpapers.slice(startIndex, endIndex);

  res.status(200).json(
    new ApiResponse(200, "Search results fetched!", {
      totalResults: allWallpapers.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil(allWallpapers.length / limit),
      limit: parseInt(limit),
      results: paginatedResults,
    })
  );
});





// All wallpapers


const getAllWallpapers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  
  // Parse page and limit
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  // Fetch admin and user wallpapers
  const adminWallpapers = await AdminWallpaper.find({ status: "approved" });
  const userWallpapers = await Wallpaper.find({ isApproved: true });

  // Combine both admin and user wallpapers
  let combinedWallpapers = [...adminWallpapers, ...userWallpapers];

  // Sort by creation date (descending)
  combinedWallpapers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Paginate the combined results
  const paginatedWallpapers = combinedWallpapers.slice(startIndex, endIndex);

  // Calculate total results and total pages
  const totalResults = combinedWallpapers.length;
  const totalPages = Math.ceil(totalResults / limit);

  // Send response in the same format
  res.status(200).json({
    status: "success",
    message: "All wallpapers (admin + approved user) fetched successfully!",
    data: {
      wallpapers: paginatedWallpapers, 
      totalWallpapers: totalResults,  
      currentPage: parseInt(page), 
      totalPages: totalPages,         
      limit: parseInt(limit),         
    }
  });
});


// signle wallpaper with related wallpapers


export const getSingleWallpaperWithRelated = asyncHandler(async (req, res) => {
  const { wallpaperId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(wallpaperId)) {
    throw new ApiError(400, "Invalid wallpaper ID");
  }

  let wallpaper = await AdminWallpaper.findById(wallpaperId).lean();
  if (!wallpaper) {
    wallpaper = await Wallpaper.findById(wallpaperId).lean();
  }

  if (!wallpaper) {
    throw new ApiError(404, "Wallpaper not found");
  }

  const { category, tags = [] } = wallpaper;
  const categoryRegex = new RegExp(category.split(',')[0].trim(), "i");
  const normalizedTags = tags.filter(Boolean).map(tag => tag.toLowerCase());

  const baseQuery = {
    _id: { $ne: wallpaper._id },
    category: categoryRegex,
    ...(normalizedTags.length > 0 && { tags: { $in: normalizedTags } }),
  };

  const [relatedFromAdmin, relatedFromUser] = await Promise.all([
    AdminWallpaper.find(baseQuery).lean(), // no 'status'
    Wallpaper.find({ isApproved: true, ...baseQuery }).lean(),
  ]);

  const combined = [...relatedFromAdmin, ...relatedFromUser]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  res.status(200).json(
    new ApiResponse(200, "Related wallpapers fetched successfully", {
      count: combined.length,
      wallpapers: combined,
    })
  );
});










export {
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
};
