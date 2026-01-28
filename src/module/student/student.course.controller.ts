import { Request, Response } from "express";
import { getApprovedCourses } from "./student.course.service";


export const getApprovedCoursesController = async (
  req: Request,
  res: Response
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await getApprovedCourses({ page, limit });

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
