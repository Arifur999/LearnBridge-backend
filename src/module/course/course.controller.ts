import { Response } from "express";
import { AuthRequest } from "../../middlewares/verifyToken";
import { createCourse, getCourseById } from "./course.service";
import { Request } from "express-serve-static-core";


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




export const getSingleCourseController = async (
  req: Request, 
  res: Response
) => {
  try {
    const { id } = req.params;
    const courseId = Array.isArray(id) ? id[0] : id;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    const course = await getCourseById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course retrieved successfully",
      data: course,
     
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

