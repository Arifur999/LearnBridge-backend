import { prisma } from "../../lib/prisma";

const addReviewIntoDB = async (payload: {
  studentId: string;
  courseId: string;
  rating: number;
  comment: string;
}) => {

  const course = await prisma.course.findUnique({
    where: { id: payload.courseId },
  });

  if (!course) {
    throw new Error("COURSE_NOT_FOUND");
  }

  const result = await prisma.review.create({
    data: {
      studentId: payload.studentId,
      courseId: payload.courseId,
      rating: payload.rating,
      comment: payload.comment,
    },
  });

  return result;
};

export const ReviewService = {
  addReviewIntoDB,
};