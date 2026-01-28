import { Request, Response } from "express";
import { getAdminDashboardStats } from "./admin.dashboard.service";


export const getAdminDashboardStatsController = async (
  req: Request,
  res: Response
) => {
  try {
    const stats = await getAdminDashboardStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
