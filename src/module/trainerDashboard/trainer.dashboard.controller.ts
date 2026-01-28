import { Response } from "express";
import { AuthRequest } from "../../middlewares/verifyToken";
import { getTrainerDashboard } from "./trainer.dashboard.service";

export const getTrainerDashboardController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const trainerId = req.user!.userId;

    const data = await getTrainerDashboard(trainerId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
