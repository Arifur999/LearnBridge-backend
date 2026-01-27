import { Request, Response } from "express";
import { getPendingCourses, updateCourseStatus } from "./admin.course.service";


export const getPendingCoursesController = async (
  req: Request,
  res: Response
) => {
  try {
    const courses = await getPendingCourses();
    res.status(200).json({
      success: true,
      data: courses,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const approveCourseController = async (
  req: Request <{ courseId : string}>,
  res: Response
) => {
  try {
    const { courseId } = req.params;

    const course = await updateCourseStatus(courseId, "APPROVED");

    res.status(200).json({
      success: true,
      message: "Course approved",
      data: {
        id: course.id,
        status: course.status,
      },
    });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (error.message === "NOT_PENDING") {
      return res.status(400).json({
        success: false,
        message: "Course is not pending",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const rejectCourseController = async (
  req: Request  <{ courseId : string}>,
  res: Response
) => {
  try {
    const { courseId } = req.params;

    const course = await updateCourseStatus(courseId, "REJECTED");

    res.status(200).json({
      success: true,
      message: "Course rejected",
      data: {
        id: course.id,
        status: course.status,
      },
    });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (error.message === "NOT_PENDING") {
      return res.status(400).json({
        success: false,
        message: "Course is not pending",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
