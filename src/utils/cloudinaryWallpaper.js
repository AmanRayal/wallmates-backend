import { v2 as cloudinary } from "cloudinary";

const uploadOnCloudinary = async (fileBuffer, folderName) => {
    try {
        if (!fileBuffer) return null;
        const base64Image = `data:image/png;base64,${fileBuffer.toString("base64")}`;

        // Upload to Cloudinary
        const response = await cloudinary.uploader.upload(base64Image, {
            folder: folderName, 
            resource_type: "auto",
        });

        return response; 
    } catch (error) {
        return null;
    }
};
export {uploadOnCloudinary}
