import { Request, Response } from "express";
import { loginUser, registerUser, getCurrentUser, updateUserProfile } from "./auth.service";
import { AuthRequest } from "../../middlewares/verifyToken";


export const register = async (req: Request, res: Response) => {
  try {
    const user = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error: any) {
    if (error.message === "USER_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { user, token } = await loginUser(req.body);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error: any) {
    if (error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (error.message === "BLOCKED") {
      return res.status(403).json({
        success: false,
        message: "Account is blocked",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, image } = req.body as { name?: string; image?: string };
    const user = await updateUserProfile(userId, {
      ...(name ? { name } : {}),
      ...(image !== undefined ? { image } : {}),
    });
    res.status(200).json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await getCurrentUser(userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
