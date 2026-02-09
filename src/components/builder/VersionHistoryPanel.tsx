/**
 * Version History Panel
 * 
 * UI component for viewing and restoring file versions.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { VersionSnapshot } from "@/lib/version-history";

interface VersionHistoryPanelProps {
    snapshots: Array<
        VersionSnapshot & {
            isCurrent: boolean;
            canRestore: boolean;
            relativeTime: string;
        }
    >;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onRestore: (index: number) => void;
    isOpen: boolean;
    onClose: () => void;
}

export function VersionHistoryPanel({
    snapshots,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onRestore,
    isOpen,
    onClose,
}: VersionHistoryPanelProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-80 bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Version History</h2>
                            <button
                                onClick={onClose}
                                className="text-zinc-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Quick actions */}
                        <div className="p-4 border-b border-zinc-800 flex gap-2">
                            <button
                                onClick={onUndo}
                                disabled={!canUndo}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all
                  ${canUndo
                                        ? "bg-zinc-800 text-white hover:bg-zinc-700"
                                        : "bg-zinc-800/50 text-zinc-500 cursor-not-allowed"
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                Undo
                            </button>
                            <button
                                onClick={onRedo}
                                disabled={!canRedo}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all
                  ${canRedo
                                        ? "bg-zinc-800 text-white hover:bg-zinc-700"
                                        : "bg-zinc-800/50 text-zinc-500 cursor-not-allowed"
                                    }`}
                            >
                                Redo
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                                </svg>
                            </button>
                        </div>

                        {/* Snapshot list */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {snapshots.length === 0 ? (
                                <div className="text-center text-zinc-500 py-8">
                                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p>No snapshots yet</p>
                                    <p className="text-xs mt-1">Versions are saved automatically</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {snapshots.map((snapshot, index) => (
                                        <motion.div
                                            key={snapshot.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`relative p-3 rounded-lg border transition-all cursor-pointer
                        ${snapshot.isCurrent
                                                    ? "bg-indigo-500/10 border-indigo-500/50"
                                                    : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                                                }`}
                                            onMouseEnter={() => setHoveredIndex(index)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                            onClick={() => snapshot.canRestore && onRestore(index)}
                                        >
                                            {/* Type indicator */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <span
                                                    className={`w-2 h-2 rounded-full
                            ${snapshot.type === "generation"
                                                            ? "bg-purple-500"
                                                            : snapshot.type === "manual"
                                                                ? "bg-green-500"
                                                                : "bg-zinc-500"
                                                        }`}
                                                />
                                                <span className="text-xs text-zinc-400">
                                                    {snapshot.type === "generation"
                                                        ? "AI Generated"
                                                        : snapshot.type === "manual"
                                                            ? "Manual Save"
                                                            : "Auto-save"}
                                                </span>
                                                <span className="ml-auto text-xs text-zinc-500">
                                                    {snapshot.relativeTime}
                                                </span>
                                            </div>

                                            {/* Description */}
                                            <p className="text-sm text-white truncate">
                                                {snapshot.description}
                                            </p>

                                            {/* File count */}
                                            <p className="text-xs text-zinc-500 mt-1">
                                                {Object.keys(snapshot.files).length} files
                                            </p>

                                            {/* Current indicator */}
                                            {snapshot.isCurrent && (
                                                <div className="absolute right-3 top-3">
                                                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                                                        Current
                                                    </span>
                                                </div>
                                            )}

                                            {/* Restore button on hover */}
                                            {hoveredIndex === index && snapshot.canRestore && (
                                                <motion.button
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="absolute right-3 bottom-3 text-xs bg-zinc-700 hover:bg-zinc-600 text-white px-2 py-1 rounded transition-colors"
                                                >
                                                    Restore
                                                </motion.button>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-zinc-800 text-center text-xs text-zinc-500">
                            {snapshots.length} / 50 snapshots
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
