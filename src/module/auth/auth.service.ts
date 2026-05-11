import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";


const JWT_SECRET = process.env.JWT_SECRET as string;

export const registerUser = async (payload: {
  name: string;
  email: string;
  password: string;
  role?: string;
}) => {
  const { name, email, password, role } = payload;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("USER_EXISTS");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Accept "tutor" / "TUTOR" / "trainer" / "TRAINER" from the frontend
  const normalizedRole = role?.toUpperCase();
  const isTrainer = normalizedRole === "TRAINER" || normalizedRole === "TUTOR";
  const userRole = isTrainer ? "TRAINER" : "STUDENT";
  const status = isTrainer ? "PENDING" : "ACTIVE";

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: userRole,
      status,
    },
  });

  return user;
};

export const loginUser = async (payload: {
  email: string;
  password: string;
}) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (user.status === "BLOCKED") {
    throw new Error("BLOCKED");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      status: user.status,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { user, token };
};

export const updateUserProfile = async (
  userId: string,
  payload: { name?: string; image?: string }
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(payload.name ? { name: payload.name } : {}),
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
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      trainerProfile: true,
    },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return user;
};
