import mongoose, { Schema } from "mongoose";
import slugify from "slugify";

const AdminWallpaperSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
        type: String,
        enum: ["image", "video"],
        default: "image",
      },
    description: {
      type: String,
      trim: true,
    },
    resolution: {
      type: String,
    },
    size: {
      type: Number,
    },
    urls: [
      {
        type: String,
        required: true,
      },
    ],
    public_ids: [
      {
        type: String,
        required: true,
      },
    ],
    tags: [
  {
    type: String,
    set: (v) => v.toLowerCase().trim(),
  },
],
category: {
  type: String,
  required: true,
  trim: true,
  set: (v) => v.toLowerCase().trim(),
},


    uploadedBy: {
      type: String,
      default: "admin",
    },

    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    downloads: {
      type: Number,
      default: 0,
    },
    downloadedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
    viewedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

AdminWallpaperSchema.pre("save", async function (next) {
  if (!this.slug && this.title) {
    let newSlug = slugify(this.title, { lower: true, strict: true });
    let slugExists = await mongoose.models.AdminWallpaper.findOne({
      slug: newSlug,
    });

    let count = 1;
    while (slugExists) {
      newSlug = `${newSlug}-${count}`;
      slugExists = await mongoose.models.AdminWallpaper.findOne({
        slug: newSlug,
      });
      count++;
    }

    this.slug = newSlug;
  }
  next();
});

export const AdminWallpaper = mongoose.model(
  "AdminWallpaper",
  AdminWallpaperSchema
);
