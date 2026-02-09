/**
 * Code Generation Schemas and Types
 * 
 * Defines the structured output schemas for Gemini API code generation.
 * Uses Zod v4's built-in toJSONSchema for API integration.
 */

import { z } from "zod";
import { uiTreeSchema } from "./ui-catalog";

// =============================================================================
// CODE GENERATION SCHEMAS
// =============================================================================

/**
 * Schema for basic code generation (files only)
 */
export const codeGenerationSchema = z.object({
    message: z.string().describe("Brief explanation of what was created or modified"),
    files: z.record(z.string(), z.string()).describe("Map of file paths to file contents (e.g., 'src/App.jsx': '...')"),
});

export type CodeGenerationResult = z.infer<typeof codeGenerationSchema>;

/**
 * Schema for dual output: instant preview + full code
 */
export const dualOutputSchema = z.object({
    preview: uiTreeSchema.describe("UI tree for instant preview rendering"),
    code: codeGenerationSchema.describe("Full React code files"),
});

export type DualOutputResult = z.infer<typeof dualOutputSchema>;

/**
 * Schema for file edit operations
 */
export const fileEditSchema = z.object({
    file_path: z.string().describe("Path to the file to edit"),
    old_string: z.string().describe("Exact text to find and replace"),
    new_string: z.string().describe("New text to replace with"),
    explanation: z.string().describe("Brief explanation of the change"),
});

export type FileEdit = z.infer<typeof fileEditSchema>;

/**
 * Schema for multiple file operations
 */
export const fileOperationsSchema = z.object({
    creates: z.array(z.object({
        path: z.string(),
        content: z.string(),
    })).optional().describe("Files to create"),
    edits: z.array(fileEditSchema).optional().describe("Files to edit"),
    deletes: z.array(z.string()).optional().describe("Files to delete"),
    message: z.string().describe("Summary of all operations"),
});

export type FileOperations = z.infer<typeof fileOperationsSchema>;

// =============================================================================
// JSON SCHEMAS FOR GEMINI API
// Using Zod v4's built-in toJSONSchema()
// =============================================================================

/**
 * Get JSON schema for Gemini's responseJsonSchema config
 */
export function getCodeGenerationJsonSchema() {
    return z.toJSONSchema(codeGenerationSchema, {
        target: "draft-2020-12",
        unrepresentable: "any",
    });
}

export function getDualOutputJsonSchema() {
    return z.toJSONSchema(dualOutputSchema, {
        target: "draft-2020-12",
        unrepresentable: "any",
    });
}

export function getFileOperationsJsonSchema() {
    return z.toJSONSchema(fileOperationsSchema, {
        target: "draft-2020-12",
        unrepresentable: "any",
    });
}

export function getUITreeJsonSchema() {
    return z.toJSONSchema(uiTreeSchema, {
        target: "draft-2020-12",
        unrepresentable: "any",
    });
}

// =============================================================================
// FUNCTION CALLING TOOL DEFINITIONS
// =============================================================================

/**
 * Tool definitions for Gemini function calling
 */
export const codeToolDefinitions = [
    {
        name: "create_files",
        description: "Create one or more new files in the project. Use for initial generation or adding new files.",
        parameters: {
            type: "object" as const,
            properties: {
                files: {
                    type: "object" as const,
                    description: "Map of file paths to file contents",
                    additionalProperties: { type: "string" as const },
                },
                message: {
                    type: "string" as const,
                    description: "Brief explanation of what was created",
                },
            },
            required: ["files", "message"],
        },
    },
    {
        name: "edit_file",
        description: "Make a surgical edit to an existing file by replacing specific content. Include sufficient context in old_string to ensure unique matching.",
        parameters: {
            type: "object" as const,
            properties: {
                file_path: {
                    type: "string" as const,
                    description: "Path to the file to edit (e.g., src/App.jsx)",
                },
                old_string: {
                    type: "string" as const,
                    description: "Exact text to find and replace. Include surrounding context for uniqueness.",
                },
                new_string: {
                    type: "string" as const,
                    description: "New text to replace with",
                },
                explanation: {
                    type: "string" as const,
                    description: "Brief explanation of the change",
                },
            },
            required: ["file_path", "old_string", "new_string", "explanation"],
        },
    },
    {
        name: "read_file",
        description: "Read the current contents of a file to understand what to edit",
        parameters: {
            type: "object" as const,
            properties: {
                file_path: {
                    type: "string" as const,
                    description: "Path to the file to read",
                },
            },
            required: ["file_path"],
        },
    },
    {
        name: "delete_file",
        description: "Delete a file from the project",
        parameters: {
            type: "object" as const,
            properties: {
                file_path: {
                    type: "string" as const,
                    description: "Path to the file to delete",
                },
                reason: {
                    type: "string" as const,
                    description: "Reason for deletion",
                },
            },
            required: ["file_path", "reason"],
        },
    },
    {
        name: "list_files",
        description: "List all files currently in the project",
        parameters: {
            type: "object" as const,
            properties: {},
        },
    },
];

/**
 * Get function declarations for Gemini tools config
 */
export function getCodeToolsConfig() {
    return [{
        functionDeclarations: codeToolDefinitions,
    }];
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Safely parse code generation result
 */
export function parseCodeGenerationResult(text: string): CodeGenerationResult | null {
    try {
        const parsed = JSON.parse(text);
        return codeGenerationSchema.parse(parsed);
    } catch (error) {
        console.error("Failed to parse code generation result:", error);
        return null;
    }
}

/**
 * Safely parse dual output result
 */
export function parseDualOutputResult(text: string): DualOutputResult | null {
    try {
        const parsed = JSON.parse(text);
        return dualOutputSchema.parse(parsed);
    } catch (error) {
        console.error("Failed to parse dual output result:", error);
        return null;
    }
}

/**
 * Extract files from various response formats
 */
export function extractFiles(response: unknown): Record<string, string> {
    if (!response) return {};

    // If it's already a record of strings
    if (typeof response === "object" && !Array.isArray(response)) {
        const obj = response as Record<string, unknown>;

        // Direct files object
        if (obj.files && typeof obj.files === "object") {
            return obj.files as Record<string, string>;
        }

        // Check if response itself is files
        const allStrings = Object.values(obj).every(v => typeof v === "string");
        if (allStrings && Object.keys(obj).some(k => k.includes("/"))) {
            return obj as Record<string, string>;
        }
    }

    return {};
}
