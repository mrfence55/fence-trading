import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fullName, country, email } = body;

        // Validate input
        if (!email || !fullName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
                            title: "New Verification Request",
                            color: 0x06b6d4, // Cyan
                            fields: [
                                { name: "Full Name", value: fullName, inline: true },
                                { name: "Country", value: country || "N/A", inline: true },
                                { name: "Email", value: email, inline: false }, // Email on new line for readability
                                { name: "Time", value: new Date().toISOString() },
                            ],
                        },
                    ],
                }),
            });
        } else {
            console.log("Mock Webhook Sent:", { email, fullName, country });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Verification Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
