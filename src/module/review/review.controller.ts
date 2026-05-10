import { Request, Response } from "express";
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
    if (error.message === "TUTOR_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Tutor not found" });
    }
    if (error.message === "BOOKING_NOT_FOUND_OR_NOT_COMPLETED") {
      return res.status(400).json({ success: false, message: "Booking not found or not completed" });
    }
    if (error.message === "REVIEW_ALREADY_EXISTS") {
      return res.status(409).json({ success: false, message: "Review already submitted for this session" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getReviewsByTutorController = async (req: Request, res: Response) => {
  try {
    const tutorId = String(req.params["tutorId"]);
    const result = await ReviewService.getReviewsByTutor(tutorId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const ReviewController = {
  addReviewController,
  getReviewsByTutorController,
};
