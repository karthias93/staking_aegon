import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export function requireAuth(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return { error: "No token provided" };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret");
    return { decoded };
  } catch {
    return { error: "Invalid or expired token" };
  }
}
