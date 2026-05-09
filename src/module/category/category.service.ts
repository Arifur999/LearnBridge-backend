import { prisma } from "../../lib/prisma";

export const createCategory = async (payload: { name: string }) => {
  const existing = await prisma.category.findUnique({ where: { name: payload.name } });
  if (existing) throw new Error("CATEGORY_EXISTS");

  return prisma.category.create({ data: payload });
};

export const getAllCategories = async () => {
  return prisma.category.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
};

export const updateCategory = async (id: string, name: string) => {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new Error("CATEGORY_NOT_FOUND");

  const nameTaken = await prisma.category.findFirst({
    where: { name, NOT: { id } },
  });
  if (nameTaken) throw new Error("CATEGORY_EXISTS");

  return prisma.category.update({ where: { id }, data: { name } });
};

export const deleteCategory = async (id: string) => {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new Error("CATEGORY_NOT_FOUND");

  return prisma.category.delete({ where: { id } });
};
