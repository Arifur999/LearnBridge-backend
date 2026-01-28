import { Response } from "express";
import { enrollCourse } from "./enrollment.service";
import { AuthRequest } from "../../middlewares/verifyToken";




export const enrollCourseController = async (
  req: AuthRequest ,
  res: Response
) => {
  try {
    const studentId = req.user!.userId;
    const { courseId } = req.params;

    const enrollment = await enrollCourse(studentId, courseId as string);

    res.status(201).json({
      success: true,
      message: "Enrolled successfully",
      data: enrollment,
    });
  } catch (error: any) {
    if (error.message === "COURSE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (error.message === "COURSE_NOT_APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Course is not approved",
      });
    }

    if (error.message === "ALREADY_ENROLLED") {
      return res.status(409).json({
        success: false,
        message: "Already enrolled in this course",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
