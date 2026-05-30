import "dotenv/config";
import { Response } from "express";
import { cloudinary } from "../../config/cloudinary";
import { AuthRequest } from "../../middlewares/verifyToken";

export const uploadImageController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: "Only JPG, PNG, WEBP or GIF allowed" });
    }

    const base64  = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "learnbridge",
      resource_type: "image",
    });

    return res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error: any) {
    console.error("[Upload] Cloudinary error:", error?.message ?? error);
    const message = error?.message ?? "Image upload failed";
    return res.status(500).json({ success: false, message });
  }
};
