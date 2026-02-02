import { Response } from "express";
import { AuthRequest } from "../../middlewares/verifyToken";
import { ReviewService } from "./review.service";

const addReviewController = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.userId;
    const result = await ReviewService.addReviewIntoDB({
      ...req.body, 
      studentId,
    });

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      data: result,
    });
  } catch (error: any) {
    if (error.message === "COURSE_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const ReviewController = {
  addReviewController,
};