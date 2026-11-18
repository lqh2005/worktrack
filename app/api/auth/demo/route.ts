import { apiHandler } from "@/lib/api/handler";
import { hashPassword } from "@/lib/auth/password";
import { createSessionResponse } from "@/lib/auth/session";
import { DEMO_USER } from "@/lib/demo/constants";
import { resetDemoWorkspace } from "@/lib/demo/demo-workspace";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async () => {
  let user = await prisma.user.findUnique({
    where: { email: DEMO_USER.email },
    select: { id: true, email: true, name: true, isDemo: true },
  });

  if (!user) {
    user = await prisma.user.upsert({
      where: { email: DEMO_USER.email },
      update: { name: DEMO_USER.name },
      create: {
        id: DEMO_USER.id,
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        passwordHash: await hashPassword(DEMO_USER.password),
        isDemo: true,
      },
      select: { id: true, email: true, name: true, isDemo: true },
    });
  }

  const projectCount = await prisma.project.count({ where: { ownerId: user.id } });
  if (projectCount === 0) {
    await resetDemoWorkspace(prisma, user.id);
  }

  return createSessionResponse(user);
});
