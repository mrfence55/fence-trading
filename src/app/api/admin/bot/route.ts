import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LOCAL_SERVICE_URL = "http://127.0.0.1:3005";
const DEFAULT_ADMIN_PASSWORD = "Spetalen.123";

// Helper to check password
function verifyPassword(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  
  // Format: "Bearer <password>"
  const token = authHeader.split(" ")[1];
  const adminPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  
  return token === adminPassword;
}

export async function POST(request: Request) {
  try {
    // 1. Verify Password
    if (!verifyPassword(request)) {
      return NextResponse.json({ error: "Uautorisert: Feil admin-passord" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    // 2. Proxy to local python service running on localhost:3005
    if (action === "status") {
      const res = await fetch(`${LOCAL_SERVICE_URL}/status`, { cache: "no-store" });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    
    if (action === "connect") {
      const { phone } = body;
      const res = await fetch(`${LOCAL_SERVICE_URL}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    
    if (action === "verify") {
      const { phone, code, phone_code_hash, password } = body;
      const res = await fetch(`${LOCAL_SERVICE_URL}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, phone_code_hash, password }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    if (action === "logs") {
      const { app } = body;
      const res = await fetch(`${LOCAL_SERVICE_URL}/logs?app=${app || "fence-bot"}`, { cache: "no-store" });
      const text = await res.text();
      return new Response(text, {
        status: res.status,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    if (action === "process") {
      const { subAction, app } = body; // subAction: "restart", "stop", "start"
      const res = await fetch(`${LOCAL_SERVICE_URL}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: subAction, app }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    if (action === "deploy") {
      const res = await fetch(`${LOCAL_SERVICE_URL}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json({ error: "Ugyldig action" }, { status: 400 });

  } catch (error) {
    console.error("Bot API Proxy Error:", error);
    return NextResponse.json(
      { error: "Kunne ikke kontakte den lokale bot-tjenesten. Kjører bot_admin_service.py på port 3005?" },
      { status: 502 }
    );
  }
}
