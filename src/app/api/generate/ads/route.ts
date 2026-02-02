import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/gemini";

export async function POST(request: NextRequest) {
    try {
        const { brandName, tagline, style = "social media" } = await request.json();

        if (!brandName) {
            return NextResponse.json(
                { error: "Brand name is required" },
                { status: 400 }
            );
        }

        // Generate two ad creatives
        const adPrompts = [
            // Square format for Instagram/Facebook
            `Create a professional social media advertisement for "${brandName}".
Tagline: "${tagline || 'The Future Starts Here'}"
Style: Modern, eye-catching, professional
Format: Square (1:1 aspect ratio)
Requirements:
- Bold, readable text with the brand name prominently displayed
- Clean, minimal design with strong visual hierarchy
- Use vibrant but professional colors
- Include a clear call-to-action area
- Suitable for Instagram, Facebook, LinkedIn
Do NOT include: Generic stock photos, cluttered layouts, low contrast text`,

            // Landscape format for web/Twitter
            `Create a professional web banner advertisement for "${brandName}".
Tagline: "${tagline || 'Transform Your Ideas Into Reality'}"
Style: Premium tech startup aesthetic
Format: Landscape (16:9 aspect ratio)
Requirements:
- Modern gradient or abstract background
- Brand name as hero text
- Subtle visual elements that convey innovation
- Space for CTA button overlay
- Works for Twitter headers, website banners
Do NOT include: Faces, complex scenes, busy backgrounds`
        ];

        const creatives = await Promise.all(
            adPrompts.map(async (prompt, index) => {
                const imageBuffer = await generateImage(prompt);
                if (imageBuffer) {
                    return {
                        id: index + 1,
                        type: index === 0 ? "square" : "landscape",
                        platform: index === 0 ? "Instagram/Facebook" : "Twitter/Web",
                        image: `data:image/png;base64,${imageBuffer.toString("base64")}`
                    };
                }
                return null;
            })
        );

        const validCreatives = creatives.filter(Boolean);

        if (validCreatives.length === 0) {
            return NextResponse.json(
                { error: "Failed to generate ad creatives" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: validCreatives
        });

    } catch (error) {
        console.error("Ad generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate ad creatives" },
            { status: 500 }
        );
    }
}
