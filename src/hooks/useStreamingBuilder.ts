/**
 * useStreamingBuilder Hook
 * 
 * React hook for consuming the streaming builder API.
 * Provides real-time updates for file changes, status, and messages.
 */

import { useState, useCallback, useRef } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface StreamEvent {
    type: "status" | "preview" | "tool_call" | "file_created" | "file_edited" | "message" | "error" | "done" | "install_packages";
    data: unknown;
}

interface StatusData {
    status: string;
    fileCount?: number;
    turns?: number;
}

interface FileData {
    path: string;
    content?: string;
    size?: number;
    explanation?: string;
}

interface ToolCallData {
    name: string;
    args?: Record<string, unknown>;
}

interface MessageData {
    text: string;
}

interface ErrorData {
    message: string;
}

export interface StreamState {
    isStreaming: boolean;
    status: string;
    message: string;
    files: Record<string, string>;
    fileUpdates: Array<{ path: string; type: "created" | "edited"; timestamp: number }>;
    toolCalls: Array<{ name: string; timestamp: number }>;
    error: string | null;
    turns: number;
}

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

// =============================================================================
// HOOK
// =============================================================================

export function useStreamingBuilder(initialFiles: Record<string, string> = {}) {
    const [state, setState] = useState<StreamState>({
        isStreaming: false,
        status: "",
        message: "",
        files: initialFiles,
        fileUpdates: [],
        toolCalls: [],
        error: null,
        turns: 0,
    });

    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Start streaming generation
     */
    const generate = useCallback(
        async (
            message: string,
            brandContext: BrandContext,
            options: {
                mode?: "fast" | "agentic";
                strategy?: "fast_json" | "plan_driven" | "template_fill";
                quality?: "speed" | "balanced" | "high";
                templateId?: string;
            } = {}
        ) => {
            // Cancel any existing stream
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;

            setState((prev) => ({
                ...prev,
                isStreaming: true,
                status: "Starting...",
                message: "",
                files: {}, // Clear files at start of each generation to prevent accumulation
                fileUpdates: [],
                toolCalls: [],
                error: null,
                turns: 0,
            }));

            try {
                const response = await fetch("/api/builder/stream", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message,
                        brandContext,
                        currentFiles: state.files,
                        mode: options.mode || "fast",
                        strategy: options.strategy,
                        quality: options.quality,
                        templateId: options.templateId,
                    }),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                if (!response.body) {
                    throw new Error("No response body");
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n\n");
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const jsonStr = line.slice(6);
                            try {
                                const event: StreamEvent = JSON.parse(jsonStr);
                                handleEvent(event, setState);
                            } catch (e) {
                                console.warn("Failed to parse SSE event:", e);
                            }
                        }
                    }
                }
            } catch (error) {
                if ((error as Error).name === "AbortError") {
                    setState((prev) => ({
                        ...prev,
                        isStreaming: false,
                        status: "Cancelled",
                    }));
                } else {
                    setState((prev) => ({
                        ...prev,
                        isStreaming: false,
                        error: error instanceof Error ? error.message : "Unknown error",
                    }));
                }
            } finally {
                setState((prev) => ({ ...prev, isStreaming: false }));
                abortControllerRef.current = null;
            }
        },
        [state.files]
    );

    /**
     * Cancel ongoing stream
     */
    const cancel = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    /**
     * Reset state
     */
    const reset = useCallback((newFiles?: Record<string, string>) => {
        setState({
            isStreaming: false,
            status: "",
            message: "",
            files: newFiles || {},
            fileUpdates: [],
            toolCalls: [],
            error: null,
            turns: 0,
        });
    }, []);

    /**
     * Update files directly
     */
    const setFiles = useCallback((files: Record<string, string>) => {
        setState((prev) => ({ ...prev, files }));
    }, []);

    /**
     * Update a single file
     */
    const updateFile = useCallback((path: string, content: string) => {
        setState((prev) => ({
            ...prev,
            files: { ...prev.files, [path]: content },
            fileUpdates: [
                ...prev.fileUpdates,
                { path, type: "edited", timestamp: Date.now() },
            ],
        }));
    }, []);

    return {
        ...state,
        generate,
        cancel,
        reset,
        setFiles,
        updateFile,
    };
}

// =============================================================================
// EVENT HANDLER
// =============================================================================

function handleEvent(
    event: StreamEvent,
    setState: React.Dispatch<React.SetStateAction<StreamState>>
): void {
    switch (event.type) {
        case "status": {
            const data = event.data as StatusData;
            setState((prev) => ({
                ...prev,
                status: data.status,
                turns: data.turns ?? prev.turns,
            }));
            break;
        }

        case "file_created": {
            const data = event.data as FileData;
            setState((prev) => ({
                ...prev,
                files: { ...prev.files, [data.path]: data.content || "" },
                fileUpdates: [
                    ...prev.fileUpdates,
                    { path: data.path, type: "created", timestamp: Date.now() },
                ],
            }));
            break;
        }

        case "file_edited": {
            const data = event.data as FileData;
            if (data.content) {
                setState((prev) => ({
                    ...prev,
                    files: { ...prev.files, [data.path]: data.content || prev.files[data.path] },
                    fileUpdates: [
                        ...prev.fileUpdates,
                        { path: data.path, type: "edited", timestamp: Date.now() },
                    ],
                }));
            } else {
                setState((prev) => ({
                    ...prev,
                    fileUpdates: [
                        ...prev.fileUpdates,
                        { path: data.path, type: "edited", timestamp: Date.now() },
                    ],
                }));
            }
            break;
        }

        case "tool_call": {
            const data = event.data as ToolCallData;
            setState((prev) => ({
                ...prev,
                toolCalls: [
                    ...prev.toolCalls,
                    { name: data.name, timestamp: Date.now() },
                ],
            }));
            break;
        }

        case "message": {
            const data = event.data as MessageData;
            setState((prev) => ({
                ...prev,
                message: data.text,
            }));
            break;
        }

        case "error": {
            const data = event.data as ErrorData;
            setState((prev) => ({
                ...prev,
                error: data.message,
            }));
            break;
        }

        case "done": {
            setState((prev) => ({
                ...prev,
                isStreaming: false,
                status: "Complete",
            }));
            break;
        }
    }
}

export default useStreamingBuilder;
