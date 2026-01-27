import { Request, Response } from "express";
import { approveTrainerById, getPendingTrainers } from "./admin.service";


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
