import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { PREVIEWABLE_ROLES, ROLE_PREVIEW_COOKIE } from "@/lib/role-preview";
import type { UserRole } from "@/lib/supabase/database.types";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.rol !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const role = body.role;
  if (typeof role !== "string" || !PREVIEWABLE_ROLES.includes(role as UserRole)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  if (role === "admin") {
    response.cookies.delete(ROLE_PREVIEW_COOKIE);
  } else {
    response.cookies.set(ROLE_PREVIEW_COOKIE, role, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
