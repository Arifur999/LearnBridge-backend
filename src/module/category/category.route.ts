import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyAdmin } from "../../middlewares/role";
import { createCategoryController , getAllCategoriesController} from "./category.controller";


const router = Router();


router.post(
  "/",
  verifyToken,
  verifyAdmin,
  createCategoryController
);


router.get(
  "/",
  getAllCategoriesController
);

export default router;