import { Request, Response } from "express";
import { getAllTutors, getTutorById } from "./tutor.service";

export const getTutors = async (req: Request, res: Response) => {
  try {
    const { search, category, minPrice, maxPrice, page, limit } = req.query;

    const result = await getAllTutors({
      search: search as string,
      category: category as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getTutorByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tutor = await getTutorById(id);

    res.status(200).json({
      success: true,
      data: tutor,
    });
  } catch (error: any) {
    if (error.message === "TUTOR_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Tutor not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};