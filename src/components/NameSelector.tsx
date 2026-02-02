"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

interface BrandName {
    name: string;
    tagline: string;
    reasoning: string;
    domains?: { domain: string; available: boolean }[];
}

interface NameSelectorProps {
    names: BrandName[];
    onSelect: (name: BrandName) => void;
}

export function NameSelector({ names, onSelect }: NameSelectorProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl"
        >
            <h2 className="font-display text-2xl font-semibold text-center mb-6">Choose Your Brand</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {names.map((name, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                    >
                        <Card
                            onClick={() => onSelect(name)}
                            className="glass-card border-0 hover:shadow-xl cursor-pointer transition-all rounded-2xl group"
                        >
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-display text-xl font-semibold group-hover:text-indigo-600 transition-colors">
                                        {name.name}
                                    </h4>
                                    <div className="w-8 h-8 rounded-full bg-zinc-100 group-hover:bg-indigo-500 flex items-center justify-center transition-all">
                                        <span className="text-zinc-400 group-hover:text-white text-sm">→</span>
                                    </div>
                                </div>
                                <p className="text-zinc-500 text-sm mb-3">{name.tagline}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {name.domains?.slice(0, 3).map((d, j) => (
                                        <span
                                            key={j}
                                            className={`text-xs px-2 py-0.5 rounded-full ${d.available ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                                                }`}
                                        >
                                            {d.domain}
                                        </span>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
