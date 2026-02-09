/**
 * Streaming Builder API
 * 
 * Server-Sent Events endpoint for real-time code generation updates.
 * Streams preview updates, tool calls, and file changes as they happen.
 */

import { NextRequest } from "next/server";
import { GoogleGenAI, ThinkingLevel, FunctionCallingConfigMode, Type, Content, Part, FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import { ToolExecutor, formatToolResults } from "@/lib/tool-executor";

// Initialize Gemini
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: { timeout: 1200000 },
});

const MODEL = "gemini-3-flash-preview";
const MAX_TURNS = 5;

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
        proposedFeatures?: { title: string; description: string; priority: string }[];
    };
}

interface StreamEvent {
    type: "status" | "preview" | "tool_call" | "file_created" | "file_edited" | "message" | "error" | "done";
    data: unknown;
}

interface JsonExtractionResult {
    fragment: string;
    isBalanced: boolean;
    firstOpen: number;
    endIndex: number;
}

interface FastModeOutput {
    message: string;
    files: Record<string, string>;
}

// Tool for writing files in fast mode (Gemini CLI style)
const writeFileTool: FunctionDeclaration = {
    name: "write_file",
    description: "Write or create a file with the given content. Call this once per file.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            file_path: {
                type: Type.STRING,
                description: "Path to the file, e.g. src/App.tsx or src/components/Hero.tsx"
            },
            content: {
                type: Type.STRING,
                description: "The complete file content"
            },
        },
        required: ["file_path", "content"],
    },
};

// Tool to signal completion
const completeTool: FunctionDeclaration = {
    name: "complete",
    description: "Signal that all files have been written and the task is complete.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            message: {
                type: Type.STRING,
                description: "Brief summary of what was built, 1-2 sentences"
            },
        },
        required: ["message"],
    },
};

// =============================================================================
// TOOL DEFINITIONS (SDK-compatible format)
// =============================================================================

const createFilesTool: FunctionDeclaration = {
    name: "create_files",
    description: "Create one or more new files in the project.",
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
    description: "Make a surgical edit to an existing file.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            file_path: { type: Type.STRING, description: "Path to the file to edit" },
            old_string: { type: Type.STRING, description: "Exact text to find and replace" },
            new_string: { type: Type.STRING, description: "New text to replace with" },
            explanation: { type: Type.STRING, description: "Brief explanation of the change" },
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
            file_path: { type: Type.STRING, description: "Path to the file to read" },
        },
        required: ["file_path"],
    },
};

const listFilesTool: FunctionDeclaration = {
    name: "list_files",
    description: "List all files in the project",
    parameters: { type: Type.OBJECT, properties: {} },
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

function buildSystemPrompt(brand: BrandContext): string {
    return `You are an expert React developer building a STUNNING, production-ready landing page for ${brand.name}.

# CRITICAL: First Impressions Matter
The user should be WOWED at first glance. Create a design that is beautiful, modern, and premium.
- Use rich gradients, shadows, and micro-animations
- Add hover effects, smooth transitions, and subtle motion
- Make it feel alive and interactive - not flat or boring
- NO placeholder text - every word should be real ${brand.name} content

# BRAND IDENTITY
- **Name**: ${brand.name}
- **Tagline**: ${brand.tagline}
- **Logo URL**: ${brand.logo || "None - use text fallback"}
- **Category**: ${brand.validation.category?.primary || "startup"}
- **Target Audience**: ${brand.validation.category?.targetAudience || "users"}
- **Pain Points**: ${brand.validation.community?.painPoints?.slice(0, 3).join("; ") || "user needs"}

# COLOR PALETTE (use these EXACT values)
| Role | Value |
|------|-------|
| Primary | ${brand.colorPalette.primary} |
| Secondary | ${brand.colorPalette.secondary} |
| Accent | ${brand.colorPalette.accent} |
| Background | ${brand.colorPalette.background} |
| Text | ${brand.colorPalette.text} |

Create CSS custom properties for these colors and use semantic tokens throughout:
\`\`\`css
:root {
  --color-primary: ${brand.colorPalette.primary};
  --color-secondary: ${brand.colorPalette.secondary};
  --color-accent: ${brand.colorPalette.accent};
  --color-background: ${brand.colorPalette.background};
  --color-text: ${brand.colorPalette.text};
  
  /* Derived tokens - create gradients, shadows, etc */
  --gradient-primary: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  --shadow-glow: 0 0 40px var(--color-primary);
  --shadow-elegant: 0 10px 30px -10px rgba(0,0,0,0.3);
}
\`\`\`

# FEATURES TO IMPLEMENT
${brand.validation.proposedFeatures?.map((f, i) => `${i + 1}. **${f.title}** (${f.priority}): ${f.description}`).join("\n") || "Analyze pain points and propose 3 core features."}

# TECH STACK
- **Framework**: React + Vite with TSX
- **Styling**: Tailwind CSS (via CDN)
- **Icons**: lucide-react
- **Animations**: framer-motion
- **CDN Dependencies**: react, react-dom, lucide-react, framer-motion

# ARCHITECTURE RULES
1. **Split into Components**: Create separate files for each major section:
   - \`src/components/Navbar.tsx\` - Navigation with logo
   - \`src/components/Hero.tsx\` - Hero section with CTA
   - \`src/components/Features.tsx\` - Feature cards grid
   - \`src/components/CTA.tsx\` - Call-to-action section
   - \`src/components/Footer.tsx\` - Footer with links
   - \`src/App.tsx\` - Main app composing all sections
   - \`src/index.tsx\` - Entry point
   - \`src/styles.css\` - Global styles with CSS variables

2. **Logo Implementation**:
   ${brand.logo ? `Use the provided logo: \`<img src="${brand.logo}" alt="${brand.name} Logo" className="h-8 w-auto" />\`` : "Use a styled text fallback since no logo is provided."}

3. **Semantic HTML**: Use proper elements (\`<header>\`, \`<main>\`, \`<section>\`, \`<footer>\`, \`<nav>\`)

4. **Accessibility**: 
   - Add \`alt\` text to images
   - Use proper heading hierarchy (h1 → h2 → h3)
   - Ensure sufficient color contrast

5. **Responsive Design**: 
   - Mobile-first approach
   - Use Tailwind breakpoints (sm, md, lg, xl)
   - Test at 375px, 768px, 1024px, 1440px widths

# DESIGN PATTERNS
✅ DO:
- Use CSS variables for all brand colors
- Create gradient backgrounds and button effects
- Add box-shadow for depth and elevation
- Use backdrop-blur for glassmorphism effects
- Add transition-all for smooth hover states
- Use framer-motion for entrance animations

❌ DON'T:
- Hard-code colors like \`text-white\` or \`bg-blue-500\`
- Use generic placeholder content
- Create flat, boring designs
- Skip hover/focus states
- Use default fonts without customization

# OUTPUT INSTRUCTIONS
Use the provided tools to generate code:

1. **For each file**, call the \`write_file\` tool with:
   - \`file_path\`: The file path (e.g., "src/App.tsx", "src/components/Hero.tsx")
   - \`content\`: The complete file content

2. **When all files are written**, call the \`complete\` tool with a brief summary message.

**File Structure to Create:**
- \`src/index.tsx\` - Entry point
- \`src/App.tsx\` - Main app composing all sections
- \`src/components/Navbar.tsx\` - Navigation
- \`src/components/Hero.tsx\` - Hero section
- \`src/components/Features.tsx\` - Features grid
- \`src/components/CTA.tsx\` - Call-to-action
- \`src/components/Footer.tsx\` - Footer
- \`src/styles.css\` - Global styles with CSS variables

IMPORTANT: Call write_file for EACH file separately, then call complete at the end.`;
}

// =============================================================================
// SSE ENCODER
// =============================================================================

function extractJsonFragment(text: string): JsonExtractionResult {
    const cleaned = text.replace(/```json\n?|\n?```/g, "");
    const firstOpen = cleaned.indexOf("{");

    if (firstOpen === -1) {
        return {
            fragment: cleaned,
            isBalanced: false,
            firstOpen: -1,
            endIndex: -1,
        };
    }

    let inString = false;
    let escapeNext = false;
    let braceDepth = 0;
    let endIndex = -1;

    for (let i = firstOpen; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (char === "\\") {
            if (inString) {
                escapeNext = true;
            }
            continue;
        }

        if (char === "\"") {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === "{") {
                braceDepth++;
            } else if (char === "}") {
                braceDepth--;
                if (braceDepth === 0) {
                    endIndex = i;
                    break;
                }
            }
        }
    }

    if (endIndex !== -1) {
        return {
            fragment: cleaned.slice(firstOpen, endIndex + 1),
            isBalanced: true,
            firstOpen,
            endIndex,
        };
    }

    return {
        fragment: cleaned.slice(firstOpen),
        isBalanced: false,
        firstOpen,
        endIndex: -1,
    };
}

// Helper to repair truncated JSON by closing unterminated strings and braces
function repairJson(text: string): string {
    let repaired = text;

    // Count braces and brackets
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (char === '\\') {
            escapeNext = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
        } else if (!inString) {
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            else if (char === '[') bracketCount++;
            else if (char === ']') bracketCount--;
        }
    }

    // If text ends with a dangling escape, neutralize it before closing quote
    if (escapeNext) {
        repaired += '\\';
    }

    // If we ended inside a string, close it
    if (inString) {
        repaired += '"';
    }

    // Close any open brackets
    while (bracketCount > 0) {
        repaired += ']';
        bracketCount--;
    }

    // Close any open braces
    while (braceCount > 0) {
        repaired += '}';
        braceCount--;
    }

    return repaired;
}

// =============================================================================
// SSE ENCODER
// =============================================================================

function encodeSSE(event: StreamEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
    const { message, brandContext, currentFiles = {}, mode = "fast" } = await request.json();

    if (!message) {
        return new Response(JSON.stringify({ error: "Message required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Create a readable stream
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const send = (event: StreamEvent) => {
                controller.enqueue(encoder.encode(encodeSSE(event)));
            };

            try {
                send({ type: "status", data: { status: "Starting generation..." } });

                if (mode === "fast") {
                    await handleFastMode(message, brandContext, currentFiles, send);
                } else {
                    await handleAgenticMode(message, brandContext, currentFiles, send);
                }

                send({ type: "done", data: { success: true } });
            } catch (error) {
                console.error("Stream error:", error);
                send({
                    type: "error",
                    data: { message: error instanceof Error ? error.message : "Unknown error" },
                });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}

// =============================================================================
// FAST MODE (Single-turn structured output)
// =============================================================================

async function handleFastMode(
    message: string,
    brandContext: BrandContext,
    currentFiles: Record<string, string>,
    send: (event: StreamEvent) => void
): Promise<void> {
    send({ type: "status", data: { status: "Generating code with tools..." } });

    const systemPrompt = buildSystemPrompt(brandContext);
    let filesCreated = 0;
    let completionMessage = "";
    let isComplete = false;
    const MAX_FAST_TURNS = 15; // Safety limit
    let turn = 0;

    // Build conversation history for multi-turn
    const contents: Content[] = [
        { role: "user", parts: [{ text: message }] }
    ];

    // Agentic loop: keep calling model until it calls "complete" tool
    // Using ANY mode forces the model to use tools instead of text responses
    while (!isComplete && turn < MAX_FAST_TURNS) {
        turn++;
        send({ type: "status", data: { status: `Generating files (turn ${turn})...` } });

        try {
            const response = await ai.models.generateContent({
                model: MODEL,
                contents,
                config: {
                    systemInstruction: systemPrompt,
                    tools: [{ functionDeclarations: [writeFileTool, completeTool] }],
                    toolConfig: {
                        functionCallingConfig: {
                            // ANY mode FORCES the model to call a tool (no text-only responses)
                            mode: FunctionCallingConfigMode.ANY,
                        },
                    },
                    thinkingConfig: {
                        thinkingLevel: ThinkingLevel.MINIMAL,
                    },
                    temperature: 0.7,
                    maxOutputTokens: 32768,
                },
            });

            // Get the model's response parts
            const responseParts = response.candidates?.[0]?.content?.parts || [];
            const toolResults: Part[] = [];

            // DEBUG: Log the full response structure
            const finishReason = response.candidates?.[0]?.finishReason;
            console.log(`[Fast Mode Debug] Turn ${turn}:`);
            console.log(`  - finishReason: ${finishReason}`);
            console.log(`  - candidates count: ${response.candidates?.length || 0}`);
            console.log(`  - parts count: ${responseParts.length}`);
            console.log(`  - parts types: ${responseParts.map(p => p.functionCall ? 'functionCall' : p.text ? 'text' : 'other').join(', ')}`);
            if (responseParts.length > 0 && responseParts[0].text) {
                console.log(`  - first text (100 chars): ${responseParts[0].text.slice(0, 100)}...`);
            }
            if (responseParts.length > 0 && responseParts[0].functionCall) {
                console.log(`  - functionCall name: ${responseParts[0].functionCall.name}`);
            }

            // Add model response to history
            if (responseParts.length > 0) {
                contents.push({ role: "model", parts: responseParts });
            }

            // Process function calls
            for (const part of responseParts) {
                if (part.functionCall) {
                    const { name, args } = part.functionCall;

                    if (name === "write_file" && args) {
                        const filePath = args.file_path as string;
                        const content = args.content as string;

                        if (filePath && content) {
                            const isNew = !currentFiles[filePath];
                            // Update currentFiles for future checks
                            currentFiles[filePath] = content;

                            send({
                                type: isNew ? "file_created" : "file_edited",
                                data: { path: filePath, content, size: content.length },
                            });
                            filesCreated++;
                            send({ type: "status", data: { status: `Created ${filesCreated} files...` } });
                            console.log(`[Fast Mode] write_file: ${filePath} (${content.length} chars)`);

                            // Add tool result to send back
                            toolResults.push({
                                functionResponse: {
                                    name: "write_file",
                                    response: { success: true, path: filePath, message: `File ${filePath} written successfully` },
                                },
                            });
                        }
                    } else if (name === "complete" && args) {
                        completionMessage = (args.message as string) || "Done!";
                        isComplete = true;
                        console.log(`[Fast Mode] complete: ${completionMessage}`);

                        // Add tool result
                        toolResults.push({
                            functionResponse: {
                                name: "complete",
                                response: { success: true, message: completionMessage },
                            },
                        });
                    }
                }
            }

            // If we have tool results, add them as user turn for next iteration
            if (toolResults.length > 0 && !isComplete) {
                contents.push({ role: "user", parts: toolResults });
            }

            // Safety: if no function calls were made, break
            const hasFunctionCalls = responseParts.some(p => p.functionCall);
            if (!hasFunctionCalls) {
                console.log("[Fast Mode] No function calls in response, breaking loop");
                break;
            }

        } catch (error) {
            console.error(`[Fast Mode] Error on turn ${turn}:`, error);
            break;
        }
    }

    // If we got files but no completion message, create one
    if (filesCreated > 0 && !completionMessage) {
        completionMessage = `Created ${filesCreated} files successfully.`;
    }

    // If no files were created, fall back to agentic mode
    if (filesCreated === 0) {
        console.error("[Fast Mode] No files created via tool calls, falling back to agentic mode");
        send({ type: "status", data: { status: "Tool calling didn't produce files, switching to agentic mode..." } });
        await handleAgenticMode(message, brandContext, currentFiles, send);
        return;
    }

    send({ type: "message", data: { text: completionMessage } });
    console.log(`[Fast Mode] Complete: ${filesCreated} files created in ${turn} turns`);
}

// =============================================================================
// AGENTIC MODE (Multi-turn with tools)
// =============================================================================

async function handleAgenticMode(
    message: string,
    brandContext: BrandContext,
    currentFiles: Record<string, string>,
    send: (event: StreamEvent) => void
): Promise<void> {
    const executor = new ToolExecutor(currentFiles);
    const systemPrompt = buildSystemPrompt(brandContext);

    const contents: Content[] = [
        { role: "user", parts: [{ text: message }] },
    ];

    let turn = 0;
    let isComplete = false;

    while (turn < MAX_TURNS && !isComplete) {
        turn++;
        send({ type: "status", data: { status: `Turn ${turn}/${MAX_TURNS}...` } });

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
                    thinkingLevel: turn === 1 ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW,
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
            // Process each function call
            const results = [];
            for (const call of functionCalls) {
                send({ type: "tool_call", data: { name: call.name } });

                const result = await executor.execute(call);
                results.push(result);

                // Send file events
                if (call.name === "create_files" && call.args.files) {
                    const files = call.args.files as Record<string, string>;
                    for (const [path, content] of Object.entries(files)) {
                        send({ type: "file_created", data: { path, content, size: content.length } });
                    }
                } else if (call.name === "edit_file") {
                    send({
                        type: "file_edited",
                        data: {
                            path: call.args.file_path,
                            explanation: call.args.explanation,
                        },
                    });
                }
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
            // No function calls - check for text (completion)
            const textPart = parts.find(p => "text" in p && p.text);
            if (textPart && "text" in textPart) {
                send({ type: "message", data: { text: textPart.text } });
            }
            isComplete = true;
        }
    }

    // Send final status
    const finalFiles = executor.getFiles();
    send({
        type: "status",
        data: {
            status: "Complete",
            fileCount: Object.keys(finalFiles).length,
            turns: turn,
        },
    });
}

// =============================================================================
// GET handler for EventSource compatibility
// =============================================================================

export async function GET() {
    return new Response(JSON.stringify({ error: "Use POST method" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
    });
}
