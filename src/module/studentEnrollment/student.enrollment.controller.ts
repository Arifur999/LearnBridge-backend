import { Response } from "express";
import { AuthRequest } from "../../middlewares/verifyToken";
import { getMyEnrollments } from "./student.enrollment.service";


export const getMyEnrollmentsController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const studentId = req.user!.userId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await getMyEnrollments({ studentId, page, limit });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
