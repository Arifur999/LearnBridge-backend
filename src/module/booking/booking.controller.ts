import { Request, Response } from "express";
import { AuthRequest } from "../../middlewares/verifyToken";
import { BookingService } from "./booking.service";

const createSlotController = async (req: AuthRequest, res: Response) => {
  try {
    const trainerId = req.user!.userId;
    const result = await BookingService.createSlotIntoDB({ ...req.body, trainerId });

    res.status(201).json({
      success: true,
      message: "Slot created successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const createBookingController = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.userId;
    const { slotId } = req.body;
    const result = await BookingService.createBookingIntoDB(studentId, slotId);

    res.status(201).json({
      success: true,
      message: "Session booked successfully",
      data: result,
    });
  } catch (error: any) {
    if (error.message === "SLOT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Slot not found" });
    }
    if (error.message === "SLOT_ALREADY_BOOKED") {
      return res.status(409).json({ success: false, message: "Slot is already booked" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getMyBookingsController = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.userId;
    const { status } = req.query;
    const result = await BookingService.getMyBookingsFromDB(studentId, status as string);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getBookingByIdController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await BookingService.getBookingByIdFromDB(id, userId);

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateBookingStatusController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const { id } = req.params;
    const { status } = req.body;

    if (!["COMPLETED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Use COMPLETED or CANCELLED" });
    }

    const result = await BookingService.updateBookingStatusIntoDB(id, userId, userRole, status);

    res.status(200).json({
      success: true,
      message: `Booking marked as ${status.toLowerCase()}`,
      data: result,
    });
  } catch (error: any) {
    if (error.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (error.message === "INVALID_STATUS_TRANSITION") {
      return res.status(400).json({ success: false, message: "Invalid status transition" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getTutorBookingsController = async (req: AuthRequest, res: Response) => {
  try {
    const tutorId = req.user!.userId;
    const { status } = req.query;
    const result = await BookingService.getTutorBookingsFromDB(tutorId, status as string);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const BookingController = {
  createSlotController,
  createBookingController,
  getMyBookingsController,
  getBookingByIdController,
  updateBookingStatusController,
  getTutorBookingsController,
};
