import { prisma } from "../../lib/prisma";


interface CreateCoursePayload {
  title: string;
  description: string;
  category: string;
  price?: number;
  image?: string;
  trainerId: string;
}

export const createCourse = async (payload: CreateCoursePayload) => {
  const { title, description, category, price = 0, image, trainerId } = payload;

  if (!title || !description || !category) {
    throw new Error("INVALID_DATA");
  }

  const course = await prisma.course.create({
    data: {
      title,
      description,
      category,
      price,
      image: image ?? null,
      trainerId,
      status: "PENDING",
    },
  });

  return course;
};

export const getTrainerCourses = async (trainerId: string) => {
  const courses = await prisma.course.findMany({
    where: { trainerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      price: true,
      image: true,
      status: true,
      createdAt: true,
      _count: { select: { enrollments: true } },
    },
  });

  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    price: c.price,
    image: c.image,
    status: c.status,
    createdAt: c.createdAt,
    totalEnrollments: c._count.enrollments,
  }));
};

export const updateCourse = async (
  id: string,
  trainerId: string,
  payload: { title?: string; description?: string; category?: string; price?: number; image?: string }
) => {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new Error("NOT_FOUND");
  if (course.trainerId !== trainerId) throw new Error("FORBIDDEN");

  return prisma.course.update({
    where: { id },
    data: { ...payload, status: "PENDING" },
  });
};

export const deleteCourse = async (id: string, trainerId: string) => {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new Error("NOT_FOUND");
  if (course.trainerId !== trainerId) throw new Error("FORBIDDEN");

  return prisma.course.delete({ where: { id } });
};

export const getCourseById = async (id: string) => {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      trainer: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return course;
};
