import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate the incoming signal data
        if (!body.symbol || !body.status) {
            return NextResponse.json({ error: "Invalid signal format" }, { status: 400 });
        }

        console.log("Received Signal Update:", {
            symbol: body.symbol,
            type: body.type,
            status: body.status,
            pips: body.pips,
            tp_level: body.tp_level
        });

        // TODO: Save this to a database (e.g., Supabase, MongoDB)
        // For now, we just acknowledge receipt.
        // In a real app, you would:
        // 1. Find the signal by symbol/type
        // 2. Update its status and pips gained
        // 3. Recalculate aggregate stats

        return NextResponse.json({ success: true, message: "Signal received" });
    } catch (error) {
        console.error("Signal API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

