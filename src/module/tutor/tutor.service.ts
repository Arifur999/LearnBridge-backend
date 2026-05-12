import { prisma } from "../../lib/prisma";

export const getAllTutors = async (filters: {
  search?: string;
  subject?: string;
  minRate?: number;
  maxRate?: number;
  page?: number;
  limit?: number;
}) => {
  const { search, subject, minRate, maxRate, page = 1, limit = 10 } = filters;

  const skip = (page - 1) * limit;

  const profileWhere: any = {};
  if (subject) profileWhere.subjects = { contains: subject, mode: "insensitive" };
  if (minRate !== undefined) profileWhere.hourlyRate = { ...profileWhere.hourlyRate, gte: minRate };
  if (maxRate !== undefined) profileWhere.hourlyRate = { ...profileWhere.hourlyRate, lte: maxRate };

  const userWhere: any = {
    role: "TRAINER",
    status: "ACTIVE",
    ...(Object.keys(profileWhere).length > 0 && { trainerProfile: profileWhere }),
  };

  if (search) {
    userWhere.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { trainerProfile: { subjects: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [tutors, total] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      include: {
        trainerProfile: true,
        receivedReviews: { select: { rating: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: userWhere }),
  ]);

  const tutorsWithRating = tutors.map((tutor) => {
    const reviews = (tutor as any).receivedReviews as { rating: number }[];
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    return {
      id: tutor.id,
      name: tutor.name,
      email: tutor.email,
      bio: tutor.trainerProfile?.bio,
      subjects: tutor.trainerProfile?.subjects,
      experience: tutor.trainerProfile?.experience,
      hourlyRate: tutor.trainerProfile?.hourlyRate,
      profileImage: tutor.trainerProfile?.profileImage,
      avgRating: parseFloat(avgRating.toFixed(1)),
      totalReviews: reviews.length,
    };
  });

  return {
    tutors: tutorsWithRating,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getTutorById = async (tutorId: string) => {
  const tutor = await prisma.user.findFirst({
    where: { id: tutorId, role: "TRAINER", status: "ACTIVE" },
    include: {
      trainerProfile: true,
      receivedReviews: {
        include: {
          student: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      slots: {
        where: { isBooked: false },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!tutor) throw new Error("TUTOR_NOT_FOUND");

  const reviews = (tutor as any).receivedReviews as { rating: number }[];
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return {
    id: tutor.id,
    name: tutor.name,
    email: tutor.email,
    bio: tutor.trainerProfile?.bio,
    subjects: tutor.trainerProfile?.subjects,
    experience: tutor.trainerProfile?.experience,
    hourlyRate: tutor.trainerProfile?.hourlyRate,
    profileImage: tutor.trainerProfile?.profileImage,
    availableSlots: tutor.slots,
    reviews: (tutor as any).receivedReviews,
    avgRating: parseFloat(avgRating.toFixed(1)),
    totalReviews: reviews.length,
  };
};

export const getTutorProfileFromDB = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { trainerProfile: true },
  });

  if (!user) throw new Error("TUTOR_NOT_FOUND");

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.trainerProfile,
  };
};

export const updateTutorProfileIntoDB = async (
  userId: string,
  payload: {
    bio?: string;
    subjects?: string;
    experience?: number;
    hourlyRate?: number;
    profileImage?: string;
  }
) => {
  const result = await prisma.trainerProfile.upsert({
    where: { userId },
    update: { ...payload },
    create: { userId, ...payload },
  });
  return result;
};
