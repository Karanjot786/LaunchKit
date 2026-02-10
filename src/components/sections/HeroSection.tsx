'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Globe, Code, Palette, Rocket, Zap, FlaskConical, ChevronDown } from 'lucide-react';

interface HeroSectionProps {
    idea: string;
    setIdea: (idea: string) => void;
    validating: boolean;
    validationData: Record<string, unknown> | null;
    creating: boolean;
    onStartBuilding: () => void;
    validationMode: "quick" | "deep";
    setValidationMode: (mode: "quick" | "deep") => void;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
}

const MODELS = [
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash", icon: Zap },
    { value: "gemini-3-pro-preview", label: "Gemini 3 Pro", icon: Sparkles },
];

export default function HeroSection({
    idea,
    setIdea,
    validating,
    validationData,
    creating,
    onStartBuilding,
    validationMode,
    setValidationMode,
    selectedModel,
    setSelectedModel,
}: HeroSectionProps) {
    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

    const currentModel = MODELS.find(m => m.value === selectedModel) || MODELS[0];
    const ModelIcon = currentModel.icon;

    return (
        <section className="relative mx-auto flex w-full flex-col gap-4 pt-32 lg:pt-60">
            {/* Subtle background glow - very minimal */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-b from-zinc-800/50 to-transparent blur-3xl opacity-50" />
            </div>

            {/* Simple headline */}
            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-10"
            >
                What do you want to create?
            </motion.h1>

            {/* v0-style Clean Input */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="w-full px-72"
            >
                <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl hover:border-zinc-600 transition-colors focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500/50">
                    {/* Input area */}
                    <textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="Describe your startup idea..."
                        rows={2}
                        className="w-full bg-transparent text-white placeholder-zinc-500 px-4 py-4 resize-none focus:outline-none text-base sm:text-lg"
                    />

                    {/* Bottom bar with selectors and submit */}
                    <div className="flex items-center justify-between px-4 pb-3">
                        <div className="flex items-center gap-2 text-zinc-400">
                            {/* Mode Toggle */}
                            <div className="flex items-center rounded-lg bg-zinc-800 p-0.5">
                                <button
                                    onClick={() => setValidationMode("quick")}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all ${validationMode === "quick"
                                        ? "bg-zinc-700 text-white"
                                        : "text-zinc-400 hover:text-zinc-200"
                                        }`}
                                >
                                    <Zap className="w-3.5 h-3.5" />
                                    Quick
                                </button>
                                <button
                                    onClick={() => setValidationMode("deep")}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all ${validationMode === "deep"
                                        ? "bg-zinc-700 text-white"
                                        : "text-zinc-400 hover:text-zinc-200"
                                        }`}
                                >
                                    <FlaskConical className="w-3.5 h-3.5" />
                                    Deep
                                </button>
                            </div>

                            {/* Model Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                                >
                                    <ModelIcon className="w-4 h-4" />
                                    <span className="text-sm font-medium">{currentModel.label}</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${modelDropdownOpen ? "rotate-180" : ""}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {modelDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                        {MODELS.map((model) => {
                                            const Icon = model.icon;
                                            return (
                                                <button
                                                    key={model.value}
                                                    onClick={() => {
                                                        setSelectedModel(model.value);
                                                        setModelDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-zinc-700 transition-colors ${selectedModel === model.value ? "bg-zinc-700 text-white" : "text-zinc-300"
                                                        }`}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    {model.label}
                                                    {selectedModel === model.value && (
                                                        <span className="ml-auto text-emerald-400">✓</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Validation status - compact */}
                            {validating && (
                                <span className="flex items-center gap-1.5 text-xs text-cyan-400">
                                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                    Validating...
                                </span>
                            )}
                            {!validating && validationData && (
                                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                    Ready
                                </span>
                            )}
                        </div>

                        {/* Submit button - simple arrow */}
                        <button
                            onClick={onStartBuilding}
                            disabled={!idea.trim() || creating}
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white hover:bg-zinc-200 disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors"
                        >
                            {creating ? (
                                <svg className="w-4 h-4 text-zinc-900 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Quick action chips */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-wrap items-center justify-center gap-2.5 mt-6"
            >
                {[
                    { icon: Rocket, label: "AI fitness tracker", idea: "AI fitness tracker that analyzes workout form using phone camera" },
                    { icon: Globe, label: "Remote team hub", idea: "Remote team collaboration platform with async video updates" },
                    { icon: Code, label: "No-code builder", idea: "No-code website builder for small businesses with AI copywriting" },
                    { icon: Palette, label: "AI art generator", idea: "AI-powered art generator for personalized home decor prints" },
                ].map(({ icon: Icon, label, idea }) => (
                    <button
                        key={label}
                        onClick={() => setIdea(idea)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-all text-sm"
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
                <button
                    onClick={() => {
                        const ideas = [
                            "Subscription box service for indie coffee roasters",
                            "AI-powered resume builder targeting Gen Z job seekers",
                            "Marketplace for local artisan food producers",
                            "Mental health journaling app with AI mood insights",
                            "Peer-to-peer skill exchange platform for remote workers",
                            "Smart home energy optimizer using ML predictions",
                            "Virtual event platform for hybrid conferences",
                            "AI tutor for learning programming languages",
                        ];
                        setIdea(ideas[Math.floor(Math.random() * ideas.length)]);
                    }}
                    className="flex items-center justify-center w-9 h-9 rounded-full border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-all"
                    title="Random idea"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </motion.div>
        </section>
    );
}
