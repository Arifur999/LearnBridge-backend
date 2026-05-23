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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");

  return prisma.user.update({
    where: { id: userId },
    data: { status: newStatus },
  });
};

// Update user role
export const updateUserRole = async (userId: string, newRole: "STUDENT" | "TRAINER") => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");

  return prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });
};

// Delete user by ID
export const deleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    const [courses, slots] = await Promise.all([
      tx.course.findMany({
        where: { trainerId: userId },
        select: { id: true },
      }),
      tx.slot.findMany({
        where: { trainerId: userId },
        select: { id: true },
      }),
    ]);

    const courseIds = courses.map((course) => course.id);
    const slotIds = slots.map((slot) => slot.id);
    const bookings = await tx.booking.findMany({
      where: {
        OR: [
          { studentId: userId },
          ...(slotIds.length > 0 ? [{ slotId: { in: slotIds } }] : []),
        ],
      },
      select: { id: true },
    });
    const bookingIds = bookings.map((booking) => booking.id);

    await tx.payment.deleteMany({
      where: {
        OR: [
          { studentId: userId },
          ...(bookingIds.length > 0 ? [{ bookingId: { in: bookingIds } }] : []),
        ],
      },
    });

    await tx.review.deleteMany({
      where: {
        OR: [
          { studentId: userId },
          { tutorId: userId },
          ...(bookingIds.length > 0 ? [{ bookingId: { in: bookingIds } }] : []),
        ],
      },
    });

    if (bookingIds.length > 0) {
      await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
    }

    if (slotIds.length > 0) {
      await tx.slot.deleteMany({ where: { id: { in: slotIds } } });
    }

    await tx.enrollment.deleteMany({
      where: {
        OR: [
          { studentId: userId },
          ...(courseIds.length > 0 ? [{ courseId: { in: courseIds } }] : []),
        ],
      },
    });

    if (courseIds.length > 0) {
      await tx.course.deleteMany({ where: { id: { in: courseIds } } });
    }

    await tx.user.delete({ where: { id: userId } });
  });

  return { id: userId };
};

// Get all featured tutors
export const getFeaturedTutors = async () => {
  return prisma.trainerProfile.findMany({
    where: { isFeatured: true },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

// Resolve TrainerProfile by profile id OR user id
const resolveTrainerProfile = async (idOrUserId: string) => {
  const byId = await prisma.trainerProfile.findUnique({ where: { id: idOrUserId } });
  if (byId) return byId;
  const byUser = await prisma.trainerProfile.findUnique({ where: { userId: idOrUserId } });
  if (byUser) return byUser;

  // No profile yet — create a minimal one so we can mark it featured
  const user = await prisma.user.findUnique({ where: { id: idOrUserId } });
  if (!user || user.role !== "TRAINER") throw new Error("PROFILE_NOT_FOUND");
  return prisma.trainerProfile.create({ data: { userId: idOrUserId } });
};

// Add tutor to featured (by TrainerProfile id OR user id)
export const addFeaturedTutor = async (idOrUserId: string) => {
  const profile = await resolveTrainerProfile(idOrUserId);
  return prisma.trainerProfile.update({
    where: { id: profile.id },
    data: { isFeatured: true },
  });
};

// Remove tutor from featured (by TrainerProfile id OR user id)
export const removeFeaturedTutor = async (idOrUserId: string) => {
  const profile = await resolveTrainerProfile(idOrUserId).catch(() => null);
  if (!profile) throw new Error("PROFILE_NOT_FOUND");
  return prisma.trainerProfile.update({
    where: { id: profile.id },
    data: { isFeatured: false },
  });
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
