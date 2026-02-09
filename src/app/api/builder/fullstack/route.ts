/**
 * Full-Stack Generation API
 * 
 * Endpoint for generating backend, database, and auth code.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel, FunctionCallingConfigMode, Type, Content, Part, FunctionDeclaration } from "@google/genai";
import {
    FullStackExecutor,
    generateSupabaseClient,
    generateNextAuth,
} from "@/lib/fullstack-generator";

// Initialize Gemini
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
});

const MODEL = "gemini-3-flash-preview";

// =============================================================================
// TYPES
// =============================================================================

interface BrandContext {
    name: string;
    tagline: string;
    validation?: {
        category?: { primary: string; targetAudience: string };
    };
}

// =============================================================================
// TOOL DEFINITIONS (SDK-compatible format)
// =============================================================================

const createApiRouteTool: FunctionDeclaration = {
    name: "create_api_route",
    description: "Create a Next.js API route",
    parameters: {
        type: Type.OBJECT,
        properties: {
            path: { type: Type.STRING, description: "API route path (e.g., /api/users)" },
            method: { type: Type.STRING, description: "HTTP method (GET, POST, PUT, DELETE)" },
            description: { type: Type.STRING, description: "What this route does" },
            auth: { type: Type.BOOLEAN, description: "Requires authentication" },
        },
        required: ["path", "method", "description"],
    },
};

const createDatabaseTableTool: FunctionDeclaration = {
    name: "create_database_table",
    description: "Create a database table/model",
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Table name in PascalCase" },
            provider: { type: Type.STRING, description: "Database provider (supabase or prisma)" },
            fields: { type: Type.ARRAY, description: "Array of field definitions" },
        },
        required: ["name", "provider", "fields"],
    },
};

const setupAuthTool: FunctionDeclaration = {
    name: "setup_auth",
    description: "Set up authentication",
    parameters: {
        type: Type.OBJECT,
        properties: {
            provider: { type: Type.STRING, description: "Auth provider (supabase or next-auth)" },
            methods: { type: Type.ARRAY, description: "Auth methods (email, google, github)" },
        },
        required: ["provider", "methods"],
    },
};

const setupDatabaseTool: FunctionDeclaration = {
    name: "setup_database",
    description: "Initialize database configuration",
    parameters: {
        type: Type.OBJECT,
        properties: {
            provider: { type: Type.STRING, description: "Database provider (supabase or prisma)" },
        },
        required: ["provider"],
    },
};

const fullStackToolDeclarations: FunctionDeclaration[] = [
    createApiRouteTool,
    createDatabaseTableTool,
    setupAuthTool,
    setupDatabaseTool,
];

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

function buildFullStackPrompt(brand: BrandContext, task: string): string {
    return `You are a full-stack developer setting up backend infrastructure for ${brand.name}.

CONTEXT:
- Brand: ${brand.name}
- Category: ${brand.validation?.category?.primary || "startup"}
- Target: ${brand.validation?.category?.targetAudience || "users"}

TASK: ${task}

AVAILABLE TOOLS:
1. setup_database - Initialize database (supabase or prisma)
2. create_database_table - Create a database table with fields
3. setup_auth - Set up authentication (supabase, next-auth) with providers (email, google, github)
4. create_api_route - Create a Next.js API route

GUIDELINES:
- Use Supabase for quick setup, Prisma for more control
- Create appropriate tables for the app requirements
- Add necessary API routes for CRUD operations
- Secure routes that need authentication
- Generate production-ready, typed code

After setting up infrastructure, explain what was created and how to use it.`;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
    try {
        const { task, brandContext, type, config } = await request.json();

        // Quick actions without AI
        if (type === "setup") {
            return handleQuickSetup(config);
        }

        if (!task) {
            return NextResponse.json({ error: "Task required" }, { status: 400 });
        }

        console.log(`Full-stack API: "${task.slice(0, 50)}..."`);

        const systemPrompt = buildFullStackPrompt(brandContext, task);
        const executor = new FullStackExecutor();

        // Multi-turn loop for full-stack generation
        const contents: Content[] = [
            { role: "user", parts: [{ text: task }] },
        ];

        let turn = 0;
        const maxTurns = 5;
        let finalMessage = "";
        let allFiles: Record<string, string> = {};

        while (turn < maxTurns) {
            turn++;

            const response = await ai.models.generateContent({
                model: MODEL,
                contents,
                config: {
                    systemInstruction: systemPrompt,
                    tools: [{ functionDeclarations: fullStackToolDeclarations }],
                    toolConfig: {
                        functionCallingConfig: {
                            mode: FunctionCallingConfigMode.AUTO,
                        },
                    },
                    thinkingConfig: {
                        thinkingLevel: ThinkingLevel.MEDIUM,
                    },
                },
            });

            const parts = response.candidates?.[0]?.content?.parts || [];

            // Extract function calls
            const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
            for (const part of parts) {
                if ("functionCall" in part && part.functionCall) {
                    functionCalls.push({
                        name: part.functionCall.name || "",
                        args: (part.functionCall.args || {}) as Record<string, unknown>,
                    });
                }
            }

            if (functionCalls.length > 0) {
                // Execute function calls
                const results = [];
                for (const call of functionCalls) {
                    const result = executor.execute(call.name, call.args);
                    Object.assign(allFiles, result.files);
                    results.push({
                        name: call.name,
                        response: { success: true, message: result.message, files: Object.keys(result.files) },
                    });
                }

                // Add model response to conversation
                contents.push({
                    role: "model",
                    parts: parts,
                });

                // Add function results
                contents.push({
                    role: "user",
                    parts: results.map(r => ({
                        functionResponse: r,
                    })) as Part[],
                });
            } else {
                // No function calls - check for completion
                const textPart = parts.find(p => "text" in p && p.text);
                if (textPart && "text" in textPart) {
                    finalMessage = textPart.text || "";
                }
                break;
            }
        }

        // Merge with executor files
        Object.assign(allFiles, executor.getFiles());

        console.log(`Generated ${Object.keys(allFiles).length} files in ${turn} turns`);

        return NextResponse.json({
            success: true,
            message: finalMessage || "Full-stack setup complete",
            files: allFiles,
            turns: turn,
        });

    } catch (error) {
        console.error("Full-stack API error:", error);
        return NextResponse.json(
            {
                error: "Full-stack generation failed",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

// =============================================================================
// QUICK SETUP HANDLER
// =============================================================================

async function handleQuickSetup(config: { provider: string; methods?: string[] }) {
    const { provider, methods = ["email", "google"] } = config;

    let files: Record<string, string> = {};

    switch (provider) {
        case "supabase":
            files = generateSupabaseClient();
            break;
        case "next-auth":
            files = generateNextAuth(methods);
            break;
        default:
            return NextResponse.json(
                { error: `Unknown provider: ${provider}` },
                { status: 400 }
            );
    }

    return NextResponse.json({
        success: true,
        message: `Set up ${provider} with ${methods.join(", ")}`,
        files,
    });
}
