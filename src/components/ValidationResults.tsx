"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ValidationResult {
    category: {
        primary: string;
        secondary: string[];
        targetAudience: string;
        keywords: string[];
    };
    community: {
        posts: { title: string; subreddit: string; score: number; numComments: number }[];
        totalEngagement: number;
        sentiment: "positive" | "mixed" | "negative";
        painPoints: string[];
    };
    market: {
        size: string;
        growth: string;
        competitors: { name: string; description: string }[];
    };
    scores: {
        viability: number;
        painPointStrength: number;
        demandLevel: number;
        competitionIntensity: number;
    };
    verdict: string;
    recommendation: "proceed" | "pivot" | "reconsider";
    opportunities: string[];
    risks: string[];
}

interface ValidationResultsProps {
    validation: ValidationResult;
    onContinue: () => void;
}

const sentimentColors = {
    positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
    mixed: "bg-amber-50 text-amber-700 border-amber-200",
    negative: "bg-rose-50 text-rose-700 border-rose-200",
};

const recommendationConfig = {
    proceed: { color: "bg-emerald-500", text: "✓ Recommended to Proceed" },
    pivot: { color: "bg-amber-500", text: "⚡ Consider Pivoting" },
    reconsider: { color: "bg-rose-500", text: "⚠ Needs Reconsideration" },
};

export function ValidationResults({ validation, onContinue }: ValidationResultsProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-4xl"
        >
            {/* Header */}
            <div className="text-center mb-8">
                <Badge className={`${recommendationConfig[validation.recommendation].color} text-white mb-4`}>
                    {recommendationConfig[validation.recommendation].text}
                </Badge>
                <h2 className="font-display text-3xl font-bold text-zinc-800 mb-2">Validation Complete</h2>
                <p className="text-zinc-500 max-w-xl mx-auto">{validation.verdict}</p>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Viability", value: validation.scores.viability, color: "indigo" },
                    { label: "Pain Points", value: validation.scores.painPointStrength, color: "purple" },
                    { label: "Demand", value: validation.scores.demandLevel, color: "blue" },
                    { label: "Competition", value: validation.scores.competitionIntensity, color: "amber" },
                ].map((score) => (
                    <Card key={score.label} className="glass-card border-0">
                        <CardContent className="p-4 text-center">
                            <div className={`text-3xl font-display font-bold text-${score.color}-600`}>{score.value}/10</div>
                            <div className="text-sm text-zinc-500">{score.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Category & Community */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="glass-card border-0">
                    <CardContent className="p-5">
                        <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
                            <span className="text-xl">🏷️</span> Category
                        </h3>
                        <Badge className="bg-indigo-100 text-indigo-700 mb-2">{validation.category.primary}</Badge>
                        <p className="text-sm text-zinc-500 mb-2">{validation.category.targetAudience}</p>
                        <div className="flex flex-wrap gap-1">
                            {validation.category.keywords.map((k, i) => (
                                <span key={i} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">{k}</span>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-0">
                    <CardContent className="p-5">
                        <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
                            <span className="text-xl">💬</span> Reddit Sentiment
                        </h3>
                        <Badge className={sentimentColors[validation.community.sentiment]}>{validation.community.sentiment}</Badge>
                        <p className="text-sm text-zinc-500 mt-2">
                            {validation.community.posts.length} posts analyzed • {validation.community.totalEngagement} engagement
                        </p>
                        {validation.community.painPoints.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs text-zinc-400 mb-1">Pain Points:</p>
                                <ul className="text-sm text-zinc-600 space-y-1">
                                    {validation.community.painPoints.slice(0, 3).map((p, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-rose-500">•</span>{p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Market */}
            <Card className="glass-card border-0 mb-8">
                <CardContent className="p-5">
                    <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
                        <span className="text-xl">📊</span> Market Analysis
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-xs text-zinc-400">Market Size</p>
                            <p className="font-medium text-zinc-800">
                                {typeof validation.market.size === 'object'
                                    ? Object.entries(validation.market.size).map(([k, v]) => `${k}: ${v}`).join(' | ')
                                    : validation.market.size}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-400">Growth</p>
                            <p className="font-medium text-zinc-800">
                                {typeof validation.market.growth === 'object'
                                    ? JSON.stringify(validation.market.growth)
                                    : validation.market.growth}
                            </p>
                        </div>
                    </div>
                    {validation.market.competitors.length > 0 && (
                        <div>
                            <p className="text-xs text-zinc-400 mb-2">Competitors</p>
                            <div className="flex flex-wrap gap-2">
                                {validation.market.competitors.slice(0, 5).map((c, i) => (
                                    <span key={i} className="text-sm bg-zinc-100 text-zinc-700 px-3 py-1 rounded-full">{c.name}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Opportunities & Risks */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="glass-card border-0 border-l-4 border-l-emerald-500">
                    <CardContent className="p-5">
                        <h3 className="font-semibold text-emerald-700 mb-2">✨ Opportunities</h3>
                        <ul className="text-sm text-zinc-600 space-y-2">
                            {validation.opportunities.map((o, i) => <li key={i}>• {o}</li>)}
                        </ul>
                    </CardContent>
                </Card>
                <Card className="glass-card border-0 border-l-4 border-l-rose-500">
                    <CardContent className="p-5">
                        <h3 className="font-semibold text-rose-700 mb-2">⚠️ Risks</h3>
                        <ul className="text-sm text-zinc-600 space-y-2">
                            {validation.risks.map((r, i) => <li key={i}>• {r}</li>)}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* Action */}
            <div className="text-center">
                <Button
                    onClick={onContinue}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-6 rounded-xl text-lg shadow-lg"
                >
                    Continue to Branding →
                </Button>
            </div>
        </motion.div>
    );
}
