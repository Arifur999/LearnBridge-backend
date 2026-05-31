import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role:   string;
    status: string;
  };
  params: { [key: string]: string };
}

export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — invalid or expired session",
      });
    }

    req.user = {
      userId: session.user.id,
      role:   String(session.user.role  ?? "STUDENT"),
      status: String(session.user.status ?? "ACTIVE"),
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};
