import { Router } from "express";
import { getApprovedCoursesController } from "./student.course.controller";

const router = Router();

router.get("/courses", getApprovedCoursesController);

export default router;
