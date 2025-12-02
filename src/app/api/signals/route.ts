import { NextResponse } from "next/server";
import db, { initDB } from "@/lib/db";

// Initialize DB on first load (safe to run multiple times)
initDB();

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate the incoming signal data
        if (!body.symbol || !body.status) {
            return NextResponse.json({ error: "Invalid signal format" }, { status: 400 });
        }

        console.log("Received Signal Update:", body);

        const stmt = db.prepare(`
            INSERT INTO signals (symbol, type, status, pips, tp_level, channel_id, channel_name, risk_pips, reward_pips, rr_ratio, profit, open_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const info = stmt.run(
            body.symbol,
            body.type,
            body.status,
            body.pips || 0,
            body.tp_level || 0,
            body.channel_id || null,
            body.channel_name || "Unknown",
            body.risk_pips || 0,
            body.reward_pips || 0,
            body.rr_ratio || 0,
            body.profit || 0,
            body.open_time || null
        );

        return NextResponse.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        console.error("Signal API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const stmt = db.prepare('SELECT * FROM signals ORDER BY timestamp DESC');
        const signals = stmt.all();
        return NextResponse.json(signals);
    } catch (error) {
        console.error("Signal API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


