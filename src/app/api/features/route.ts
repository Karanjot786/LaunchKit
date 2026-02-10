import { NextRequest, NextResponse } from "next/server";
import { brainstormFeatures, deepDiveFeature, type Feature } from "@/lib/feature-brainstorm";

export async function POST(request: NextRequest) {
    try {
        const { action, validationData, feature, model } = await request.json();

        if (!validationData) {
            return NextResponse.json(
                { error: "Validation data is required" },
                { status: 400 }
            );
        }

        const startTime = Date.now();

        // Handle different actions
        if (action === "deep-dive") {
            if (!feature) {
                return NextResponse.json(
                    { error: "Feature is required for deep-dive" },
                    { status: 400 }
                );
            }

            console.log(`[Features] Deep diving into: ${feature.title}`);
            const deepDive = await deepDiveFeature(feature as Feature, validationData, model);
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[Features] Deep dive complete in ${duration}s`);

            return NextResponse.json({
                success: true,
                action: "deep-dive",
                duration: `${duration}s`,
                data: deepDive,
            });
        }

        // Default: brainstorm features
        console.log("[Features] Starting feature brainstorming...");
        const features = await brainstormFeatures(validationData, model);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        const totalFeatures = features.mvp.length + features.stretch.length + features.moonshots.length;
        console.log(`[Features] Generated ${totalFeatures} features in ${duration}s`);

        return NextResponse.json({
            success: true,
            action: "brainstorm",
            duration: `${duration}s`,
            data: features,
        });

    } catch (error) {
        console.error("[Features] Error:", error);
        return NextResponse.json(
            {
                error: "Feature brainstorming failed",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
