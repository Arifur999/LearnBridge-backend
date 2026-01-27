import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";


const JWT_SECRET = process.env.JWT_SECRET as string;


 //  REGISTER

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

   
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

 
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }


    const hashedPassword = await bcrypt.hash(password, 10);

   
    const userRole = role === "TRAINER" ? "TRAINER" : "STUDENT";
    const status = userRole === "TRAINER" ? "PENDING" : "ACTIVE";

    // create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole,
        status,
      },
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


   //LOGIN

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.status === "BLOCKED") {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked",
      });
    }

    // generate token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        status: user.status,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
