import { Request, Response } from "express";
import { AuthRequest } from "../../middlewares/verifyToken";
import {
  getAllTutors,
  getTutorById,
  getTutorProfileFromDB,
  updateTutorProfileIntoDB,
} from "./tutor.service";
import { BookingService } from "../booking/booking.service";

// Public: list all approved tutors with filters
export const getTutors = async (req: Request, res: Response) => {
  try {
    const { search, subject, minRate, maxRate, page, limit } = req.query;

    const filters: Parameters<typeof getAllTutors>[0] = {
      ...(search && { search: search as string }),
      ...(subject && { subject: subject as string }),
      ...(minRate && { minRate: parseFloat(minRate as string) }),
      ...(maxRate && { maxRate: parseFloat(maxRate as string) }),
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    };
    const result = await getAllTutors(filters);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Public: get single tutor details with reviews and available slots
export const getTutorByIdController = async (req: Request, res: Response) => {
  try {
    const tutor = await getTutorById(String(req.params["id"]));
    res.status(200).json({ success: true, data: tutor });
  } catch (error: any) {
    if (error.message === "TUTOR_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Tutor not found" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Public: get available slots for a specific tutor
export const getPublicTutorSlotsController = async (req: Request, res: Response) => {
  try {
    const slots = await BookingService.getPublicTutorSlotsFromDB(String(req.params["id"]));
    res.status(200).json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Tutor: get own profile
export const getTutorProfileController = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getTutorProfileFromDB(req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === "TUTOR_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Tutor: update own profile
export const updateTutorProfileController = async (req: AuthRequest, res: Response) => {
  try {
    const result = await updateTutorProfileIntoDB(req.user!.userId, req.body);
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Tutor: get own availability slots
export const getTutorOwnSlotsController = async (req: AuthRequest, res: Response) => {
  try {
    const slots = await BookingService.getTutorSlotsFromDB(req.user!.userId);
    res.status(200).json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Tutor: get own sessions/bookings
export const getTutorSessionsController = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const result = await BookingService.getTutorBookingsFromDB(
      req.user!.userId,
      status as string
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
