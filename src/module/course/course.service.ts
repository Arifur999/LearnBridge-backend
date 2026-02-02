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



export const getCourseById = async (id: string) => {
  const course = await prisma.course.findUnique({
    where: {
      id,
    },
    include: {
      
      trainer: {
        select: {
          id: true,
          name: true,
          email: true,
          
        },
      },
   
      reviews: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return course;
};