'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check,
    Sparkles,
    Rocket,
    Star,
    Zap,
    ChevronDown,
    ChevronUp,
    Search,
    Loader2,
    X
} from 'lucide-react';
import type { Feature, FeatureDeepDive } from '@/lib/feature-brainstorm';

interface FeatureSelectorProps {
    mvpFeatures: Feature[];
    stretchFeatures: Feature[];
    moonshotFeatures: Feature[];
    selectedFeatures: Feature[];
    onToggleFeature: (feature: Feature) => void;
    onDeepDive: (feature: Feature) => void;
    deepDiveData?: FeatureDeepDive | null;
    deepDiveLoading?: boolean;
    onCloseDeepDive?: () => void;
}

const effortColors = {
    low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    high: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

const categoryConfig = {
    mvp: { icon: Zap, label: 'MVP Features', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    stretch: { icon: Rocket, label: 'Stretch Goals', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    moonshot: { icon: Star, label: 'Moonshots', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
};

function FeatureCard({
    feature,
    isSelected,
    onToggle,
    onDeepDive
}: {
    feature: Feature;
    isSelected: boolean;
    onToggle: () => void;
    onDeepDive: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                relative p-4 rounded-xl border transition-all cursor-pointer
                ${isSelected
                    ? 'bg-zinc-800 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                    : 'bg-zinc-900 border-zinc-700 hover:border-zinc-600'
                }
            `}
            onClick={onToggle}
        >
            {/* Selection indicator */}
            <div className={`
                absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                ${isSelected
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'border-zinc-600'
                }
            `}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>

            {/* Content */}
            <h4 className="font-semibold text-white pr-8 mb-1">{feature.title}</h4>
            <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{feature.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs border ${effortColors[feature.effort]}`}>
                    {feature.effort} effort
                </span>
                {feature.painPointSolved && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-700 text-zinc-300">
                        Solves: {feature.painPointSolved.substring(0, 30)}...
                    </span>
                )}
            </div>

            {/* Deep dive button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDeepDive();
                }}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
                <Search className="w-3.5 h-3.5" />
                Go Deeper
            </button>
        </motion.div>
    );
}

function FeatureSection({
    category,
    features,
    selectedFeatures,
    onToggle,
    onDeepDive,
}: {
    category: 'mvp' | 'stretch' | 'moonshot';
    features: Feature[];
    selectedFeatures: Feature[];
    onToggle: (feature: Feature) => void;
    onDeepDive: (feature: Feature) => void;
}) {
    const [expanded, setExpanded] = useState(category === 'mvp');
    const config = categoryConfig[category];
    const Icon = config.icon;
    const selectedCount = features.filter(f =>
        selectedFeatures.some(sf => sf.id === f.id)
    ).length;

    return (
        <div className="mb-4">
            <button
                onClick={() => setExpanded(!expanded)}
                className={`
                    w-full flex items-center justify-between p-3 rounded-lg
                    ${config.bgColor} hover:opacity-80 transition-opacity
                `}
            >
                <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className={`font-medium ${config.color}`}>{config.label}</span>
                    <span className="text-xs text-zinc-500">
                        ({selectedCount}/{features.length} selected)
                    </span>
                </div>
                {expanded ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                            {features.map((feature) => (
                                <FeatureCard
                                    key={feature.id}
                                    feature={feature}
                                    isSelected={selectedFeatures.some(sf => sf.id === feature.id)}
                                    onToggle={() => onToggle(feature)}
                                    onDeepDive={() => onDeepDive(feature)}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DeepDiveModal({
    data,
    loading,
    onClose,
}: {
    data: FeatureDeepDive | null;
    loading: boolean;
    onClose: () => void;
}) {
    if (!data && !loading) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                        <span className="ml-3 text-zinc-400">Researching feature...</span>
                    </div>
                ) : data ? (
                    <div className="p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white">{data.feature.title}</h3>
                                <p className="text-sm text-zinc-400 mt-1">{data.feature.description}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        {/* Estimated time */}
                        <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm text-cyan-400">
                                Estimated: {data.estimatedDays} days to implement
                            </span>
                        </div>

                        {/* Technical Requirements */}
                        {data.technicalRequirements.length > 0 && (
                            <div className="mb-5">
                                <h4 className="text-sm font-semibold text-white mb-2">Technical Requirements</h4>
                                <ul className="space-y-1">
                                    {data.technicalRequirements.map((req, i) => (
                                        <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                                            <span className="text-cyan-400 mt-1">•</span>
                                            {req}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* User Stories */}
                        {data.userStories.length > 0 && (
                            <div className="mb-5">
                                <h4 className="text-sm font-semibold text-white mb-2">User Stories</h4>
                                <ul className="space-y-2">
                                    {data.userStories.map((story, i) => (
                                        <li key={i} className="text-sm text-zinc-400 p-2 rounded-lg bg-zinc-800">
                                            {story}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Implementation Approach */}
                        {data.implementationApproach && (
                            <div className="mb-5">
                                <h4 className="text-sm font-semibold text-white mb-2">Implementation Approach</h4>
                                <p className="text-sm text-zinc-400">{data.implementationApproach}</p>
                            </div>
                        )}

                        {/* Challenges */}
                        {data.challenges.length > 0 && (
                            <div className="mb-5">
                                <h4 className="text-sm font-semibold text-white mb-2">Potential Challenges</h4>
                                <ul className="space-y-1">
                                    {data.challenges.map((challenge, i) => (
                                        <li key={i} className="text-sm text-rose-400/80 flex items-start gap-2">
                                            <span className="mt-1">⚠️</span>
                                            {challenge}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Competitor Examples */}
                        {data.competitorExamples.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-white mb-2">How Competitors Do It</h4>
                                <ul className="space-y-1">
                                    {data.competitorExamples.map((example, i) => (
                                        <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                                            <span className="text-purple-400 mt-1">→</span>
                                            {example}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : null}
            </motion.div>
        </motion.div>
    );
}

export default function FeatureSelector({
    mvpFeatures,
    stretchFeatures,
    moonshotFeatures,
    selectedFeatures,
    onToggleFeature,
    onDeepDive,
    deepDiveData,
    deepDiveLoading,
    onCloseDeepDive,
}: FeatureSelectorProps) {
    const totalSelected = selectedFeatures.length;
    const totalFeatures = mvpFeatures.length + stretchFeatures.length + moonshotFeatures.length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-cyan-400" />
                        Select Features
                    </h3>
                    <p className="text-sm text-zinc-400">
                        Choose the features you want in your MVP
                    </p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-zinc-800 text-sm">
                    <span className="text-cyan-400 font-medium">{totalSelected}</span>
                    <span className="text-zinc-500"> / {totalFeatures} selected</span>
                </div>
            </div>

            {/* Feature sections */}
            {mvpFeatures.length > 0 && (
                <FeatureSection
                    category="mvp"
                    features={mvpFeatures}
                    selectedFeatures={selectedFeatures}
                    onToggle={onToggleFeature}
                    onDeepDive={onDeepDive}
                />
            )}
            {stretchFeatures.length > 0 && (
                <FeatureSection
                    category="stretch"
                    features={stretchFeatures}
                    selectedFeatures={selectedFeatures}
                    onToggle={onToggleFeature}
                    onDeepDive={onDeepDive}
                />
            )}
            {moonshotFeatures.length > 0 && (
                <FeatureSection
                    category="moonshot"
                    features={moonshotFeatures}
                    selectedFeatures={selectedFeatures}
                    onToggle={onToggleFeature}
                    onDeepDive={onDeepDive}
                />
            )}

            {/* Deep dive modal */}
            <AnimatePresence>
                {(deepDiveData || deepDiveLoading) && (
                    <DeepDiveModal
                        data={deepDiveData || null}
                        loading={deepDiveLoading || false}
                        onClose={onCloseDeepDive || (() => { })}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
