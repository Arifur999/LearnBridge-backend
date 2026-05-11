import { Response } from "express";
import { AuthRequest } from "../../middlewares/verifyToken";
import { cloudinary } from "../../config/cloudinary";

export const uploadImageController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: "Only JPG, PNG, WEBP or GIF allowed" });
    }

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "learnbridge/courses",
              resource_type: "image",
              transformation: [{ width: 800, height: 450, crop: "fill", quality: "auto" }],
            },
            (error, result) => {
              if (error || !result) reject(error ?? new Error("Upload failed"));
              else resolve(result as { secure_url: string; public_id: string });
            }
          )
          .end(req.file!.buffer);
      }
    );

    res.status(200).json({ success: true, url: result.secure_url, publicId: result.public_id });
  } catch (error: any) {
    const message = error?.message || "Image upload failed";
    res.status(500).json({ success: false, message });
  }
};
