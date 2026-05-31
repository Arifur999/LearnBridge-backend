import { prisma } from "../../lib/prisma";

export const updateUserProfile = async (
  userId: string,
  payload: { name?: string; image?: string }
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(payload.name                ? { name:  payload.name  } : {}),
      ...(payload.image !== undefined ? { image: payload.image } : {}),
    },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  return user;
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id:             true,
      name:           true,
      email:          true,
      role:           true,
      status:         true,
      createdAt:      true,
      trainerProfile: true,
    },
  });

  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
};
