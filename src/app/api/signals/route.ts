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
            INSERT INTO signals (symbol, type, status, pips, tp_level)
            VALUES (?, ?, ?, ?, ?)
        `);

        const info = stmt.run(
            body.symbol,
            body.type,
            body.status,
            body.pips || 0,
            body.tp_level || 0
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


