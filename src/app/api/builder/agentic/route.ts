/**
 * Agentic Loop API
 * 
 * Multi-turn conversation handler with function calling for iterative code generation.
 * Based on Gemini CLI agentic architecture.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel, FunctionCallingConfigMode, Type, Content, Part, FunctionDeclaration } from "@google/genai";
import { ToolExecutor, extractFunctionCalls, formatToolResults } from "@/lib/tool-executor";
import { getCatalogDescription } from "@/lib/ui-catalog";

// Initialize Gemini
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
});

const MODEL = "gemini-3-pro-preview";
const MAX_TURNS = 10;

// =============================================================================
// TYPES
// =============================================================================

interface BrandContext {
    name: string;
    tagline: string;
    logo: string | null;
    colorPalette: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    validation: {
        category?: { primary: string; targetAudience: string; keywords: string[] };
        community?: { painPoints: string[] };
        opportunities?: string[];
    };
}

// =============================================================================
// TOOL DEFINITIONS (SDK-compatible format)
// =============================================================================

const createFilesTool: FunctionDeclaration = {
    name: "create_files",
    description: "Create one or more new files in the project. Use for initial generation or adding new files.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            files: {
                type: Type.OBJECT,
                description: "Map of file paths to file contents",
            },
            message: {
                type: Type.STRING,
                description: "Brief explanation of what was created",
            },
        },
        required: ["files", "message"],
    },
};

const editFileTool: FunctionDeclaration = {
    name: "edit_file",
    description: "Make a surgical edit to an existing file by replacing specific content.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            file_path: {
                type: Type.STRING,
                description: "Path to the file to edit",
            },
            old_string: {
                type: Type.STRING,
                description: "Exact text to find and replace",
            },
            new_string: {
                type: Type.STRING,
                description: "New text to replace with",
            },
            explanation: {
                type: Type.STRING,
                description: "Brief explanation of the change",
            },
        },
        required: ["file_path", "old_string", "new_string", "explanation"],
    },
};

const readFileTool: FunctionDeclaration = {
    name: "read_file",
    description: "Read the current contents of a file",
    parameters: {
        type: Type.OBJECT,
        properties: {
            file_path: {
                type: Type.STRING,
                description: "Path to the file to read",
            },
        },
        required: ["file_path"],
    },
};

const listFilesTool: FunctionDeclaration = {
    name: "list_files",
    description: "List all files in the project",
    parameters: {
        type: Type.OBJECT,
        properties: {},
    },
};

const codeToolDeclarations: FunctionDeclaration[] = [
    createFilesTool,
    editFileTool,
    readFileTool,
    listFilesTool,
];

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

function buildAgenticSystemPrompt(brand: BrandContext): string {
    return `You are an expert full-stack developer building a landing page for ${brand.name}.

BRAND CONTEXT:
- Name: ${brand.name}
- Tagline: ${brand.tagline}
- Category: ${brand.validation.category?.primary || "startup"}
- Target Audience: ${brand.validation.category?.targetAudience || "general users"}
- Pain Points: ${brand.validation.community?.painPoints?.join(", ") || "user needs"}

BRAND COLORS (use these EXACT hex values in your code):
- Primary: ${brand.colorPalette.primary}
- Secondary: ${brand.colorPalette.secondary}
- Accent: ${brand.colorPalette.accent}
- Background: ${brand.colorPalette.background}
- Text: ${brand.colorPalette.text}

AVAILABLE UI COMPONENTS:
${getCatalogDescription()}

TOOL USAGE GUIDELINES:
1. Use 'create_files' for initial file generation or adding new files
2. Use 'edit_file' for surgical modifications - provide enough context in old_string
3. Use 'read_file' to check current file contents before editing
4. Use 'list_files' to see what files exist

CODE REQUIREMENTS:
- Use React with JSX (Vite project)
- Include Tailwind CSS via CDN in index.html
- Use inline styles for brand colors: style={{ backgroundColor: '${brand.colorPalette.primary}' }}
- Available packages: react, react-dom, lucide-react, framer-motion
- Make components interactive with hover effects and animations
- Write production-quality, beautiful UI
- NO placeholder text - use real content for ${brand.name}

When done with changes, respond with a summary of what was created/modified.`;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
    try {
        const { message, brandContext, currentFiles, conversationHistory = [] } = await request.json();

        if (!message) {
            return NextResponse.json({ error: "Message required" }, { status: 400 });
        }

        console.log(`Agentic API: "${message.slice(0, 50)}..."`);

        // Initialize tool executor with current files
        const executor = new ToolExecutor(currentFiles);
        const systemPrompt = buildAgenticSystemPrompt(brandContext);

        // Build conversation history as proper Content objects
        const contents: Content[] = [
            ...conversationHistory,
            { role: "user", parts: [{ text: message }] },
        ];

        let turn = 0;
        let finalMessage = "";
        let isComplete = false;

        // Agentic loop
        while (turn < MAX_TURNS && !isComplete) {
            turn++;
            console.log(`Turn ${turn}/${MAX_TURNS}`);

            const response = await ai.models.generateContent({
                model: MODEL,
                contents,
                config: {
                    systemInstruction: systemPrompt,
                    tools: [{ functionDeclarations: codeToolDeclarations }],
                    toolConfig: {
                        functionCallingConfig: {
                            mode: FunctionCallingConfigMode.AUTO,
                        },
                    },
                    thinkingConfig: {
                        thinkingLevel: turn === 1 ? ThinkingLevel.HIGH : ThinkingLevel.MEDIUM,
                    },
                    temperature: 1.0,
                    maxOutputTokens: 16384,
                },
            });

            const candidate = response.candidates?.[0];
            if (!candidate) {
                throw new Error("No response from model");
            }

            const parts = candidate.content?.parts || [];

            // Check for function calls
            const functionCalls = extractFunctionCalls({
                functionCalls: parts
                    .filter((p): p is Part & { functionCall: { name: string; args: Record<string, unknown> } } =>
                        "functionCall" in p && p.functionCall !== undefined
                    )
                    .map(p => p.functionCall),
            });

            if (functionCalls.length > 0) {
                // Execute all function calls
                console.log(`Executing ${functionCalls.length} tool calls`);
                const results = await executor.executeAll(functionCalls);

                // Check for errors
                const errors = results.filter(r => r.error);
                if (errors.length > 0) {
                    console.warn("Tool execution errors:", errors);
                }

                // Add model response to conversation
                contents.push({
                    role: "model",
                    parts: parts,
                });

                // Add function results
                contents.push({
                    role: "user",
                    parts: formatToolResults(results).map(r => ({
                        functionResponse: r.functionResponse,
                    })) as Part[],
                });
            } else {
                // No function calls - check for text response (completion)
                const textPart = parts.find(p => "text" in p && p.text);
                if (textPart && "text" in textPart) {
                    finalMessage = textPart.text || "";
                    isComplete = true;
                } else {
                    finalMessage = "Changes applied successfully.";
                    isComplete = true;
                }
            }

            // Check for finish reason
            if (candidate.finishReason === "STOP" && functionCalls.length === 0) {
                isComplete = true;
            }
        }

        if (!isComplete) {
            finalMessage = `Reached maximum turns (${MAX_TURNS}). Changes have been applied.`;
        }

        // Get final files
        const files = executor.getFiles();
        const log = executor.getLog();

        console.log(`Completed in ${turn} turns. Files: ${Object.keys(files).length}`);

        return NextResponse.json({
            success: true,
            message: finalMessage,
            files,
            turns: turn,
            executionLog: log,
            conversationHistory: contents,
        });

    } catch (error) {
        console.error("Agentic API error:", error);
        return NextResponse.json(
            {
                error: "Agentic generation failed",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
