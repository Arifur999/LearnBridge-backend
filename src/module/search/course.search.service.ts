import { prisma } from "../../lib/prisma";


interface Params {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export const searchCourses = async ({
  search,
  category,
  minPrice,
  maxPrice,
  page = 1,
  limit = 10,
}: Params) => {
  const skip = (page - 1) * limit;

  const where: any = {
    status: "APPROVED",
  };

  if (search) {
    where.title = {
      contains: search,
      mode: "insensitive",
    };
  }

  if (category) {
    where.category = category;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        price: true,
        createdAt: true,
        trainer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.course.count({ where }),
  ]);

  return {
    data: courses,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
