import { Response } from "express";
import { AuthRequest } from "../../middlewares/verifyToken";
import {
  createCourse,
  getCourseById,
  getTrainerCourses,
  updateCourse,
  deleteCourse,
} from "./course.service";
import { Request } from "express-serve-static-core";


export const createCourseController = async (req: AuthRequest, res: Response) => {
  try {
    const trainerId = req.user!.userId;
    const course = await createCourse({ ...req.body, trainerId });

    res.status(201).json({
      success: true,
      message: "Course created and pending admin approval",
      data: course,
    });
  } catch (error: any) {
    if (error.message === "INVALID_DATA") {
      return res.status(400).json({
        success: false,
        message: "Title, description and category are required",
      });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getTrainerCoursesController = async (req: AuthRequest, res: Response) => {
  try {
    const trainerId = req.user!.userId;
    const courses = await getTrainerCourses(trainerId);
    res.status(200).json({ success: true, data: courses });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateCourseController = async (req: AuthRequest, res: Response) => {
  try {
    const trainerId = req.user!.userId;
    const id = req.params.id as string;
    const course = await updateCourse(id, trainerId, req.body);
    res.status(200).json({ success: true, data: course });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "Not your course" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteCourseController = async (req: AuthRequest, res: Response) => {
  try {
    const trainerId = req.user!.userId;
    const id = req.params.id as string;
    await deleteCourse(id, trainerId);
    res.status(200).json({ success: true, message: "Course deleted" });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "Not your course" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getSingleCourseController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const courseId = Array.isArray(id) ? id[0] : id;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "Course ID is required" });
    }

    const course = await getCourseById(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.status(200).json({ success: true, data: course });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
