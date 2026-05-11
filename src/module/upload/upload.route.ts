import { Router } from "express";
import multer from "multer";
import { verifyToken } from "../../middlewares/verifyToken";
import { uploadImageController } from "./upload.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// POST /api/v1/upload/image
router.post("/image", verifyToken, upload.single("image"), uploadImageController);

export default router;
