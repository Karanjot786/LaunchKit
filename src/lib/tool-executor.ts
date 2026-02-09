/**
 * Tool Executor
 * 
 * Executes file operations from Gemini function calls with error correction.
 * Based on Gemini CLI approach with multi-strategy fallback.
 */

import { z } from "zod";

// =============================================================================
// TYPES
// =============================================================================

export interface FileOperation {
    type: "create" | "edit" | "delete" | "read";
    path: string;
    content?: string;
    oldString?: string;
    newString?: string;
    reason?: string;
}

export interface ExecutionResult {
    success: boolean;
    path: string;
    operation: string;
    error?: string;
    corrected?: boolean;
}

export interface ToolCallResult {
    name: string;
    result: unknown;
    error?: string;
}

// Tool call schema from Gemini
export const functionCallSchema = z.object({
    name: z.string(),
    args: z.record(z.string(), z.unknown()),
});

export type FunctionCall = z.infer<typeof functionCallSchema>;

// =============================================================================
// FILE STORE (in-memory for WebContainer)
// =============================================================================

export class FileStore {
    private files: Map<string, string> = new Map();

    constructor(initialFiles?: Record<string, string>) {
        if (initialFiles) {
            for (const [path, content] of Object.entries(initialFiles)) {
                this.files.set(path, content);
            }
        }
    }

    read(path: string): string | null {
        return this.files.get(path) ?? null;
    }

    write(path: string, content: string): void {
        this.files.set(path, content);
    }

    delete(path: string): boolean {
        return this.files.delete(path);
    }

    exists(path: string): boolean {
        return this.files.has(path);
    }

    list(): string[] {
        return Array.from(this.files.keys());
    }

    getAll(): Record<string, string> {
        return Object.fromEntries(this.files);
    }

    clear(): void {
        this.files.clear();
    }
}

// =============================================================================
// EDIT STRATEGIES (from Gemini CLI approach)
// =============================================================================

/**
 * Strategy 1: Exact string match replacement
 */
function tryExactReplacement(
    content: string,
    oldString: string,
    newString: string
): string | null {
    if (content.includes(oldString)) {
        // Count occurrences
        const matches = content.split(oldString).length - 1;
        if (matches === 1) {
            return content.replace(oldString, newString);
        } else if (matches > 1) {
            // Multiple matches - replace all
            return content.split(oldString).join(newString);
        }
    }
    return null;
}

/**
 * Strategy 2: Flexible whitespace-agnostic matching
 */
function tryFlexibleReplacement(
    content: string,
    oldString: string,
    newString: string
): string | null {
    // Normalize whitespace for comparison
    const normalizeWS = (s: string) => s.replace(/\s+/g, " ").trim();
    const normalizedOld = normalizeWS(oldString);

    // Split content into lines and try to find matching section
    const lines = content.split("\n");
    let startIdx = -1;
    let endIdx = -1;
    let accumulated = "";

    for (let i = 0; i < lines.length; i++) {
        accumulated += (accumulated ? " " : "") + lines[i].trim();

        if (accumulated.includes(normalizedOld)) {
            // Found the start
            if (startIdx === -1) {
                // Backtrack to find where the match started
                for (let j = i; j >= 0; j--) {
                    const testAcc = lines.slice(j, i + 1).map(l => l.trim()).join(" ");
                    if (testAcc.includes(normalizedOld)) {
                        startIdx = j;
                    } else {
                        break;
                    }
                }
            }
            endIdx = i;
            break;
        }
    }

    if (startIdx !== -1 && endIdx !== -1) {
        const before = lines.slice(0, startIdx);
        const after = lines.slice(endIdx + 1);
        return [...before, newString, ...after].join("\n");
    }

    return null;
}

/**
 * Strategy 3: Line-based fuzzy matching
 */
function tryLineBasedReplacement(
    content: string,
    oldString: string,
    newString: string
): string | null {
    const oldLines = oldString.split("\n").map((l) => l.trim()).filter(Boolean);
    const contentLines = content.split("\n");

    if (oldLines.length === 0) return null;

    // Find first line that matches
    const firstOldLine = oldLines[0];
    let matchStart = -1;

    for (let i = 0; i < contentLines.length; i++) {
        if (contentLines[i].trim() === firstOldLine) {
            // Check if subsequent lines match
            let allMatch = true;
            for (let j = 1; j < oldLines.length && i + j < contentLines.length; j++) {
                if (contentLines[i + j].trim() !== oldLines[j]) {
                    allMatch = false;
                    break;
                }
            }
            if (allMatch) {
                matchStart = i;
                break;
            }
        }
    }

    if (matchStart !== -1) {
        const before = contentLines.slice(0, matchStart);
        const after = contentLines.slice(matchStart + oldLines.length);
        const newLines = newString.split("\n");
        return [...before, ...newLines, ...after].join("\n");
    }

    return null;
}

// =============================================================================
// TOOL EXECUTOR CLASS
// =============================================================================

export class ToolExecutor {
    private store: FileStore;
    private executionLog: ExecutionResult[] = [];

    constructor(initialFiles?: Record<string, string>) {
        this.store = new FileStore(initialFiles);
    }

    /**
     * Execute a function call from Gemini
     */
    async execute(call: FunctionCall): Promise<ToolCallResult> {
        const { name, args } = call;

        try {
            switch (name) {
                case "create_files":
                    return this.executeCreateFiles(args);
                case "edit_file":
                    return this.executeEditFile(args);
                case "read_file":
                    return this.executeReadFile(args);
                case "delete_file":
                    return this.executeDeleteFile(args);
                case "list_files":
                    return this.executeListFiles();
                default:
                    return { name, result: null, error: `Unknown tool: ${name}` };
            }
        } catch (error) {
            return {
                name,
                result: null,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    /**
     * Execute multiple function calls
     */
    async executeAll(calls: FunctionCall[]): Promise<ToolCallResult[]> {
        const results: ToolCallResult[] = [];
        for (const call of calls) {
            results.push(await this.execute(call));
        }
        return results;
    }

    /**
     * Create one or more files
     */
    private executeCreateFiles(
        args: Record<string, unknown>
    ): ToolCallResult {
        const files = args.files as Record<string, string>;
        const created: string[] = [];
        const errors: string[] = [];

        for (const [path, content] of Object.entries(files)) {
            try {
                this.store.write(path, content);
                created.push(path);
                this.executionLog.push({
                    success: true,
                    path,
                    operation: "create",
                });
            } catch (e) {
                errors.push(`${path}: ${e instanceof Error ? e.message : "error"}`);
                this.executionLog.push({
                    success: false,
                    path,
                    operation: "create",
                    error: e instanceof Error ? e.message : "error",
                });
            }
        }

        return {
            name: "create_files",
            result: {
                created,
                message: args.message || `Created ${created.length} files`,
            },
            error: errors.length > 0 ? errors.join(", ") : undefined,
        };
    }

    /**
     * Edit a file with multi-strategy fallback
     */
    private executeEditFile(args: Record<string, unknown>): ToolCallResult {
        const filePath = args.file_path as string;
        const oldString = args.old_string as string;
        const newString = args.new_string as string;
        const explanation = args.explanation as string;

        const content = this.store.read(filePath);
        if (!content) {
            return {
                name: "edit_file",
                result: null,
                error: `File not found: ${filePath}`,
            };
        }

        // Try each strategy in order
        let result = tryExactReplacement(content, oldString, newString);
        let strategy = "exact";

        if (!result) {
            result = tryFlexibleReplacement(content, oldString, newString);
            strategy = "flexible";
        }

        if (!result) {
            result = tryLineBasedReplacement(content, oldString, newString);
            strategy = "line-based";
        }

        if (result) {
            this.store.write(filePath, result);
            this.executionLog.push({
                success: true,
                path: filePath,
                operation: "edit",
                corrected: strategy !== "exact",
            });
            return {
                name: "edit_file",
                result: {
                    path: filePath,
                    explanation,
                    strategy,
                },
            };
        }

        this.executionLog.push({
            success: false,
            path: filePath,
            operation: "edit",
            error: "No matching content found",
        });

        return {
            name: "edit_file",
            result: null,
            error: `Could not find matching content in ${filePath}. The old_string may not exist exactly as specified.`,
        };
    }

    /**
     * Read a file's contents
     */
    private executeReadFile(args: Record<string, unknown>): ToolCallResult {
        const filePath = args.file_path as string;
        const content = this.store.read(filePath);

        if (content === null) {
            return {
                name: "read_file",
                result: null,
                error: `File not found: ${filePath}`,
            };
        }

        return {
            name: "read_file",
            result: { path: filePath, content },
        };
    }

    /**
     * Delete a file
     */
    private executeDeleteFile(args: Record<string, unknown>): ToolCallResult {
        const filePath = args.file_path as string;
        const reason = args.reason as string;

        if (!this.store.exists(filePath)) {
            return {
                name: "delete_file",
                result: null,
                error: `File not found: ${filePath}`,
            };
        }

        this.store.delete(filePath);
        this.executionLog.push({
            success: true,
            path: filePath,
            operation: "delete",
        });

        return {
            name: "delete_file",
            result: { path: filePath, reason },
        };
    }

    /**
     * List all files
     */
    private executeListFiles(): ToolCallResult {
        return {
            name: "list_files",
            result: { files: this.store.list() },
        };
    }

    /**
     * Get all current files
     */
    getFiles(): Record<string, string> {
        return this.store.getAll();
    }

    /**
     * Get execution log
     */
    getLog(): ExecutionResult[] {
        return [...this.executionLog];
    }

    /**
     * Reset the store with new files
     */
    reset(files?: Record<string, string>): void {
        this.store = new FileStore(files);
        this.executionLog = [];
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract function calls from Gemini response
 */
export function extractFunctionCalls(
    response: { functionCalls?: Array<{ name: string; args: Record<string, unknown> }> }
): FunctionCall[] {
    if (!response.functionCalls) return [];
    return response.functionCalls.map((fc) => ({
        name: fc.name,
        args: fc.args,
    }));
}

/**
 * Format tool results for sending back to Gemini
 */
export function formatToolResults(
    results: ToolCallResult[]
): Array<{ functionResponse: { name: string; response: unknown } }> {
    return results.map((r) => ({
        functionResponse: {
            name: r.name,
            response: r.error ? { error: r.error } : r.result,
        },
    }));
}
