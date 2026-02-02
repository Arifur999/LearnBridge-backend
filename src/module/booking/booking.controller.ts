import { Response } from "express";
import { AuthRequest } from "../../middlewares/verifyToken";
import { BookingService } from "./booking.service";


const createSlotController = async (req: AuthRequest, res: Response) => {
  try {
    const trainerId = req.user!.userId; 
    const result = await BookingService.createSlotIntoDB({
      ...req.body,
      trainerId,
    });

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

    res.status(200).json({
      success: true,
      message: "Booking successful",
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

export const BookingController = {
  createSlotController,
  createBookingController,
};