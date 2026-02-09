/**
 * StreamingStatus Component
 * 
 * Real-time status indicator for streaming code generation.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";

interface StreamingStatusProps {
    isStreaming: boolean;
    status: string;
    turns?: number;
    fileUpdates?: Array<{ path: string; type: "created" | "edited"; timestamp: number }>;
    toolCalls?: Array<{ name: string; timestamp: number }>;
}

export function StreamingStatus({
    isStreaming,
    status,
    turns = 0,
    fileUpdates = [],
    toolCalls = [],
}: StreamingStatusProps) {
    if (!isStreaming && fileUpdates.length === 0) return null;

    const recentUpdates = fileUpdates.slice(-5).reverse();
    const recentTools = toolCalls.slice(-3).reverse();

    return (
        <AnimatePresence>
            {isStreaming && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute bottom-4 left-4 right-4 bg-zinc-900/95 backdrop-blur-sm rounded-lg border border-zinc-700 p-4 z-50"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium text-white">
                                Generating...
                            </span>
                            {turns > 0 && (
                                <span className="text-xs text-zinc-500">Turn {turns}</span>
                            )}
                        </div>
                        <span className="text-xs text-zinc-400">{status}</span>
                    </div>

                    {/* Tool calls */}
                    {recentTools.length > 0 && (
                        <div className="mb-3">
                            <div className="text-xs text-zinc-500 mb-1">Tool Calls</div>
                            <div className="flex flex-wrap gap-1">
                                {recentTools.map((tool, i) => (
                                    <span
                                        key={`${tool.name}-${i}`}
                                        className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded"
                                    >
                                        {tool.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* File updates */}
                    {recentUpdates.length > 0 && (
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">Files Modified</div>
                            <div className="space-y-1">
                                {recentUpdates.map((update, i) => (
                                    <motion.div
                                        key={`${update.path}-${i}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-2 text-xs"
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${update.type === "created" ? "bg-green-500" : "bg-yellow-500"
                                                }`}
                                        />
                                        <span className="text-zinc-300 font-mono">
                                            {update.path.split("/").pop()}
                                        </span>
                                        <span className="text-zinc-500">
                                            {update.type === "created" ? "created" : "modified"}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Progress bar */}
                    <div className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 30, ease: "linear" }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
