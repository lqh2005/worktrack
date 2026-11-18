import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_USER } from "../lib/demo/constants";
import { resetDemoWorkspace } from "../lib/demo/demo-workspace";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);

  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: { name: DEMO_USER.name, passwordHash, isDemo: true },
    create: {
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      passwordHash,
      isDemo: true,
    },
  });

  const result = await resetDemoWorkspace(prisma, demoUser.id);

  console.log(`Demo account: ${DEMO_USER.email} / ${DEMO_USER.password}`);
  console.log(`Created ${result.projects} projects, ${result.issues} issues, ${result.activityLogs} logs.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed error:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
