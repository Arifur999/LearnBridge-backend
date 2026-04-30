import { prisma } from "../../lib/prisma";

export const getAllTutors = async (filters: {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}) => {
  const { search, category, minPrice, maxPrice, page = 1, limit = 10 } = filters;

  const where: any = {
    role: "TRAINER",
    status: "ACTIVE",
    isApproved: true,
  };

  // Build include for courses with filters
  const include: any = {
    trainerProfile: true,
    courses: {
      where: {
        status: "APPROVED",
        ...(category && { category }),
        ...(minPrice !== undefined && { price: { gte: minPrice } }),
        ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
      },
      select: {
        id: true,
        title: true,
        category: true,
        price: true,
      },
    },
  };

  const skip = (page - 1) * limit;

  const [tutors, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  // Transform data to include average rating
  const tutorsWithRating = await Promise.all(
    tutors.map(async (tutor) => {
      const reviews = await prisma.review.findMany({
        where: {
          course: {
            trainerId: tutor.id,
          },
        },
        select: {
          rating: true,
        },
      });

      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      return {
        id: tutor.id,
        name: tutor.name,
        email: tutor.email,
        bio: tutor.trainerProfile?.bio,
        skills: tutor.trainerProfile?.skills,
        experience: tutor.trainerProfile?.experience,
        courses: tutor.courses,
        avgRating: parseFloat(avgRating.toFixed(1)),
        totalReviews: reviews.length,
      };
    })
  );

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
    where: {
      id: tutorId,
      role: "TRAINER",
      status: "ACTIVE",
    },
    include: {
      trainerProfile: true,
      courses: {
        where: { status: "APPROVED" },
        include: {
          reviews: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
      },
    },
  });

  if (!tutor) {
    throw new Error("TUTOR_NOT_FOUND");
  }

  // Calculate average rating
  const allReviews = tutor.courses.flatMap((course) => course.reviews);
  const avgRating =
    allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

  return {
    id: tutor.id,
    name: tutor.name,
    email: tutor.email,
    bio: tutor.trainerProfile?.bio,
    skills: tutor.trainerProfile?.skills,
    experience: tutor.trainerProfile?.experience,
    courses: tutor.courses.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      price: course.price,
      reviews: course.reviews,
      enrollments: course._count.enrollments,
    })),
    avgRating: parseFloat(avgRating.toFixed(1)),
    totalReviews: allReviews.length,
  };
};