"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Palette, Type, Image, Sparkles, Edit2 } from "lucide-react";

interface BrandPanelProps {
    project: {
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
        validation: Record<string, unknown>;
    };
    onTriggerStep: (step: "name" | "colors" | "logo") => void;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function BrandPanel({ project, onTriggerStep, collapsed = false, onToggleCollapse }: BrandPanelProps) {
    const brandSteps = [
        {
            id: "validation" as const,
            label: "Validation",
            icon: Sparkles,
            status: Object.keys(project.validation).length > 0 ? "complete" : "pending",
            value: project.validation && (project.validation as { category?: { primary?: string } })?.category?.primary || null,
        },
        {
            id: "name" as const,
            label: "Brand Name",
            icon: Type,
            status: project.name && project.name !== "Untitled Project" ? "complete" : "pending",
            value: project.name !== "Untitled Project" ? project.name : null,
        },
        {
            id: "colors" as const,
            label: "Color Palette",
            icon: Palette,
            status: project.colorPalette.primary !== "#6366F1" ? "complete" : "pending",
            value: project.colorPalette,
        },
        {
            id: "logo" as const,
            label: "Logo",
            icon: Image,
            status: project.logo ? "complete" : "pending",
            value: project.logo,
        },
    ];

    const completedSteps = brandSteps.filter(s => s.status === "complete").length;
    const progress = (completedSteps / brandSteps.length) * 100;

    if (collapsed) {
        return (
            <div className="w-12 h-full bg-zinc-900/50 border-r border-zinc-800 flex flex-col items-center py-4">
                <button
                    onClick={onToggleCollapse}
                    className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>

                <div className="flex-1 flex flex-col items-center justify-center gap-3 mt-4">
                    {brandSteps.map((step) => (
                        <div
                            key={step.id}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${step.status === "complete"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-zinc-800 text-zinc-500"
                                }`}
                        >
                            {step.status === "complete" ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <step.icon className="w-4 h-4" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <aside className="w-64 h-full bg-zinc-900/50 border-r border-zinc-800 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">Brand Setup</h3>
                <button
                    onClick={onToggleCollapse}
                    className="p-1.5 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
            </div>

            {/* Progress */}
            <div className="px-4 py-3 border-b border-zinc-800/50">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                    <span>Progress</span>
                    <span>{completedSteps}/{brandSteps.length}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            {/* Steps */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {brandSteps.map((step, i) => (
                    <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`group p-3 rounded-xl border transition-all ${step.status === "complete"
                                ? "bg-zinc-800/50 border-zinc-700"
                                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${step.status === "complete"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-zinc-800 text-zinc-500"
                                }`}>
                                {step.status === "complete" ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <step.icon className="w-4 h-4" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-medium ${step.status === "complete" ? "text-white" : "text-zinc-400"
                                        }`}>
                                        {step.label}
                                    </span>
                                    {step.status === "complete" && step.id !== "validation" && (
                                        <button
                                            onClick={() => onTriggerStep(step.id as "name" | "colors" | "logo")}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-white transition-all"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>

                                {/* Value preview */}
                                {step.status === "complete" && step.value && (
                                    <div className="mt-1.5">
                                        {step.id === "name" && (
                                            <span className="text-xs text-zinc-500 truncate block">
                                                {step.value as string}
                                            </span>
                                        )}
                                        {step.id === "colors" && (
                                            <div className="flex gap-1 mt-1">
                                                {Object.entries(step.value as Record<string, string>)
                                                    .slice(0, 3)
                                                    .map(([key, color]) => (
                                                        <div
                                                            key={key}
                                                            className="w-5 h-5 rounded-md border border-zinc-700"
                                                            style={{ backgroundColor: color }}
                                                            title={key}
                                                        />
                                                    ))}
                                            </div>
                                        )}
                                        {step.id === "logo" && (
                                            <div className="w-8 h-8 rounded-md bg-zinc-800 overflow-hidden mt-1">
                                                <img
                                                    src={step.value as string}
                                                    alt="Logo"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}
                                        {step.id === "validation" && (
                                            <span className="text-xs text-cyan-400 truncate block">
                                                {step.value as string}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {step.status === "pending" && step.id !== "validation" && (
                                    <button
                                        onClick={() => onTriggerStep(step.id as "name" | "colors" | "logo")}
                                        className="mt-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                    >
                                        Set up →
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Brand Preview */}
            <div className="p-4 border-t border-zinc-800">
                <div className="text-xs text-zinc-500 mb-3">Preview</div>
                <div
                    className="aspect-video rounded-xl overflow-hidden flex items-center justify-center relative"
                    style={{
                        backgroundColor: project.colorPalette.background,
                        border: `1px solid ${project.colorPalette.primary}20`
                    }}
                >
                    <div className="absolute inset-0 opacity-20" style={{
                        background: `linear-gradient(135deg, ${project.colorPalette.primary}, ${project.colorPalette.accent})`
                    }} />
                    <div className="relative z-10 text-center">
                        {project.logo ? (
                            <img
                                src={project.logo}
                                alt="Logo"
                                className="h-10 mx-auto mb-2"
                            />
                        ) : (
                            <div
                                className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-xl font-bold"
                                style={{ backgroundColor: project.colorPalette.primary }}
                            >
                                {project.name.charAt(0)}
                            </div>
                        )}
                        <p
                            className="font-semibold text-sm"
                            style={{ color: project.colorPalette.text }}
                        >
                            {project.name !== "Untitled Project" ? project.name : "Your Brand"}
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
