"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BuilderLayout } from "@/components/builder/BuilderLayout";

// Default brand context
const defaultBrandContext = {
    name: "LaunchKit",
    tagline: "From idea to launch in minutes",
    logo: null,
    colorPalette: {
        primary: "#6366F1",
        secondary: "#818CF8",
        accent: "#A855F7",
        background: "#FAFAFA",
        text: "#18181B",
    },
    validation: {
        category: {
            primary: "SaaS",
            targetAudience: "Startup founders and entrepreneurs",
            keywords: ["startup", "launch", "MVP"],
        },
        community: {
            painPoints: [
                "Too slow to validate ideas",
                "Expensive to build MVPs",
                "Hard to create professional branding",
            ],
        },
        opportunities: [
            "AI-powered rapid prototyping",
            "Integrated branding and website generation",
        ],
    },
};

function BuilderContent() {
    const searchParams = useSearchParams();
    const [brandContext, setBrandContext] = useState(defaultBrandContext);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Get brand context from localStorage
        const stored = localStorage.getItem("LaunchKit_brand_context");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setBrandContext(parsed);
            } catch (e) {
                console.error("Failed to parse brand context:", e);
            }
        }
    }, [searchParams]);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full" />
            </div>
        );
    }

    return <BuilderLayout brandContext={brandContext} />;
}

export default function BuilderPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full" />
                </div>
            }
        >
            <BuilderContent />
        </Suspense>
    );
}
