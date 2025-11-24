import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, tradeNationId, discordUsername } = body;

        // Validate input
        if (!email || !tradeNationId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Send to Discord Webhook
        // Note: In a real app, use process.env.DISCORD_WEBHOOK_URL
        // For now, we will just log it or simulate success if no env var is set.
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

        if (webhookUrl) {
            await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    embeds: [
                        {
                            title: "New Verification Request",
                            color: 0x06b6d4, // Cyan
                            fields: [
                                { name: "Email", value: email, inline: true },
                                { name: "Trade Nation ID", value: tradeNationId, inline: true },
                                { name: "Discord User", value: discordUsername || "N/A", inline: true },
                                { name: "Time", value: new Date().toISOString() },
                            ],
                        },
                    ],
                }),
            });
        } else {
            console.log("Mock Webhook Sent:", { email, tradeNationId, discordUsername });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Verification Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
