"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProjects, createProject, BuilderProject } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, LogOut, Clock, ExternalLink, Sparkles, Layers, ArrowUpRight, X } from "lucide-react";
import Header from "@/components/sections/Header";

export default function DashboardPage() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [projects, setProjects] = useState<BuilderProject[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [newProjectIdea, setNewProjectIdea] = useState("");
    const [hoveredProject, setHoveredProject] = useState<string | null>(null);

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
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });
    };

    // Loading state with premium animation
    if (loading || !user) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
                {/* Ambient background */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
                </div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative"
                >
                    <div className="w-12 h-12 border-2 border-zinc-800 border-t-amber-400 rounded-full animate-spin" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] relative">
            {/* Ambient background gradients */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-amber-500/8 via-orange-500/5 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-zinc-800/50 to-transparent rounded-full blur-3xl" />
                {/* Subtle grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                />
            </div>

            {/* Header */}
            <Header variant="dashboard">
                <motion.button
                    onClick={() => setShowNewProjectModal(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm overflow-hidden"
                >
                    {/* Animated gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 transition-all duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Plus className="w-4 h-4 text-black relative z-10" />
                    <span className="text-black relative z-10">New Project</span>
                </motion.button>

                <div className="flex items-center gap-4">
                    <motion.div
                        className="relative"
                        whileHover={{ scale: 1.05 }}
                    >
                        <img
                            src={user.photoURL || "/default-avatar.png"}
                            alt={user.displayName || "User"}
                            className="w-10 h-10 rounded-full border-2 border-zinc-800 hover:border-amber-500/50 transition-colors"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0a0a0a]" />
                    </motion.div>
                    <button
                        onClick={handleSignOut}
                        className="text-zinc-500 hover:text-white p-2 rounded-lg hover:bg-zinc-800/50 transition-all"
                        title="Sign out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </Header>

            {/* Main Content */}
            <main className="relative max-w-7xl mx-auto px-6 lg:px-8 py-8 pt-10">
                {/* Welcome Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-12"
                >
                    <div className="flex items-end justify-between">
                        <div>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-amber-500/80 text-sm font-medium tracking-wide uppercase mb-2"
                            >
                                Your Workspace
                            </motion.p>
                            <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                                Welcome back,{" "}
                                <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                                    {user.displayName?.split(" ")[0] || "Creator"}
                                </span>
                            </h1>
                            <p className="text-zinc-500 mt-3 text-lg">
                                {projects.length === 0
                                    ? "Your creative journey starts here"
                                    : `${projects.length} project${projects.length === 1 ? "" : "s"} • Last active ${formatDate(projects[0]?.updatedAt as { seconds: number } | undefined)}`}
                            </p>
                        </div>

                        {/* Quick stats */}
                        {projects.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="hidden lg:flex items-center gap-6"
                            >
                                <div className="text-right">
                                    <p className="text-3xl font-bold text-white">{projects.length}</p>
                                    <p className="text-zinc-500 text-sm">Projects</p>
                                </div>
                                <div className="w-px h-12 bg-zinc-800" />
                                <div className="text-right">
                                    <p className="text-3xl font-bold text-emerald-400">
                                        {projects.filter(p => p.sandboxUrl).length}
                                    </p>
                                    <p className="text-zinc-500 text-sm">Live</p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {loadingProjects ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-10 h-10 border-2 border-zinc-800 border-t-amber-400 rounded-full animate-spin" />
                        <p className="text-zinc-500 mt-4 text-sm">Loading your projects...</p>
                    </div>
                ) : projects.length === 0 ? (
                    /* Premium Empty State */
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="relative"
                    >
                        <div className="relative bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-3xl p-12 lg:p-16 text-center overflow-hidden">
                            {/* Decorative elements */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />

                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 mb-8"
                            >
                                <Sparkles className="w-12 h-12 text-amber-400" />
                            </motion.div>

                            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 relative">
                                Ready to create something amazing?
                            </h2>
                            <p className="text-zinc-400 mb-10 max-w-lg mx-auto text-lg relative">
                                Describe your vision and watch it come to life. Our AI transforms your ideas into stunning, production-ready websites.
                            </p>

                            <motion.button
                                onClick={() => setShowNewProjectModal(true)}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Layers className="w-5 h-5 text-black relative z-10" />
                                <span className="text-black relative z-10">Start Your First Project</span>
                                <ArrowUpRight className="w-5 h-5 text-black relative z-10 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </motion.button>
                        </div>
                    </motion.div>
                ) : (
                    /* Premium Project Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project, index) => (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.08, duration: 0.5 }}
                                onMouseEnter={() => setHoveredProject(project.id || null)}
                                onMouseLeave={() => setHoveredProject(null)}
                                onClick={() => router.push(`/builder/${project.id}`)}
                                className="group relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/80"
                                style={{
                                    transform: hoveredProject === project.id ? 'translateY(-4px)' : 'translateY(0)',
                                    boxShadow: hoveredProject === project.id
                                        ? '0 20px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(251,191,36,0.1)'
                                        : 'none'
                                }}
                            >
                                {/* Preview Area */}
                                <div className="aspect-[4/3] bg-zinc-800/50 relative overflow-hidden">
                                    {project.sandboxUrl ? (
                                        <>
                                            <iframe
                                                src={project.sandboxUrl}
                                                className="w-full h-full pointer-events-none scale-[1.02]"
                                                title="Preview"
                                            />
                                            {/* Live badge */}
                                            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Live</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div
                                                className="w-full h-full flex items-center justify-center"
                                                style={{
                                                    background: `linear-gradient(135deg, ${project.colorPalette.primary}10, ${project.colorPalette.secondary}10)`
                                                }}
                                            >
                                                <motion.div
                                                    animate={{
                                                        scale: hoveredProject === project.id ? 1.1 : 1,
                                                        rotate: hoveredProject === project.id ? 5 : 0
                                                    }}
                                                    transition={{ duration: 0.3 }}
                                                    className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${project.colorPalette.primary}, ${project.colorPalette.secondary})`
                                                    }}
                                                >
                                                    <span className="text-2xl">🚀</span>
                                                </motion.div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-6">
                                        <motion.span
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: hoveredProject === project.id ? 0 : 10, opacity: hoveredProject === project.id ? 1 : 0 }}
                                            className="flex items-center gap-2 text-white font-medium bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20"
                                        >
                                            Open Project <ExternalLink className="w-4 h-4" />
                                        </motion.span>
                                    </div>
                                </div>

                                {/* Project Info */}
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white truncate text-lg group-hover:text-amber-400 transition-colors">
                                                {project.name}
                                            </h3>
                                            <p className="text-zinc-500 text-sm truncate mt-1 leading-relaxed">
                                                {project.idea}
                                            </p>
                                        </div>
                                        <div
                                            className="w-3 h-3 rounded-full shrink-0 mt-2"
                                            style={{ backgroundColor: project.colorPalette.primary }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
                                        <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                        <span className="text-zinc-500 text-xs">
                                            {formatDate(project.updatedAt as { seconds: number } | undefined)}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* New Project Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: projects.length * 0.08 + 0.1 }}
                            onClick={() => setShowNewProjectModal(true)}
                            className="group relative bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-amber-500/50 hover:bg-zinc-900/50 flex items-center justify-center min-h-[300px]"
                        >
                            <div className="text-center p-8">
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    transition={{ duration: 0.3 }}
                                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 mb-4 group-hover:border-amber-500/50 group-hover:bg-zinc-800/80 transition-all"
                                >
                                    <Plus className="w-7 h-7 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                                </motion.div>
                                <p className="text-zinc-400 font-medium group-hover:text-white transition-colors">Create New</p>
                                <p className="text-zinc-600 text-sm mt-1">Start a new project</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </main>

            {/* Premium New Project Modal */}
            <AnimatePresence>
                {showNewProjectModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
                        onClick={() => setShowNewProjectModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl overflow-hidden"
                        >
                            {/* Modal header gradient */}
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />

                            <div className="relative p-8">
                                {/* Close button */}
                                <button
                                    onClick={() => setShowNewProjectModal(false)}
                                    className="absolute top-6 right-6 text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="mb-8">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-4">
                                        <Sparkles className="w-3 h-3" />
                                        AI-Powered
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">Create New Project</h2>
                                    <p className="text-zinc-400 mt-2">
                                        Describe your vision and our AI will bring it to life
                                    </p>
                                </div>

                                <div className="relative">
                                    <textarea
                                        value={newProjectIdea}
                                        onChange={(e) => setNewProjectIdea(e.target.value)}
                                        placeholder="e.g., A modern portfolio website with dark theme, animated sections, and a blog..."
                                        className="w-full h-36 bg-zinc-800/50 border border-zinc-700 rounded-2xl p-5 text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all text-base"
                                        autoFocus
                                    />
                                    <div className="absolute bottom-4 right-4 text-zinc-600 text-xs">
                                        {newProjectIdea.length} / 500
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setShowNewProjectModal(false)}
                                        className="flex-1 py-3.5 px-5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <motion.button
                                        onClick={handleCreateProject}
                                        disabled={!newProjectIdea.trim() || creating}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        className="flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                    >
                                        {creating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                Create Project
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
