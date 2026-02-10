"use client";

import { motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Palette, Type, Image, Sparkles, Edit2, Lightbulb } from "lucide-react";

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
        features?: { id: string; title: string; selected?: boolean }[];
    };
    onTriggerStep: (step: "name" | "colors" | "logo" | "features") => void;
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
            id: "features" as const,
            label: "Features",
            icon: Lightbulb,
            status: project.features && project.features.filter(f => f.selected).length > 0 ? "complete" : "pending",
            value: project.features ? `${project.features.filter(f => f.selected).length} selected` : null,
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

    // Collapsed state
    if (collapsed) {
        return (
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-14 h-full bg-[#0a0a0a] border-r border-zinc-800/80 flex flex-col items-center py-4"
            >
                <motion.button
                    onClick={onToggleCollapse}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800/50"
                >
                    <ChevronRight className="w-4 h-4" />
                </motion.button>

                <div className="flex-1 flex flex-col items-center justify-center gap-3 mt-4">
                    {brandSteps.map((step, i) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${step.status === "complete"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-zinc-800/50 text-zinc-500 border border-zinc-700/50"
                                }`}
                        >
                            {step.status === "complete" ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <step.icon className="w-4 h-4" />
                            )}
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-[200px] h-full bg-[#0a0a0a] border-r border-zinc-800/80 flex flex-col"
        >
            {/* Header with gradient accent */}
            <div className="relative p-4 border-b border-zinc-800/80">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-white">Brand Setup</h3>
                        <span className="text-xs text-zinc-500">{completedSteps}/{brandSteps.length} complete</span>
                    </div>
                    <motion.button
                        onClick={onToggleCollapse}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-1.5 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800/50"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="px-4 py-3 border-b border-zinc-800/50">
                <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                            background: "linear-gradient(90deg, #f59e0b, #f97316, #ea580c)"
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                    {/* Glow effect */}
                    <motion.div
                        className="absolute inset-y-0 left-0 rounded-full blur-sm"
                        style={{
                            background: "linear-gradient(90deg, #f59e0b, #f97316)",
                            opacity: 0.5
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                </div>
            </div>

            {/* Steps */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {brandSteps.map((step, i) => (
                    <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        whileHover={{ scale: 1.02, x: 2 }}
                        className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${step.status === "complete"
                            ? "bg-zinc-900/80 border-zinc-700/50 hover:border-amber-500/30"
                            : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-600"
                            }`}
                        onClick={() => step.id !== "validation" && onTriggerStep(step.id as "name" | "colors" | "logo" | "features")}
                    >
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 rounded-xl bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative flex items-start gap-3">
                            {/* Step icon */}
                            <motion.div
                                whileHover={{ rotate: step.status === "complete" ? 0 : 10 }}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${step.status === "complete"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-zinc-800 text-zinc-500 border border-zinc-700/50"
                                    }`}
                            >
                                {step.status === "complete" ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <step.icon className="w-4 h-4" />
                                )}
                            </motion.div>

                            {/* Step content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-medium ${step.status === "complete" ? "text-white" : "text-zinc-400"
                                        }`}>
                                        {step.label}
                                    </span>
                                    {step.status === "complete" && step.id !== "validation" && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            whileHover={{ scale: 1.1 }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-amber-400 transition-all"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </motion.div>
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
                                            <div className="flex gap-1 mt-0.5">
                                                {Object.entries(step.value as Record<string, string>)
                                                    .slice(0, 3)
                                                    .map(([key, color]) => (
                                                        <motion.div
                                                            key={key}
                                                            whileHover={{ scale: 1.2 }}
                                                            className="w-5 h-5 rounded-md border border-zinc-700/50 shadow-sm"
                                                            style={{ backgroundColor: color }}
                                                            title={key}
                                                        />
                                                    ))}
                                            </div>
                                        )}
                                        {step.id === "logo" && (
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 overflow-hidden mt-0.5">
                                                <img
                                                    src={step.value as string}
                                                    alt="Logo"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}
                                        {step.id === "validation" && (
                                            <span className="text-xs text-amber-400 truncate block">
                                                {step.value as string}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {step.status === "pending" && step.id !== "validation" && (
                                    <span className="mt-1 text-xs text-amber-500/80 group-hover:text-amber-400 transition-colors flex items-center gap-1">
                                        Set up <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Brand Preview - Premium Card */}
            <div className="p-3 border-t border-zinc-800/80">
                <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500" />
                    Preview
                </div>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative aspect-video rounded-xl overflow-hidden"
                    style={{
                        backgroundColor: project.colorPalette.background,
                        border: `1px solid ${project.colorPalette.primary}30`
                    }}
                >
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 opacity-30" style={{
                        background: `linear-gradient(135deg, ${project.colorPalette.primary}40, ${project.colorPalette.accent}20)`
                    }} />

                    {/* Content */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            {project.logo ? (
                                <motion.img
                                    src={project.logo}
                                    alt="Logo"
                                    className="h-8 mx-auto mb-1.5"
                                    whileHover={{ scale: 1.1 }}
                                />
                            ) : (
                                <motion.div
                                    whileHover={{ rotate: 5 }}
                                    className="w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center text-white text-lg font-bold shadow-lg"
                                    style={{
                                        background: `linear-gradient(135deg, ${project.colorPalette.primary}, ${project.colorPalette.secondary})`
                                    }}
                                >
                                    {project.name.charAt(0)}
                                </motion.div>
                            )}
                            <p
                                className="font-semibold text-xs"
                                style={{ color: project.colorPalette.text }}
                            >
                                {project.name !== "Untitled Project" ? project.name : "Your Brand"}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.aside>
    );
}
