import { Response } from "express";
import { AuthRequest } from "../../middlewares/verifyToken";
import { createCourse } from "./course.service";


export const createCourseController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const trainerId = req.user!.userId;

    const course = await createCourse({
      ...req.body,
      trainerId,
    });

    res.status(201).json({
      success: true,
      message: "Course created and pending admin approval",
      data: course,
    });
  } catch (error: any) {
    if (error.message === "INVALID_DATA") {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
