import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

// Database path - relative to project root
const DB_PATH = path.join(process.cwd(), "affiliates.db");

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fullName, country, email, discordUsername } = body;

        // Validate input
        if (!email || !fullName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Store in SQLite database
        try {
            const db = new Database(DB_PATH);

            // Ensure table exists
            db.exec(`
                CREATE TABLE IF NOT EXISTS pending_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    country TEXT,
                    email TEXT NOT NULL,
                    discord_user_id TEXT,
                    source TEXT DEFAULT 'website',
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Check if already registered
            const existing = db.prepare(
                "SELECT 1 FROM pending_requests WHERE LOWER(email) = LOWER(?) AND status = 'pending'"
            ).get(email);

            if (existing) {
                db.close();
                return NextResponse.json({
                    error: "This email already has a pending registration"
                }, { status: 400 });
            }

            // Check affiliates table too
            const verified = db.prepare(
                "SELECT 1 FROM affiliates WHERE LOWER(email) = LOWER(?)"
            ).get(email);

            if (verified) {
                db.close();
                return NextResponse.json({
                    error: "This email is already verified"
                }, { status: 400 });
            }

            // Insert new pending registration
            const stmt = db.prepare(`
                INSERT INTO pending_requests (name, country, email, discord_user_id, source, status)
                VALUES (?, ?, ?, ?, 'website', 'pending')
            `);
            const result = stmt.run(fullName.trim(), country?.trim() || "", email.trim().toLowerCase(), discordUsername || null);

            db.close();
            console.log(`Registration stored in DB: ID=${result.lastInsertRowid}`);
        } catch (dbError) {
            console.error("Database error:", dbError);
            // Continue to send webhook even if DB fails
        }

        // Send to Discord Webhook
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

        if (webhookUrl) {
            await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    embeds: [
                        {
                            title: "📝 New Verification Request",
                            color: 0x06b6d4, // Cyan
                            fields: [
                                { name: "Full Name", value: fullName, inline: true },
                                { name: "Country", value: country || "N/A", inline: true },
                                { name: "Email", value: email, inline: false },
                                { name: "Discord", value: discordUsername || "Not provided", inline: true },
                                { name: "Source", value: "Website", inline: true },
                                { name: "Time", value: new Date().toISOString() },
                            ],
                        },
                    ],
                }),
            });
        } else {
            console.log("Mock Webhook Sent:", { email, fullName, country, discordUsername });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Verification Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
