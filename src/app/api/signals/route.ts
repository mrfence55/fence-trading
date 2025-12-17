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

        // Check if signal already exists (same symbol + channel + open_time)
        if (body.open_time && body.channel_id) {
            // Try exact match first
            let existing = db.prepare(`
                SELECT id FROM signals 
                WHERE symbol = ? AND channel_id = ? AND open_time = ?
            `).get(body.symbol, body.channel_id, body.open_time) as { id: number } | undefined;

            // Fallback: If not found, try matching the first 19 characters (YYYY-MM-DDTHH:MM:SS)
            // This handles potential "Z" vs "+00:00" discrepancies
            if (!existing) {
                const timePrefix = body.open_time.substring(0, 19);
                existing = db.prepare(`
                    SELECT id FROM signals 
                    WHERE symbol = ? AND channel_id = ? AND substr(open_time, 1, 19) = ?
                 `).get(body.symbol, body.channel_id, timePrefix) as { id: number } | undefined;
            }

            if (existing) {
                // Update existing signal
                const stmt = db.prepare(`
                    UPDATE signals 
                    SET status = ?, pips = ?, tp_level = ?, risk_pips = ?, 
                        reward_pips = ?, rr_ratio = ?, profit = ?
                    WHERE id = ?
                `);

                stmt.run(
                    body.status,
                    body.pips || 0,
                    body.tp_level || 0,
                    body.risk_pips || 0,
                    body.reward_pips || 0,
                    body.rr_ratio || 0,
                    body.profit || 0,
                    existing.id
                );

                return NextResponse.json({ success: true, id: existing.id, updated: true });
            }
        }

        // Create new signal
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

        return NextResponse.json({ success: true, id: info.lastInsertRowid, updated: false });
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

