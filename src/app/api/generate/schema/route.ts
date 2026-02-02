import { NextRequest, NextResponse } from "next/server";
import { generateAppSchema } from "@/lib/gemini";

export async function POST(request: NextRequest) {
    try {
        const { idea, appType = "SaaS" } = await request.json();

        if (!idea || typeof idea !== "string") {
            return NextResponse.json(
                { error: "Idea is required" },
                { status: 400 }
            );
        }

        const schema = await generateAppSchema(idea, appType);

        return NextResponse.json({
            success: true,
            data: schema,
        });
    } catch (error) {
        console.error("App schema error:", error);
        return NextResponse.json(
            { error: "Failed to generate app schema" },
            { status: 500 }
        );
    }
}
