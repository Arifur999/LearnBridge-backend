import { prisma } from "../../lib/prisma";


export const getPendingTrainers = async () => {
  return prisma.user.findMany({
    where: {
      role: "TRAINER",
      status: "PENDING",
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
};

export const approveTrainerById = async (trainerId: string) => {
  // ensure trainer exists & pending
  const trainer = await prisma.user.findUnique({
    where: { id: trainerId },
  });

  if (!trainer || trainer.role !== "TRAINER") {
    throw new Error("NOT_TRAINER");
  }

  if (trainer.status !== "PENDING") {
    throw new Error("NOT_PENDING");
  }

  // activate trainer
  const updated = await prisma.user.update({
    where: { id: trainerId },
    data: { status: "ACTIVE" },
  });

  return updated;
};
