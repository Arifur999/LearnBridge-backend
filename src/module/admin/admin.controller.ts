import { Request, Response } from "express";
import { 
  approveTrainerById, 
  getPendingTrainers, 
  getAllUsers, 
  updateUserStatus,
  getAllBookings 
} from "./admin.service";


export const getPendingTrainersController = async (
  req: Request,
  res: Response
) => {
  try {
    const trainers = await getPendingTrainers();
    res.status(200).json({
      success: true,
      data: trainers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const approveTrainerController = async (
  req: Request<{ trainerId: string }>,
  res: Response
) => {
  try {
    const { trainerId } = req.params;

    const trainer = await approveTrainerById(trainerId);

    res.status(200).json({
      success: true,
      message: "Trainer approved successfully",
      data: {
        id: trainer.id,
        email: trainer.email,
        status: trainer.status,
      },
    });
  } catch (error: any) {
    if (error.message === "NOT_TRAINER") {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    if (error.message === "NOT_PENDING") {
      return res.status(400).json({
        success: false,
        message: "Trainer is not pending",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllUsersController = async (req: Request, res: Response) => {
  try {
    const { role, status, search, page, limit } = req.query;

    const result = await getAllUsers({
      role: role as string,
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateUserStatusController = async (
  req: Request<{ userId: string }>,
  res: Response
) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!status || !["ACTIVE", "BLOCKED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be ACTIVE or BLOCKED",
      });
    }

    const user = await updateUserStatus(userId, status);

    res.status(200).json({
      success: true,
      message: `User ${status === "BLOCKED" ? "banned" : "unbanned"} successfully`,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error: any) {
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllBookingsController = async (req: Request, res: Response) => {
  try {
    const { status, page, limit } = req.query;

    const result = await getAllBookings({
      status: status as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
