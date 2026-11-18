import { apiHandler, parseJsonBody } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionResponse } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async (req) => {
  const input = await parseJsonBody(req, loginSchema);

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const isValid = await verifyPassword(input.password, user.passwordHash);
  if (!isValid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  return createSessionResponse({
    id: user.id,
    email: user.email,
    name: user.name,
    isDemo: user.isDemo,
  });
});
