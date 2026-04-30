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

// Get all users with pagination
export const getAllUsers = async (filters: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const { role, status, search, page = 1, limit = 10 } = filters;

  const where: any = {};

  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            courses: true,
            enrollments: true,
            bookings: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Update user status (ban/unban)
export const updateUserStatus = async (userId: string, newStatus: "ACTIVE" | "BLOCKED") => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: newStatus },
  });

  return updated;
};

// Get all bookings (admin view)
export const getAllBookings = async (filters: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const { status, page = 1, limit = 10 } = filters;

  const where: any = {};
  if (status) where.status = status;

  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        slot: {
          include: {
            trainer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
