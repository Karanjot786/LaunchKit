"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProjects, createProject, BuilderProject } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Plus, LogOut, Rocket, Clock, ExternalLink } from "lucide-react";

export default function DashboardPage() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [projects, setProjects] = useState<BuilderProject[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [newProjectIdea, setNewProjectIdea] = useState("");

    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            loadProjects();
        }
    }, [user]);

    const loadProjects = async () => {
        if (!user) return;
        setLoadingProjects(true);
        try {
            const userProjects = await getUserProjects(user.uid);
            setProjects(userProjects);
        } catch (error) {
            console.error("Failed to load projects:", error);
        } finally {
            setLoadingProjects(false);
        }
    };

    const handleCreateProject = async () => {
        if (!user || !newProjectIdea.trim()) return;
        setCreating(true);
        try {
            const projectId = await createProject({
                userId: user.uid,
                name: "Untitled Project",
                tagline: "",
                idea: newProjectIdea,
                logo: null,
                colorPalette: {
                    primary: "#6366F1",
                    secondary: "#818CF8",
                    accent: "#A855F7",
                    background: "#FAFAFA",
                    text: "#18181B",
                },
                validation: {},
                sandboxId: null,
                sandboxUrl: null,
                files: {},
            });
            router.push(`/builder/${projectId}`);
        } catch (error) {
            console.error("Failed to create project:", error);
        } finally {
            setCreating(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
    };

    const formatDate = (timestamp: { seconds: number } | undefined) => {
        if (!timestamp) return "Just now";
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
        });
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-zinc-600 border-t-cyan-400 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header */}
            <header className="border-b border-zinc-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
                            <Rocket className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">LaunchPad</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowNewProjectModal(true)}
                            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium px-4 py-2 rounded-xl transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            New Project
                        </button>

                        <div className="flex items-center gap-3">
                            <img
                                src={user.photoURL || "/default-avatar.png"}
                                alt={user.displayName || "User"}
                                className="w-9 h-9 rounded-full border-2 border-zinc-700"
                            />
                            <button
                                onClick={handleSignOut}
                                className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                                title="Sign out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">
                        Welcome back, {user.displayName?.split(" ")[0] || "there"}!
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        {projects.length === 0
                            ? "Create your first project to get started"
                            : `You have ${projects.length} project${projects.length === 1 ? "" : "s"}`}
                    </p>
                </div>

                {loadingProjects ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-zinc-600 border-t-cyan-400 rounded-full animate-spin" />
                    </div>
                ) : projects.length === 0 ? (
                    /* Empty State */
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 mb-6">
                            <Rocket className="w-10 h-10 text-zinc-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">No projects yet</h2>
                        <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                            Describe your idea and we&apos;ll help you build a stunning website in minutes
                        </p>
                        <button
                            onClick={() => setShowNewProjectModal(true)}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium px-6 py-3 rounded-xl transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            Create Your First Project
                        </button>
                    </motion.div>
                ) : (
                    /* Project Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project, index) => (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => router.push(`/builder/${project.id}`)}
                                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all cursor-pointer group"
                            >
                                {/* Preview */}
                                <div className="aspect-video bg-zinc-800 relative">
                                    {project.sandboxUrl ? (
                                        <iframe
                                            src={project.sandboxUrl}
                                            className="w-full h-full pointer-events-none"
                                            title="Preview"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div
                                                className="w-full h-full flex items-center justify-center"
                                                style={{ backgroundColor: project.colorPalette.primary + "20" }}
                                            >
                                                <div
                                                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                                    style={{ backgroundColor: project.colorPalette.primary }}
                                                >
                                                    <span className="text-2xl">🚀</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                        <span className="text-white font-medium flex items-center gap-1">
                                            Open <ExternalLink className="w-4 h-4" />
                                        </span>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-white truncate">
                                        {project.name}
                                    </h3>
                                    <p className="text-zinc-500 text-sm truncate mt-1">
                                        {project.idea}
                                    </p>
                                    <div className="flex items-center gap-2 mt-3 text-zinc-500 text-xs">
                                        <Clock className="w-3 h-3" />
                                        <span>{formatDate(project.updatedAt as { seconds: number } | undefined)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* New Project Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: projects.length * 0.05 }}
                            onClick={() => setShowNewProjectModal(true)}
                            className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-all cursor-pointer flex items-center justify-center min-h-[240px]"
                        >
                            <div className="text-center p-6">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-800 mb-3">
                                    <Plus className="w-6 h-6 text-zinc-400" />
                                </div>
                                <p className="text-zinc-400 font-medium">New Project</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </main>

            {/* New Project Modal */}
            {showNewProjectModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6"
                    >
                        <h2 className="text-xl font-bold text-white mb-4">Create New Project</h2>
                        <p className="text-zinc-400 mb-6">
                            Describe your idea and we&apos;ll help you build it
                        </p>

                        <textarea
                            value={newProjectIdea}
                            onChange={(e) => setNewProjectIdea(e.target.value)}
                            placeholder="e.g., A fitness app that tracks workouts and provides AI-powered coaching..."
                            className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-cyan-500 transition-colors"
                            autoFocus
                        />

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowNewProjectModal(false)}
                                className="flex-1 py-3 px-4 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateProject}
                                disabled={!newProjectIdea.trim() || creating}
                                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {creating ? "Creating..." : "Create & Start Building"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
