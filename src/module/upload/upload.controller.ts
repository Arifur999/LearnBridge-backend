import "dotenv/config";
import { Response } from "express";
import { v2 as cloudinaryV2 } from "cloudinary";
import { AuthRequest } from "../../middlewares/verifyToken";

const getCloudinaryInstance = () => {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      `Cloudinary credentials missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env`
    );
  }

  cloudinaryV2.config({ cloud_name, api_key, api_secret });
  return cloudinaryV2;
};

export const uploadImageController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: "Only JPG, PNG, WEBP or GIF allowed" });
    }

    const cl = getCloudinaryInstance();

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        cl.uploader
          .upload_stream(
            {
              folder: "learnbridge/profiles",
              resource_type: "image",
              transformation: [{ width: 800, crop: "limit", quality: "auto" }],
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
