import { apiHandler, parseJsonBody } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { hashPassword } from "@/lib/auth/password";
import { createSessionResponse } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async (req) => {
  const input = await parseJsonBody(req, registerSchema);

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw ApiError.conflict("Email is already registered", "EMAIL_TAKEN", {
      fieldErrors: { email: ["Email is already registered"] },
    });
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    },
    select: { id: true, email: true, name: true, isDemo: true },
  });

  return createSessionResponse(user, 201);
});
