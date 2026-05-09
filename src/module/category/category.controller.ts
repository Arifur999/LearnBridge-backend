import { Request, Response } from "express";
import { createCategory, getAllCategories, updateCategory, deleteCategory } from "./category.service";

export const createCategoryController = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const result = await createCategory({ name });
    res.status(201).json({ success: true, message: "Category created successfully", data: result });
  } catch (error: any) {
    if (error.message === "CATEGORY_EXISTS") {
      return res.status(409).json({ success: false, message: "Category already exists" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllCategoriesController = async (req: Request, res: Response) => {
  try {
    const result = await getAllCategories();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateCategoryController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const result = await updateCategory(id, name);
    res.status(200).json({ success: true, message: "Category updated successfully", data: result });
  } catch (error: any) {
    if (error.message === "CATEGORY_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    if (error.message === "CATEGORY_EXISTS") {
      return res.status(409).json({ success: false, message: "Category name already taken" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteCategoryController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteCategory(id);
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error: any) {
    if (error.message === "CATEGORY_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
