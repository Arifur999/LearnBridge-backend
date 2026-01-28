import { Request, Response } from "express";
import { searchCourses } from "./course.search.service";

export const searchCoursesController = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      page,
      limit,
    } = req.query;

    const result = await searchCourses({
      search: search as string,
      category: category as string,
      ...(minPrice && { minPrice: Number(minPrice) }),
      ...(maxPrice && { maxPrice: Number(maxPrice) }),
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
