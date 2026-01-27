import { Response, NextFunction } from "express";
import { AuthRequest } from "./verifyToken";


export const verifyAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Admin access only",
    });
  }

  next();
};

export const verifyTrainer = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "TRAINER") {
    return res.status(403).json({
      success: false,
      message: "Trainer access only",
    });
  }

  next();
};


export const verifyStudent = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "STUDENT") {
    return res.status(403).json({
      success: false,
      message: "Student access only",
    });
  }

  next();
};
