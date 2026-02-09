"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

interface NameSuggestion {
    name: string;
    tagline: string;
    reasoning: string;
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

interface BrandSuggestionsProps {
    type: "names" | "colors" | "logos";
    suggestions: NameSuggestion[] | ColorPalette[] | string[] | LogoSuggestion[];
    onSelect: (selection: unknown) => void;
    selectedId?: string | number;
}

export function BrandSuggestions({ type, suggestions, onSelect, selectedId }: BrandSuggestionsProps) {
    if (type === "names") {
        return (
            <div className="space-y-2 my-3">
                {(suggestions as NameSuggestion[]).map((item, i) => (
                    <motion.button
                        key={item.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => onSelect(item)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${selectedId === item.name
                            ? "bg-cyan-500/10 border-cyan-500/50"
                            : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                            }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-white">{item.name}</h4>
                                    {selectedId === item.name && (
                                        <Check className="w-4 h-4 text-cyan-400" />
                                    )}
                                </div>
                                <p className="text-sm text-cyan-400 mt-0.5">{item.tagline}</p>
                                <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{item.reasoning}</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                                {item.name.charAt(0)}
                            </div>
                        </div>
                    </motion.button>
                ))}
            </div>
        );
    }

    if (type === "colors") {
        return (
            <div className="grid grid-cols-2 gap-2 my-3">
                {(suggestions as ColorPalette[]).map((palette, i) => (
                    <motion.button
                        key={palette.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => onSelect(palette)}
                        className={`text-left p-3 rounded-xl border transition-all ${selectedId === palette.id
                            ? "bg-cyan-500/10 border-cyan-500/50"
                            : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                            }`}
                    >
                        <div className="flex gap-1 mb-2">
                            {Object.entries(palette.colors).slice(0, 4).map(([key, color]) => (
                                <div
                                    key={key}
                                    className="w-6 h-6 rounded-md first:rounded-l-lg last:rounded-r-lg"
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{palette.name}</span>
                            {selectedId === palette.id && (
                                <Check className="w-4 h-4 text-cyan-400" />
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 truncate">{palette.mood}</p>
                    </motion.button>
                ))}
            </div>
        );
    }

    if (type === "logos") {
        return (
            <div className="grid grid-cols-2 gap-2 my-3">
                {(suggestions as LogoSuggestion[]).map((logo, i) => (
                    <motion.button
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => onSelect(logo.image)}
                        className={`relative aspect-square rounded-xl border overflow-hidden transition-all ${selectedId === logo.image
                            ? "ring-2 ring-cyan-500 border-cyan-500/50"
                            : "border-zinc-700 hover:border-zinc-600"
                            }`}
                    >
                        <img
                            src={logo.image}
                            alt={`Logo option ${i + 1}`}
                            className="w-full h-full object-contain bg-zinc-900 p-4"
                        />
                        {selectedId === logo.image && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-zinc-500 capitalize">{logo.style}</span>
                    </motion.button>
                ))}
            </div>
        );
    }

    return null;
}

// Quick action buttons for chat suggestions
interface QuickActionsProps {
    actions: Array<{ label: string; action: string }>;
    onAction: (action: string) => void;
}

export function QuickActions({ actions, onAction }: QuickActionsProps) {
    return (
        <div className="flex flex-wrap gap-2 mt-3">
            {actions.map((item, i) => (
                <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => onAction(item.action)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    {item.label}
                </motion.button>
            ))}
        </div>
    );
}
