"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Zap, TrendingUp, Users, Target, Globe, ExternalLink } from "lucide-react";

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
        scores?: { viability: number; demandLevel: number };
    };
    idea?: string;
}

interface NameSuggestion {
    name: string;
    tagline: string;
    reasoning: string;
    domains?: { domain: string; available: boolean }[];
}

interface ColorPalette {
    id: number;
    name: string;
    description: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    mood: string;
}

interface LogoSuggestion {
    id: number;
    style: string;
    image: string;
}

interface BrandSetupPreviewProps {
    brand: BrandContext;
    isValidating?: boolean;
    suggestions?: {
        type: "names" | "colors" | "logos" | null;
        data: unknown[];
    };
    onSelectName?: (name: NameSuggestion) => void;
    onSelectColors?: (palette: ColorPalette) => void;
    onSelectLogo?: (logoUrl: string) => void;
}

export function BrandSetupPreview({
    brand,
    isValidating,
    suggestions,
    onSelectName,
    onSelectColors,
    onSelectLogo
}: BrandSetupPreviewProps) {
    const hasValidation = brand.validation && Object.keys(brand.validation).length > 0 && brand.validation.category;
    const hasName = brand.name && brand.name !== "Untitled Project";
    const hasColors = brand.colorPalette.primary !== "#6366F1";
    const hasLogo = brand.logo !== null;

    const viabilityScore = brand.validation?.scores?.viability || (hasValidation ? 78 : 0);

    // Render name suggestions
    if (suggestions?.type === "names" && suggestions.data.length > 0) {
        const names = suggestions.data as NameSuggestion[];
        return (
            <div className="flex-1 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-xl font-bold text-white mb-2">Choose Your Brand Name</h2>
                    <p className="text-zinc-400 mb-6">Click a name to select it for your brand</p>

                    <div className="grid gap-4">
                        {names.map((item, i) => (
                            <motion.button
                                key={item.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => onSelectName?.(item)}
                                className="w-full text-left bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-cyan-500/50 rounded-2xl p-5 transition-all group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                                                {item.name}
                                            </h3>
                                            {item.domains?.some(d => d.available) && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                                                    <Globe className="w-3 h-3" />
                                                    .com available
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-cyan-400 text-sm mb-2">{item.tagline}</p>
                                        <p className="text-zinc-400 text-sm">{item.reasoning}</p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                                            <Check className="w-5 h-5 text-cyan-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* Domain badges */}
                                {item.domains && item.domains.length > 0 && (
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-700/50">
                                        {item.domains.slice(0, 3).map((d) => (
                                            <span
                                                key={d.domain}
                                                className={`text-xs px-2 py-1 rounded-lg ${d.available
                                                    ? "bg-green-500/10 text-green-400"
                                                    : "bg-zinc-800 text-zinc-500"
                                                    }`}
                                            >
                                                {d.domain}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Render color palette suggestions
    if (suggestions?.type === "colors" && suggestions.data.length > 0) {
        const palettes = suggestions.data as ColorPalette[];
        return (
            <div className="flex-1 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold text-white mb-2">Choose Your Color Palette</h2>
                    <p className="text-zinc-400 mb-6">Select a palette that matches your brand personality</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {palettes.map((palette, i) => (
                            <motion.button
                                key={palette.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => onSelectColors?.(palette)}
                                className="text-left bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-cyan-500/50 rounded-2xl p-5 transition-all group"
                            >
                                {/* Color swatches */}
                                <div className="flex gap-2 mb-4">
                                    {Object.entries(palette.colors).map(([key, color]) => (
                                        <div
                                            key={key}
                                            className="flex-1 h-12 rounded-xl first:rounded-l-2xl last:rounded-r-2xl shadow-lg"
                                            style={{ backgroundColor: color }}
                                            title={`${key}: ${color}`}
                                        />
                                    ))}
                                </div>

                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                                            {palette.name}
                                        </h3>
                                        <p className="text-zinc-400 text-sm mt-1">{palette.description}</p>
                                        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
                                            {palette.mood}
                                        </span>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-cyan-400" />
                                        </div>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Render logo suggestions
    if (suggestions?.type === "logos" && suggestions.data.length > 0) {
        const logos = suggestions.data as LogoSuggestion[];
        return (
            <div className="flex-1 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-xl font-bold text-white mb-2">Choose Your Logo</h2>
                    <p className="text-zinc-400 mb-6">Select the logo that best represents your brand</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {logos.map((logo, i) => (
                            <motion.button
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                onClick={() => onSelectLogo?.(logo.image)}
                                className="aspect-square bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-cyan-500/50 rounded-2xl p-6 transition-all group flex flex-col items-center justify-center relative"
                            >
                                <img
                                    src={logo.image}
                                    alt={`Logo option ${i + 1}`}
                                    className="max-w-full max-h-full object-contain mb-2"
                                />
                                <span className="text-xs text-zinc-500 capitalize absolute bottom-2">{logo.style}</span>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-cyan-400" />
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 overflow-y-auto">
            <AnimatePresence mode="wait">
                {/* Validating State */}
                {isValidating && !hasValidation && (
                    <motion.div
                        key="validating"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex flex-col items-center justify-center p-8"
                    >
                        <div className="relative">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-indigo-600/20 flex items-center justify-center">
                                <Sparkles className="w-12 h-12 text-cyan-400" />
                            </div>
                            <motion.div
                                className="absolute inset-0 rounded-3xl border-2 border-cyan-400/50"
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </div>
                        <h2 className="text-2xl font-bold text-white mt-8 mb-3">Validating Your Idea</h2>
                        <p className="text-zinc-400 text-center max-w-md mb-8">
                            Analyzing market trends, competition, and community sentiment...
                        </p>
                        <div className="flex gap-2">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="w-3 h-3 rounded-full bg-cyan-400"
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Validation Complete - Show Results */}
                {hasValidation && !suggestions?.type && (
                    <motion.div
                        key="validated"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 max-w-4xl mx-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center">
                                <Check className="w-7 h-7 text-green-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Validation Complete</h2>
                                <p className="text-cyan-400 font-medium">{brand.validation.category?.primary}</p>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-zinc-800/50 backdrop-blur rounded-2xl p-5 border border-zinc-700/50">
                                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-3">
                                    <Users className="w-4 h-4" />
                                    Target Audience
                                </div>
                                <p className="text-white font-medium leading-relaxed">
                                    {brand.validation.category?.targetAudience || "General users"}
                                </p>
                            </div>

                            <div className="bg-zinc-800/50 backdrop-blur rounded-2xl p-5 border border-zinc-700/50">
                                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-3">
                                    <TrendingUp className="w-4 h-4" />
                                    Viability Score
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${viabilityScore}%` }}
                                            transition={{ duration: 1, delay: 0.3 }}
                                        />
                                    </div>
                                    <span className="text-xl font-bold text-white">{viabilityScore}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Pain Points */}
                        {brand.validation.community?.painPoints && brand.validation.community.painPoints.length > 0 && (
                            <div className="mb-8">
                                <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-4">
                                    <Target className="w-4 h-4" />
                                    Pain Points Identified
                                </h3>
                                <div className="space-y-3">
                                    {brand.validation.community.painPoints.slice(0, 3).map((point, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex items-start gap-3 bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/30"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                                            </div>
                                            <p className="text-zinc-300 text-sm leading-relaxed">{point}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Opportunities */}
                        {brand.validation.opportunities && brand.validation.opportunities.length > 0 && (
                            <div>
                                <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-4">
                                    <Sparkles className="w-4 h-4" />
                                    Opportunities
                                </h3>
                                <div className="space-y-3">
                                    {brand.validation.opportunities.slice(0, 3).map((opp, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + i * 0.1 }}
                                            className="flex items-start gap-3 bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/30"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check className="w-3.5 h-3.5 text-green-400" />
                                            </div>
                                            <p className="text-zinc-300 text-sm leading-relaxed">{opp}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Brand Preview Card */}
                        {hasName && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="mt-8 bg-gradient-to-br from-zinc-800/80 to-zinc-800/40 rounded-2xl p-6 border border-zinc-700/50"
                            >
                                <h3 className="text-sm font-medium text-zinc-400 mb-4">Brand Preview</h3>
                                <div className="flex items-center gap-4">
                                    {hasLogo ? (
                                        <img src={brand.logo!} alt="" className="w-16 h-16 rounded-xl object-contain bg-zinc-900" />
                                    ) : (
                                        <div
                                            className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                                            style={{ backgroundColor: brand.colorPalette.primary }}
                                        >
                                            {brand.name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-xl font-bold text-white">{brand.name}</h4>
                                        <p className="text-zinc-400">{brand.tagline || "Your tagline here"}</p>
                                    </div>
                                </div>
                                {hasColors && (
                                    <div className="flex gap-2 mt-4">
                                        {Object.entries(brand.colorPalette).slice(0, 4).map(([key, color]) => (
                                            <div
                                                key={key}
                                                className="w-8 h-8 rounded-lg shadow-lg"
                                                style={{ backgroundColor: color }}
                                                title={`${key}: ${color}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* Empty State */}
                {!isValidating && !hasValidation && !suggestions?.type && (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex flex-col items-center justify-center p-8"
                    >
                        <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 flex items-center justify-center mb-6">
                            <Sparkles className="w-10 h-10 text-zinc-600" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Ready to Validate</h2>
                        <p className="text-zinc-400 text-center max-w-md">
                            Describe your startup idea in the chat to get started
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
