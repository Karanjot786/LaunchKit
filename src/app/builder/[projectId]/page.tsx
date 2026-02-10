"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getProject, updateProjectData, BuilderProject } from "@/lib/firebase";
import { BuilderLayout } from "@/components/builder/BuilderLayout";

export default function BuilderProjectPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading } = useAuth();
    const projectId = params.projectId as string;

    const [project, setProject] = useState<BuilderProject | null>(null);
    const [loadingProject, setLoadingProject] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user && projectId) {
            loadProject();
        }
    }, [user, projectId]);

    const loadProject = async () => {
        setLoadingProject(true);
        setError(null);
        try {
            const proj = await getProject(projectId);
            if (!proj) {
                setError("Project not found");
                return;
            }
            if (proj.userId !== user?.uid) {
                setError("You don't have access to this project");
                return;
            }
            setProject(proj);
        } catch (err) {
            console.error("Failed to load project:", err);
            setError("Failed to load project");
        } finally {
            setLoadingProject(false);
        }
    };

    const handleProjectUpdate = useCallback(async (updates: Partial<BuilderProject>) => {
        if (!projectId) return;
        try {
            await updateProjectData(projectId, updates);
            setProject(prev => prev ? { ...prev, ...updates } : null);
        } catch (err) {
            console.error("Failed to update project:", err);
        }
    }, [projectId]);

    if (loading || loadingProject) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-zinc-600 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400">Loading project...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">{error}</h1>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!project) {
        return null;
    }

    // Convert project to brand context for BuilderLayout
    const brandContext = {
        name: project.name,
        tagline: project.tagline,
        logo: project.logo,
        colorPalette: project.colorPalette,
        validation: project.validation as {
            category: { primary: string; targetAudience: string; keywords: string[] };
            community: { painPoints: string[] };
            opportunities: string[];
        },
        idea: project.idea,
        validationMode: project.validationMode || "quick",
        selectedModel: project.selectedModel || "gemini-3-flash-preview",
    };

    return (
        <BuilderLayout
            brandContext={brandContext}
            projectId={projectId}
            onProjectUpdate={handleProjectUpdate}
            initialFiles={project.files || {}}
        />
    );
}
