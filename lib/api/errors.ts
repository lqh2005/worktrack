import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = "ERROR",
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message = "Bad request", details?: unknown) {
    return new ApiError(400, message, "BAD_REQUEST", details);
  }
  static unauthorized(message = "Authentication required") {
    return new ApiError(401, message, "UNAUTHORIZED");
  }
  static forbidden(message = "You do not have permission to perform this action") {
    return new ApiError(403, message, "FORBIDDEN");
  }
  static notFound(resource = "Resource") {
    return new ApiError(404, `${resource} not found`, "NOT_FOUND");
  }
  static conflict(message: string, code = "CONFLICT", details?: unknown) {
    return new ApiError(409, message, code, details);
  }
  static unprocessable(message: string, code = "UNPROCESSABLE_ENTITY", details?: unknown) {
    return new ApiError(422, message, code, details);
  }
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function errorJson(status: number, code: string, message: string, details?: unknown) {
  const body: ApiErrorBody = {
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  return NextResponse.json(body, { status });
}

export function errorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ApiError) {
    return errorJson(error.status, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    const flat = error.flatten();
    return errorJson(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid input", {
      fieldErrors: flat.fieldErrors,
      formErrors: flat.formErrors,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return errorJson(409, "CONFLICT", "Record already exists", {
          target: error.meta?.target,
        });
      case "P2003":
        return errorJson(409, "CONFLICT", "Related record not found");
      case "P2025":
        return errorJson(404, "NOT_FOUND", "Record not found");
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("Database connection error:", error.message);
    return errorJson(503, "SERVICE_UNAVAILABLE", "Database connection failed. Please try again.");
  }

  console.error("Server error:", error);
  return errorJson(500, "INTERNAL_ERROR", "Internal server error");
}

export function isPrismaError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}
