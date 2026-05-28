import { NextResponse } from "next/server";
import db, { initDB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    initDB();

    const signals = db
      .prepare(
        `SELECT
          id,
          symbol,
          type,
          status,
          pips,
          tp_level,
          timestamp,
          open_time,
          channel_id,
          channel_name,
          risk_pips,
          reward_pips,
          rr_ratio,
          profit,
          fingerprint
        FROM signals
        ORDER BY COALESCE(open_time, timestamp) DESC
        LIMIT 500`
      )
      .all();

    return NextResponse.json(signals);
  } catch (error) {
    console.error("Failed to load signals", error);
    return NextResponse.json(
      { error: "Failed to load signals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    initDB();
    const body = await request.json();

    // Check if the request is a database reset
    if (body && body.action === "reset") {
      db.prepare("DELETE FROM signals").run();
      console.log("Website signals database cleared successfully.");
      return NextResponse.json({ message: "Database cleared successfully" });
    }

    // Extract signal fields
    const symbol = body.symbol;
    const type = body.type || "LONG";
    const status = body.status || "OPEN";
    const pips = typeof body.pips === "number" ? body.pips : null;
    const tp_level = typeof body.tp_level === "number" ? body.tp_level : null;
    const open_time = body.open_time || null;
    const channel_id = typeof body.channel_id === "number" ? body.channel_id : null;
    const channel_name = body.channel_name || null;
    const risk_pips = typeof body.risk_pips === "number" ? body.risk_pips : null;
    const reward_pips = typeof body.reward_pips === "number" ? body.reward_pips : null;
    const rr_ratio = typeof body.rr_ratio === "number" ? body.rr_ratio : null;
    const profit = typeof body.profit === "number" ? body.profit : null;
    const fingerprint = body.fingerprint || null;

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    // Check if the signal already exists (by fingerprint OR symbol+channel_id+open_time)
    let existing: any = null;
    if (fingerprint) {
      existing = db.prepare("SELECT id FROM signals WHERE fingerprint = ?").get(fingerprint);
    }
    if (!existing && symbol && channel_id && open_time) {
      existing = db.prepare(
        "SELECT id FROM signals WHERE symbol = ? AND channel_id = ? AND open_time = ?"
      ).get(symbol, channel_id, open_time);
    }

    if (existing) {
      // Update existing signal
      db.prepare(`
        UPDATE signals SET
          symbol = ?,
          type = ?,
          status = ?,
          pips = ?,
          tp_level = ?,
          open_time = ?,
          channel_id = ?,
          channel_name = ?,
          risk_pips = ?,
          reward_pips = ?,
          rr_ratio = ?,
          profit = ?,
          fingerprint = ?
        WHERE id = ?
      `).run(
        symbol,
        type,
        status,
        pips,
        tp_level,
        open_time,
        channel_id,
        channel_name,
        risk_pips,
        reward_pips,
        rr_ratio,
        profit,
        fingerprint,
        existing.id
      );
      return NextResponse.json({ message: "Signal updated successfully", id: existing.id });
    } else {
      // Insert new signal
      const info = db.prepare(`
        INSERT INTO signals (
          symbol, type, status, pips, tp_level, open_time, 
          channel_id, channel_name, risk_pips, reward_pips, rr_ratio, profit, fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        symbol,
        type,
        status,
        pips,
        tp_level,
        open_time,
        channel_id,
        channel_name,
        risk_pips,
        reward_pips,
        rr_ratio,
        profit,
        fingerprint
      );
      return NextResponse.json({ message: "Signal created successfully", id: info.lastInsertRowid.toString() });
    }
  } catch (error) {
    console.error("Failed to process signal POST", error);
    return NextResponse.json({ error: "Failed to process signal" }, { status: 500 });
  }
}

