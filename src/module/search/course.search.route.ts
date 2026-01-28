import { Router } from "express";
import { searchCoursesController } from "./course.search.controller";


const router = Router();

router.get("/courses/search", searchCoursesController);

export default router;
