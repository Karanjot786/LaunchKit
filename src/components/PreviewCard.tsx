"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PreviewCardProps {
    type: "logo" | "ad" | "landing" | "schema";
    title: string;
    description?: string;
    image?: string;
    status?: "generating" | "complete" | "error";
    onClick?: () => void;
}

export function PreviewCard({ type, title, description, image, status = "complete", onClick }: PreviewCardProps) {
    const typeStyles = {
        logo: "from-purple-500/10 to-indigo-500/10",
        ad: "from-rose-500/10 to-orange-500/10",
        landing: "from-emerald-500/10 to-teal-500/10",
        schema: "from-blue-500/10 to-cyan-500/10",
    };

    const typeIcons = {
        logo: "◇",
        ad: "▣",
        landing: "◈",
        schema: "⬡",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
        >
            <Card
                onClick={onClick}
                className={`overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br ${typeStyles[type]}`}
            >
                <CardContent className="p-0">
                    {/* Preview area */}
                    <div className="relative h-40 bg-white/50 flex items-center justify-center overflow-hidden">
                        {status === "generating" ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent"
                            />
                        ) : image ? (
                            <img
                                src={image}
                                alt={title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-4xl opacity-30">{typeIcons[type]}</span>
                        )}

                        {/* Status badge */}
                        <Badge
                            className={`absolute top-3 right-3 ${status === "complete"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : status === "generating"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-rose-100 text-rose-700"
                                }`}
                        >
                            {status === "complete" ? "Ready" : status === "generating" ? "Generating..." : "Error"}
                        </Badge>
                    </div>

                    {/* Info */}
                    <div className="p-4 bg-white/80 backdrop-blur-sm">
                        <h4 className="font-display font-semibold text-zinc-800">{title}</h4>
                        {description && (
                            <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{description}</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

interface AssetGridProps {
    assets: {
        id: string;
        type: "logo" | "ad" | "landing" | "schema";
        title: string;
        description?: string;
        image?: string;
        status?: "generating" | "complete" | "error";
    }[];
    onAssetClick?: (id: string) => void;
}

export function AssetGrid({ assets, onAssetClick }: AssetGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
                <PreviewCard
                    key={asset.id}
                    type={asset.type}
                    title={asset.title}
                    description={asset.description}
                    image={asset.image}
                    status={asset.status}
                    onClick={() => onAssetClick?.(asset.id)}
                />
            ))}
        </div>
    );
}
