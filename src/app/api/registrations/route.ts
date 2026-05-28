import { NextResponse } from "next/server";
import { createPendingRegistration } from "@/lib/registrations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = asString(body.name);
    const country = asString(body.country);
    const email = asString(body.email).toLowerCase();
    const discordUserId = asString(body.discordUserId);
    const discordUsername = asString(body.discordUsername);
    const telegramUsername = asString(body.telegramUsername);

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Skriv inn fullt navn slik det står hos brokeren." },
        { status: 400 }
      );
    }

    if (country.length < 2) {
      return NextResponse.json(
        { error: "Skriv inn landet du registrerte deg fra." },
        { status: 400 }
      );
    }

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { error: "Skriv inn en gyldig e-postadresse." },
        { status: 400 }
      );
    }

    if (!discordUserId && !discordUsername && !telegramUsername) {
      return NextResponse.json(
        { error: "Legg inn Discord eller Telegram, så vi kan gi deg tilgang." },
        { status: 400 }
      );
    }

    const result = createPendingRegistration({
      name,
      country,
      email,
      discordUserId,
      discordUsername,
      telegramUsername,
      source: "website",
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: 409 }
      );
    }

    return NextResponse.json({
      id: result.id.toString(),
      message: result.message,
    });
  } catch (error) {
    console.error("Failed to create registration", error);
    return NextResponse.json(
      { error: "Kunne ikke sende inn verifisering akkurat nå." },
      { status: 500 }
    );
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
