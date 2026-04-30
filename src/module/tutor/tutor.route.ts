import { Router } from "express";
import { getTutors, getTutorByIdController } from "./tutor.controller";

const router = Router();

// Public routes - get all tutors with filters
router.get("/", getTutors);

// Get single tutor by ID
router.get("/:id", getTutorByIdController);

export default router;