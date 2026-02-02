"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Logo {
    id: number;
    style: string;
    image: string;
}

interface LogoSelectorProps {
    brandName: string;
    logos: Logo[];
    onSelect: (logo: Logo) => void;
}

const styleLabels: Record<string, string> = {
    minimalist: "Minimalist",
    geometric: "Geometric",
    lettermark: "Lettermark",
    icon: "Icon",
    wordmark: "Wordmark",
    emblem: "Emblem",
};

export function LogoSelector({ brandName, logos, onSelect }: LogoSelectorProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl"
        >
            <div className="text-center mb-8">
                <Badge className="mb-4 bg-purple-50 text-purple-600 border-purple-100">
                    {logos.length} Styles Generated
                </Badge>
                <h2 className="font-display text-3xl font-bold text-zinc-800 mb-2">
                    Choose Your Logo
                </h2>
                <p className="text-zinc-500">
                    Select the perfect logo for <span className="font-semibold text-zinc-700">{brandName}</span>
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {logos.map((logo, i) => (
                    <motion.div
                        key={logo.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card
                            onClick={() => onSelect(logo)}
                            className="glass-card border-0 hover:shadow-xl cursor-pointer transition-all rounded-2xl group overflow-hidden"
                        >
                            <CardContent className="p-0">
                                {/* Logo Preview */}
                                <div className="aspect-square bg-white p-6 flex items-center justify-center border-b border-zinc-100 group-hover:bg-zinc-50 transition-colors">
                                    <img
                                        src={logo.image}
                                        alt={`${brandName} ${logo.style} logo`}
                                        className="w-full h-full object-contain max-w-[160px] max-h-[160px]"
                                    />
                                </div>

                                {/* Style Label */}
                                <div className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-zinc-800 group-hover:text-indigo-600 transition-colors">
                                            {styleLabels[logo.style] || logo.style}
                                        </p>
                                        <p className="text-xs text-zinc-400">Click to select</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-zinc-100 group-hover:bg-indigo-500 flex items-center justify-center transition-all">
                                        <span className="text-zinc-400 group-hover:text-white text-sm">→</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <p className="text-center text-sm text-zinc-400 mt-6">
                Each logo is AI-generated and unique to your brand
            </p>
        </motion.div>
    );
}
