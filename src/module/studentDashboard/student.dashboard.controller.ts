import { Request, Response } from "express";
import { getStudentDashboard } from "./student.dashboard.service";

export const getStudentDashboardController = async (
  req: Request,
  res: Response
) => {
  try {
    const studentId = (req as any).user?.userId;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const dashboard = await getStudentDashboard(studentId);

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    if (error.message === "STUDENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};