import { NextRequest, NextResponse } from "next/server";
import { generateLandingContent } from "@/lib/gemini";

export async function POST(request: NextRequest) {
    try {
        const { brandName, idea, tagline } = await request.json();

        if (!brandName || !idea) {
            return NextResponse.json(
                { error: "Brand name and idea are required" },
                { status: 400 }
            );
        }

        const content = await generateLandingContent(
            brandName,
            idea,
            tagline || ""
        );

        return NextResponse.json({
            success: true,
            data: content,
        });
    } catch (error) {
        console.error("Content generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate content" },
            { status: 500 }
        );
    }
}
