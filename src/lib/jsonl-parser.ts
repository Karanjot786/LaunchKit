/**
 * JSONL Streaming Parser
 * 
 * Parses JSON Lines (JSONL) streaming format for real-time UI updates.
 * Based on Vercel JSON-Render approach.
 */

import { UITree, UIElement } from "./ui-catalog";

// =============================================================================
// TYPES
// =============================================================================

export interface JsonPatch {
    op: "set" | "add" | "remove" | "replace";
    path: string;
    value?: unknown;
}

export interface StreamingState {
    tree: UITree;
    chunks: string[];
    buffer: string;
    complete: boolean;
    error: string | null;
}

// =============================================================================
// JSONL PARSER
// =============================================================================

/**
 * Create a JSONL parser for streaming responses
 */
export function createJSONLParser() {
    let buffer = "";

    return {
        /**
         * Parse incoming chunk and return complete JSON objects
         */
        parse(chunk: string): JsonPatch[] {
            buffer += chunk;
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            const patches: JsonPatch[] = [];

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith("//")) {
                    try {
                        patches.push(JSON.parse(trimmed));
                    } catch (e) {
                        console.warn("Invalid JSONL line:", trimmed);
                    }
                }
            }

            return patches;
        },

        /**
         * Flush remaining buffer at end of stream
         */
        flush(): JsonPatch[] {
            if (buffer.trim()) {
                try {
                    return [JSON.parse(buffer)];
                } catch {
                    return [];
                }
            }
            return [];
        },

        /**
         * Reset parser state
         */
        reset() {
            buffer = "";
        }
    };
}

// =============================================================================
// UI TREE OPERATIONS
// =============================================================================

/**
 * Create an empty UI Tree
 */
export function createEmptyTree(): UITree {
    return {
        root: "",
        elements: {},
    };
}

/**
 * Apply a JSON patch to a UI Tree
 */
export function applyPatch(tree: UITree, patch: JsonPatch): UITree {
    const newTree: UITree = {
        root: tree.root,
        elements: { ...tree.elements },
    };

    const { op, path, value } = patch;

    // Handle /root
    if (path === "/root") {
        if (op === "set" || op === "add" || op === "replace") {
            newTree.root = value as string;
        }
        return newTree;
    }

    // Handle /elements/{key}
    if (path.startsWith("/elements/")) {
        const parts = path.split("/");
        const key = parts[2];

        if (!key) return newTree;

        switch (op) {
            case "add":
            case "set":
            case "replace":
                newTree.elements[key] = value as UIElement;
                break;
            case "remove":
                delete newTree.elements[key];
                break;
        }

        // Handle nested property updates like /elements/{key}/props/title
        if (parts.length > 3 && (op === "set" || op === "replace")) {
            const existing = tree.elements[key];
            if (existing) {
                const propPath = parts.slice(3);
                newTree.elements[key] = deepSetProperty(existing, propPath, value);
            }
        }
    }

    return newTree;
}

/**
 * Apply multiple patches to a UI Tree
 */
export function applyPatches(tree: UITree, patches: JsonPatch[]): UITree {
    return patches.reduce((acc, patch) => applyPatch(acc, patch), tree);
}

/**
 * Deep set a property on an object given a path
 */
function deepSetProperty(obj: UIElement, path: string[], value: unknown): UIElement {
    if (path.length === 0) return obj;

    const result = { ...obj } as Record<string, unknown>;
    let current = result;

    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        current[key] = { ...(current[key] as object || {}) };
        current = current[key] as Record<string, unknown>;
    }

    current[path[path.length - 1]] = value;
    return result as unknown as UIElement;
}

// =============================================================================
// STREAMING HELPERS
// =============================================================================

/**
 * Process a streaming response into UI Tree updates
 */
export async function* processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<{ tree: UITree; isComplete: boolean }> {
    const decoder = new TextDecoder();
    const parser = createJSONLParser();
    let tree = createEmptyTree();

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            // Process remaining buffer
            const finalPatches = parser.flush();
            if (finalPatches.length > 0) {
                tree = applyPatches(tree, finalPatches);
                yield { tree, isComplete: true };
            }
            break;
        }

        const chunk = decoder.decode(value);
        const patches = parser.parse(chunk);

        if (patches.length > 0) {
            tree = applyPatches(tree, patches);
            yield { tree, isComplete: false };
        }
    }
}

/**
 * Create a JSONL output string from patches
 */
export function patchesToJSONL(patches: JsonPatch[]): string {
    return patches.map(p => JSON.stringify(p)).join("\n") + "\n";
}

/**
 * Create patches to build a UI tree from scratch
 */
export function treeToPatches(tree: UITree): JsonPatch[] {
    const patches: JsonPatch[] = [];

    // Set root first
    patches.push({ op: "set", path: "/root", value: tree.root });

    // Add all elements
    for (const [key, element] of Object.entries(tree.elements)) {
        patches.push({ op: "add", path: `/elements/${key}`, value: element });
    }

    return patches;
}

// =============================================================================
// PARTIAL JSON PARSING (for streaming structured output)
// =============================================================================

/**
 * Try to extract partial data from incomplete JSON
 */
export function extractPartialTree(partialJson: string): UITree | null {
    // Strategy 1: Try to find complete preview object
    const previewMatch = partialJson.match(/"preview"\s*:\s*(\{[\s\S]*?\})\s*(?:,|$)/);
    if (previewMatch) {
        try {
            return JSON.parse(previewMatch[1]);
        } catch {
            // Not complete yet
        }
    }

    // Strategy 2: Look for individual elements
    const tree = createEmptyTree();
    let found = false;

    // Find root
    const rootMatch = partialJson.match(/"root"\s*:\s*"([^"]+)"/);
    if (rootMatch) {
        tree.root = rootMatch[1];
        found = true;
    }

    // Find elements (may be partial)
    const elementsMatch = partialJson.match(/"elements"\s*:\s*\{([\s\S]*)/);
    if (elementsMatch) {
        // Try to extract complete element objects
        const elementRegex = /"(\w+)"\s*:\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g;
        let match;

        while ((match = elementRegex.exec(elementsMatch[1])) !== null) {
            try {
                const element = JSON.parse(match[2]);
                if (element.key && element.type) {
                    tree.elements[match[1]] = element;
                    found = true;
                }
            } catch {
                // Element not complete
            }
        }
    }

    return found ? tree : null;
}

// =============================================================================
// REACT HOOK FOR STREAMING
// =============================================================================

export interface UseStreamingTreeOptions {
    onUpdate?: (tree: UITree) => void;
    onComplete?: (tree: UITree) => void;
    onError?: (error: Error) => void;
}

/**
 * Hook result interface (for custom hook implementation)
 */
export interface StreamingTreeState {
    tree: UITree | null;
    isStreaming: boolean;
    error: string | null;
    startStream: (response: Response) => Promise<void>;
    reset: () => void;
}
