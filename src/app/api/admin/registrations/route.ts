import { NextResponse } from "next/server";
import {
  listAdminRegistrations,
  manuallyVerifyPendingRegistration,
  updatePendingRegistrationStatus,
} from "@/lib/registrations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    return NextResponse.json(listAdminRegistrations());
  } catch (error) {
    console.error("Failed to load admin registrations", error);
    return NextResponse.json(
      { error: "Kunne ikke hente verifiseringer." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const body = await request.json();
    const id = Number(body.id);
    const status = typeof body.status === "string" ? body.status.trim() : "";

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Ugyldig request ID." },
        { status: 400 }
      );
    }

    const result =
      status === "verified"
        ? manuallyVerifyPendingRegistration({
            pendingId: id,
            tradeNationUserId: asString(body.tradeNationUserId),
            tradeNationName: asString(body.tradeNationName),
            tradeNationCountry: asString(body.tradeNationCountry),
            tradeNationRegistrationDate: asString(
              body.tradeNationRegistrationDate
            ),
          })
        : updatePendingRegistrationStatus(id, status);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: result.code === "not_found" ? 404 : 400 }
      );
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error("Failed to update admin registration", error);
    return NextResponse.json(
      { error: "Kunne ikke oppdatere verifiseringen." },
      { status: 500 }
    );
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requireAdminToken(request: Request) {
  const expected = process.env.ADMIN_TOKEN;

  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_TOKEN er ikke satt på serveren." },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const headerToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-admin-token") ||
    "";
  const queryToken = url.searchParams.get("token") || "";

  if (headerToken !== expected && queryToken !== expected) {
    return NextResponse.json(
      { error: "Admin-token mangler eller er feil." },
      { status: 401 }
    );
  }

  return null;
}
