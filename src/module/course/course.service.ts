import { prisma } from "../../lib/prisma";


interface CreateCoursePayload {
  title: string;
  description: string;
  category: string;
  price?: number;
  trainerId: string;
}

export const createCourse = async (payload: CreateCoursePayload) => {
  const { title, description, category, price = 0, trainerId } = payload;

  if (!title || !description || !category) {
    throw new Error("INVALID_DATA");
  }

  const course = await prisma.course.create({
    data: {
      title,
      description,
      category,
      price,
      trainerId,
      status: "PENDING",
    },
  });

  return course;
};
