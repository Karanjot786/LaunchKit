import { NextRequest, NextResponse } from "next/server";
import { genAI, MODELS } from "@/lib/gemini";

// Logo style variations
const LOGO_STYLES = [
    {
        name: "minimalist",
        prompt: "Ultra minimalist, clean geometric shapes, single line weight, maximum negative space",
    },
    {
        name: "geometric",
        prompt: "Abstract geometric composition, overlapping shapes with transparency, modern tech aesthetic",
    },
    {
        name: "lettermark",
        prompt: "Stylized lettermark using first letter, custom typography, clever negative space, professional and memorable",
    },
    {
        name: "icon",
        prompt: "Simple iconic symbol, instantly recognizable, works at any size, flat design",
    },
    {
        name: "wordmark",
        prompt: "Custom wordmark typography, modern sans-serif, unique letter connections, balanced spacing",
    },
    {
        name: "emblem",
        prompt: "Modern emblem style, contained in geometric shape, balanced composition, premium feel",
    },
];

interface ColorPalette {
    primary: string;
    secondary: string;
    accent: string;
}

async function generateSingleLogo(
    brandName: string,
    style: typeof LOGO_STYLES[0],
    category?: string,
    tagline?: string,
    colorPalette?: ColorPalette
): Promise<string | null> {
    const model = genAI.models;

    const contextInfo = category ? `This is a ${category} startup` : "This is a tech startup";
    const taglineInfo = tagline ? `Tagline: "${tagline}"` : "";

    // Build color instruction
    const colorInstruction = colorPalette
        ? `BRAND COLORS (use these exact colors):
   - Primary color: ${colorPalette.primary}
   - Secondary color: ${colorPalette.secondary}  
   - Accent color: ${colorPalette.accent}
   The logo MUST prominently feature the primary brand color (${colorPalette.primary}).`
        : "Use modern, professional colors suitable for a tech brand.";

    const prompt = `Create a professional logo for "${brandName}".

Context: ${contextInfo}. ${taglineInfo}

Style: ${style.prompt}

${colorInstruction}

CRITICAL Requirements:
- Vector-style flat design on pure white background (#FFFFFF)
- Logo must be centered and fill 80% of the frame
- High contrast, works at 32px and 512px sizes
- No text unless specifically a wordmark/lettermark style
- No realistic imagery, shadows, or 3D effects
- Simple, memorable, timeless design
- Professional tech startup aesthetic

Output: A single clean logo using the brand colors, centered on white background.`;

    try {
        const response = await model.generateContent({
            model: MODELS.IMAGE,
            contents: prompt,
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                // Return raw base64 data (for Storage upload)
                return part.inlineData.data as string;
            }
        }
    } catch (error) {
        console.error(`Failed to generate ${style.name} logo:`, error);
    }

    return null;
}

export async function POST(request: NextRequest) {
    try {
        const { brandName, category, tagline, colorPalette, count = 4, projectId } = await request.json();

        if (!brandName || typeof brandName !== "string") {
            return NextResponse.json(
                { error: "Brand name is required" },
                { status: 400 }
            );
        }

        console.log(`Generating ${count} logos for "${brandName}" with colors:`, colorPalette?.primary || "default");

        // Select styles for generation
        const selectedStyles = LOGO_STYLES.slice(0, Math.min(count, 6));

        // Generate logos in parallel with color palette
        const logoPromises = selectedStyles.map((style) =>
            generateSingleLogo(brandName, style, category, tagline, colorPalette)
        );

        const results = await Promise.all(logoPromises);

        // Filter out failed generations and prepare for upload
        const generatedLogos = results
            .map((base64Data, index) => ({
                id: index,
                style: selectedStyles[index].name,
                base64Data,
            }))
            .filter((item) => item.base64Data !== null);

        if (generatedLogos.length === 0) {
            return NextResponse.json(
                { error: "Failed to generate any logos" },
                { status: 500 }
            );
        }

        console.log(`Successfully generated ${generatedLogos.length} logos`);

        // Return data URLs for preview - only the selected logo will be uploaded later
        const logos: { id: number; style: string; image: string }[] = [];
        for (const logo of generatedLogos) {
            logos.push({
                id: logo.id,
                style: logo.style,
                image: `data:image/png;base64,${logo.base64Data}`,
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                logos,
                count: logos.length,
            },
        });
    } catch (error) {
        console.error("Logo generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate logos" },
            { status: 500 }
        );
    }
}
