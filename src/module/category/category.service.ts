import { prisma } from "../../lib/prisma";


interface CreateCategoryPayload {
  name: string;
}

export const createCategory = async (payload: CreateCategoryPayload) => {
  // Check if category already exists (Optional validation)
  const existingCategory = await prisma.category.findUnique({
    where: { name: payload.name }
  });

  if (existingCategory) {
    throw new Error("CATEGORY_EXISTS");
  }

  const result = await prisma.category.create({
    data: payload,
  });

  return result;
};

export const getAllCategories = async () => {
  const result = await prisma.category.findMany({
    orderBy: {
      createdAt: 'desc', 
    },
    select: {
      id: true,
      name: true,
    
    }
  });

  return result;
};