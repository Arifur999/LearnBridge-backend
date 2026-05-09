import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyAdmin } from "../../middlewares/role";
import {
  createCategoryController,
  getAllCategoriesController,
  updateCategoryController,
  deleteCategoryController,
} from "./category.controller";

const router = Router();

// Public
router.get("/", getAllCategoriesController);

// Admin only
router.post("/", verifyToken, verifyAdmin, createCategoryController);
router.patch("/:id", verifyToken, verifyAdmin, updateCategoryController);
router.delete("/:id", verifyToken, verifyAdmin, deleteCategoryController);

export default router;
