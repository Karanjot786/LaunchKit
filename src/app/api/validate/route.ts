import { NextRequest, NextResponse } from "next/server";
import { runValidationPipeline, type EnhancedValidationResult } from "@/lib/validation";

export async function POST(request: NextRequest) {
    try {
        const { idea } = await request.json();

        if (!idea) {
            return NextResponse.json(
                { error: "Idea is required" },
                { status: 400 }
            );
        }

        console.log("Starting enhanced validation for:", idea.substring(0, 50) + "...");

        // Run the full validation pipeline
        const result: EnhancedValidationResult = await runValidationPipeline(idea);

        console.log("Validation complete. Score:", result.scores.viability);

        return NextResponse.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error("Validation error:", error);
        return NextResponse.json(
            {
                error: "Validation failed",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
