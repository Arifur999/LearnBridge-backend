import { Request, Response } from "express";
import { getCurrentUser, updateUserProfile } from "./auth.service";
import { AuthRequest } from "../../middlewares/verifyToken";

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await getCurrentUser(userId);
    res.status(200).json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { name, image } = req.body as { name?: string; image?: string };
    const user = await updateUserProfile(userId, {
      ...(name                ? { name  } : {}),
      ...(image !== undefined ? { image } : {}),
    });
    res.status(200).json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
