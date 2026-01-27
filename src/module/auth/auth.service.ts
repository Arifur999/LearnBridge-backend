import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";


const JWT_SECRET = process.env.JWT_SECRET as string;

export const registerUser = async (payload: {
  name: string;
  email: string;
  password: string;
  role?: "STUDENT" | "TRAINER";
}) => {
  const { name, email, password, role } = payload;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("USER_EXISTS");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const userRole = role === "TRAINER" ? "TRAINER" : "STUDENT";
  const status = userRole === "TRAINER" ? "PENDING" : "ACTIVE";

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
