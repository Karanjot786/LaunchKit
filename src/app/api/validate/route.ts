import { NextRequest, NextResponse } from "next/server";
import { runValidationPipeline, type EnhancedValidationResult } from "@/lib/validation";

export async function POST(request: NextRequest) {
    try {
        const {
            idea,
            mode = "quick",
            model = "gemini-3-flash-preview"
        } = await request.json();

        if (!idea) {
            return NextResponse.json(
                { error: "Idea is required" },
                { status: 400 }
            );
        }

        // Validate mode parameter
        const validModes = ["quick", "deep"];
        const selectedMode = validModes.includes(mode) ? mode : "quick";

        // Validate model parameter
        const validModels = ["gemini-3-flash-preview", "gemini-3-pro-preview"];
        const selectedModel = validModels.includes(model) ? model : "gemini-3-flash-preview";

        console.log(`[Validate] Starting ${selectedMode} validation with ${selectedModel} for:`, idea.substring(0, 50) + "...");
        const startTime = Date.now();

        // Run the validation pipeline with selected mode and model
        const result: EnhancedValidationResult = await runValidationPipeline(
            idea,
            selectedMode as "quick" | "deep",
            selectedModel
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Validate] Complete in ${duration}s. Score: ${result.scores.viability}`);

        return NextResponse.json({
            success: true,
            mode: selectedMode,
            model: selectedModel,
            duration: `${duration}s`,
            data: result,
        });

    } catch (error) {
        console.error("[Validate] Error:", error);
        return NextResponse.json(
            {
                error: "Validation failed",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
