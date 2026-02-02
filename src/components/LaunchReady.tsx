"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BrandName {
    name: string;
    tagline: string;
}

interface LaunchReadyProps {
    brand: BrandName;
    logo: string | null;
    onPreview: () => void;
    onDeploy: () => void;
    onDownload: () => void;
}

export function LaunchReady({ brand, logo, onPreview, onDeploy, onDownload }: LaunchReadyProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-xl text-center"
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
            >
                <div className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl overflow-hidden">
                    {logo ? (
                        <img src={logo} alt="Logo" className="w-20 h-20 object-contain" />
                    ) : (
                        <span className="text-white font-display text-5xl font-bold">{brand.name.charAt(0)}</span>
                    )}
                </div>
            </motion.div>

            <Badge className="mb-4 bg-emerald-50 text-emerald-600">✓ Ready to Launch</Badge>
            <h1 className="font-display text-4xl font-bold text-zinc-900 mb-2">{brand.name}</h1>
            <p className="text-zinc-500 mb-8">{brand.tagline}</p>

            {/* Asset Preview */}
            {logo && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8 p-4 glass-card rounded-2xl"
                >
                    <p className="text-xs text-zinc-400 mb-3 uppercase tracking-wider">Generated Assets</p>
                    <div className="flex justify-center gap-4">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-white rounded-xl shadow-md flex items-center justify-center mb-2 mx-auto">
                                <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
                            </div>
                            <span className="text-xs text-zinc-500">Logo</span>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-white rounded-xl shadow-md flex items-center justify-center mb-2 mx-auto">
                                <span className="text-2xl">🌐</span>
                            </div>
                            <span className="text-xs text-zinc-500">Website</span>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-white rounded-xl shadow-md flex items-center justify-center mb-2 mx-auto">
                                <span className="text-2xl">📱</span>
                            </div>
                            <span className="text-xs text-zinc-500">Content</span>
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="space-y-3">
                <Button
                    onClick={onPreview}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-6 rounded-xl"
                >
                    Preview Website →
                </Button>
                <Button
                    onClick={onDeploy}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-6 rounded-xl"
                >
                    Deploy to Firebase →
                </Button>
                <Button
                    onClick={onDownload}
                    variant="outline"
                    className="w-full py-6 rounded-xl"
                >
                    Download Logo
                </Button>
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8 flex items-center justify-center gap-4 text-xs text-zinc-400"
            >
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Full-Stack App
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Auth Ready
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />Database Configured
                </span>
            </motion.div>
        </motion.div>
    );
}
