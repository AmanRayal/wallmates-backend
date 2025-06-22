import mongoose, { Schema } from "mongoose";
import slugify from "slugify";

const wallpaperSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
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
      }
    ],
    public_ids: [
      {
        type: String,
        required: true,
      }
    ],
    tags: [
      {
        type: String,
        set: (v) => v.toLowerCase(),
      },
    ],
    category: {
      type: String,
  required: true,
  trim: true,
  set: (v) => v.toLowerCase(),
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      { 
        type: mongoose.Schema.Types.ObjectId,
         ref: "User" 
        }
      ],
    downloads: {
      type: Number,
      default: 0,
    },
    // downloadedBy: {
    //   type: [mongoose.Schema.Types.ObjectId], 
    //   ref: "User",
    //   default: [],
    // },
    views: {
      type: Number,
      default: 0,
    },
    viewedBy: [
      { 
        type: mongoose.Schema.Types.ObjectId,
         ref: "User"
         }
        ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    slug: {
      type: String,
      unique: true,
      index: true,  
    },
    isApproved: {
       type: Boolean,
        default: false 
    },
  },
  { timestamps: true }
);

wallpaperSchema.pre("save", async function (next) {
  if (!this.slug && this.title) {
    let newSlug = slugify(this.title, { lower: true, strict: true });
    let slugExists = await mongoose.models.Wallpaper.findOne({ slug: newSlug });

    let count = 1;
    while (slugExists) {
      newSlug = `${newSlug}-${count}`;
      slugExists = await mongoose.models.Wallpaper.findOne({ slug: newSlug });
      count++;
    }

    this.slug = newSlug;
  }
  next();
});

export const Wallpaper = mongoose.model("Wallpaper", wallpaperSchema);
