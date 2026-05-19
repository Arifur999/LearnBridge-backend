import { prisma } from "../../lib/prisma";

interface Params {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export const searchCourses = async ({
  search,
  category,
  minPrice,
  maxPrice,
  sort,
  page = 1,
  limit = 10,
}: Params) => {
  const skip = (page - 1) * limit;

  const where: any = { status: "APPROVED" };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    // category stored as name string in Course model
    // accept both name and UUID (look up name if it looks like UUID)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
    if (isUuid) {
      const cat = await prisma.category.findUnique({ where: { id: category }, select: { name: true } }).catch(() => null);
      if (cat?.name) where.category = { contains: cat.name, mode: "insensitive" };
    } else {
      where.category = { contains: category, mode: "insensitive" };
    }
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  const orderBy: any =
    sort === "price-asc"  ? { price: "asc" }  :
    sort === "price-desc" ? { price: "desc" } :
    sort === "oldest"     ? { createdAt: "asc" } :
                            { createdAt: "desc" };

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        price: true,
        image: true,
        createdAt: true,
        trainer: { select: { id: true, name: true } },
      },
    }),
    prisma.course.count({ where }),
  ]);

  return {
    data: courses,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};
