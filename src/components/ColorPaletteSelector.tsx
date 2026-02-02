"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface ColorPaletteSelectorProps {
    brandName: string;
    palettes: ColorPalette[];
    onSelect: (palette: ColorPalette) => void;
}

export function ColorPaletteSelector({ brandName, palettes, onSelect }: ColorPaletteSelectorProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl"
        >
            <div className="text-center mb-8">
                <Badge className="mb-4 bg-amber-50 text-amber-600 border-amber-100">
                    {palettes.length} Palettes Generated
                </Badge>
                <h2 className="font-display text-3xl font-bold text-zinc-800 mb-2">
                    Choose Your Colors
                </h2>
                <p className="text-zinc-500">
                    Select a color palette for <span className="font-semibold text-zinc-700">{brandName}</span>
                </p>
            </div>

            <div className="space-y-4">
                {palettes.map((palette, i) => (
                    <motion.div
                        key={palette.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card
                            onClick={() => onSelect(palette)}
                            className="glass-card border-0 hover:shadow-xl cursor-pointer transition-all rounded-2xl group overflow-hidden"
                        >
                            <CardContent className="p-0">
                                <div className="flex items-stretch">
                                    {/* Color swatches */}
                                    <div className="flex flex-shrink-0">
                                        <div
                                            className="w-16 h-24"
                                            style={{ backgroundColor: palette.colors.primary }}
                                            title="Primary"
                                        />
                                        <div
                                            className="w-12 h-24"
                                            style={{ backgroundColor: palette.colors.secondary }}
                                            title="Secondary"
                                        />
                                        <div
                                            className="w-10 h-24"
                                            style={{ backgroundColor: palette.colors.accent }}
                                            title="Accent"
                                        />
                                        <div
                                            className="w-8 h-24 flex flex-col"
                                        >
                                            <div
                                                className="flex-1"
                                                style={{ backgroundColor: palette.colors.background }}
                                                title="Background"
                                            />
                                            <div
                                                className="flex-1"
                                                style={{ backgroundColor: palette.colors.text }}
                                                title="Text"
                                            />
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 p-5 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-display text-lg font-semibold text-zinc-800 group-hover:text-indigo-600 transition-colors">
                                                    {palette.name}
                                                </h4>
                                                <Badge variant="outline" className="text-xs">
                                                    {palette.mood}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-zinc-500">{palette.description}</p>

                                            {/* Color codes */}
                                            <div className="flex gap-2 mt-2">
                                                {Object.entries(palette.colors).slice(0, 3).map(([key, color]) => (
                                                    <span
                                                        key={key}
                                                        className="text-xs font-mono bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded"
                                                    >
                                                        {color}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="w-10 h-10 rounded-full bg-zinc-100 group-hover:bg-indigo-500 flex items-center justify-center transition-all flex-shrink-0 ml-4">
                                            <span className="text-zinc-400 group-hover:text-white">→</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <p className="text-center text-sm text-zinc-400 mt-6">
                Colors will be used for your logo, website, and brand materials
            </p>
        </motion.div>
    );
}
