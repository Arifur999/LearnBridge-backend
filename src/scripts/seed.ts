import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";

async function seedAdmin() {
  const admins = [
    {
      name: "Super Admin",
      email: "admin@skillbridge.com",
      password: "Admin@123",
    },
  ];

  for (const admin of admins) {
    const exists = await prisma.user.findUnique({
      where: { email: admin.email },
    });

    if (exists) {
      console.log(`⚠️  Admin already exists: ${admin.email}`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(admin.password, 10);

    await prisma.user.create({
      data: {
        name: admin.name,
        email: admin.email,
        password: hashedPassword,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    console.log(`✅ Admin created: ${admin.email}`);
  }
}

seedAdmin()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
