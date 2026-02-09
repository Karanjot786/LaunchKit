"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(
    () => import("@monaco-editor/react").then(mod => mod.default),
    { ssr: false, loading: () => <div className="flex items-center justify-center h-full bg-zinc-950 text-zinc-500">Loading editor...</div> }
);

interface V0CodeViewProps {
    files: Record<string, string>;
    onFileSelect?: (path: string) => void;
    onFileChange?: (path: string, content: string) => void;
}

interface FileNode {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: FileNode[];
}

/**
 * Normalize path - ensure consistent format
 */
function normalizePath(path: string): string {
    return path.startsWith("/") ? path.slice(1) : path;
}

/**
 * Build file tree from flat file paths
 */
function buildFileTree(files: Record<string, string>): FileNode[] {
    const root: FileNode[] = [];

    const sortedPaths = Object.keys(files).sort((a, b) => {
        const aDir = a.includes("/") ? a.split("/").slice(0, -1).join("/") : "";
        const bDir = b.includes("/") ? b.split("/").slice(0, -1).join("/") : "";
        if (aDir !== bDir) return aDir.localeCompare(bDir);
        return a.localeCompare(b);
    });

    for (const rawPath of sortedPaths) {
        const path = normalizePath(rawPath);
        const parts = path.split("/").filter(Boolean);
        let current = root;
        let currentPath = "";

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            const isLast = i === parts.length - 1;

            let node = current.find((n) => n.name === part);

            if (!node) {
                node = {
                    name: part,
                    path: currentPath,
                    isDirectory: !isLast,
                    children: isLast ? undefined : [],
                };
                current.push(node);
                // Sort: directories first, then alphabetically
                current.sort((a, b) => {
                    if (a.isDirectory && !b.isDirectory) return -1;
                    if (!a.isDirectory && b.isDirectory) return 1;
                    return a.name.localeCompare(b.name);
                });
            }

            if (!isLast && node.children) {
                current = node.children;
            }
        }
    }

    return root;
}

/**
 * Get language for Monaco based on file extension
 */
function getLanguage(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
        ts: "typescript",
        tsx: "typescript",
        js: "javascript",
        jsx: "javascript",
        css: "css",
        json: "json",
        html: "html",
        md: "markdown",
        py: "python",
    };
    return languageMap[ext || ""] || "plaintext";
}

/**
 * File Tree Component
 */
function FileTree({
    nodes,
    selectedPath,
    onSelect,
    depth = 0,
}: {
    nodes: FileNode[];
    selectedPath: string;
    onSelect: (path: string) => void;
    depth?: number;
}) {
    const [expanded, setExpanded] = useState<Set<string>>(
        new Set(["src", "components", "app", "lib", "ui", "src/components", "src/components/ui"])
    );

    const toggleDir = (path: string) => {
        const next = new Set(expanded);
        if (next.has(path)) {
            next.delete(path);
        } else {
            next.add(path);
        }
        setExpanded(next);
    };

    // Auto-expand parent directories of selected file
    useEffect(() => {
        if (selectedPath) {
            const parts = selectedPath.split("/");
            const newExpanded = new Set(expanded);
            let path = "";
            for (let i = 0; i < parts.length - 1; i++) {
                path = path ? `${path}/${parts[i]}` : parts[i];
                newExpanded.add(path);
            }
            if (newExpanded.size !== expanded.size) {
                setExpanded(newExpanded);
            }
        }
    }, [selectedPath]);

    return (
        <div className="text-[13px]">
            {nodes.map((node) => (
                <div key={node.path}>
                    <div
                        className={`flex items-center gap-1 px-2 py-[3px] cursor-pointer transition-colors ${normalizePath(selectedPath) === normalizePath(node.path)
                            ? "bg-blue-600/30 text-white"
                            : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                            }`}
                        style={{ paddingLeft: `${8 + depth * 12}px` }}
                        onClick={() => {
                            if (node.isDirectory) {
                                toggleDir(node.path);
                            } else {
                                onSelect(node.path);
                            }
                        }}
                    >
                        {node.isDirectory ? (
                            <>
                                <svg
                                    className={`w-3 h-3 flex-shrink-0 transition-transform ${expanded.has(node.path) ? "rotate-90" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <FolderIcon open={expanded.has(node.path)} />
                            </>
                        ) : (
                            <span className="ml-3 flex-shrink-0">
                                <FileIcon filename={node.name} />
                            </span>
                        )}
                        <span className="truncate">{node.name}</span>
                    </div>
                    {node.isDirectory && expanded.has(node.path) && node.children && (
                        <FileTree
                            nodes={node.children}
                            selectedPath={selectedPath}
                            onSelect={onSelect}
                            depth={depth + 1}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

function FolderIcon({ open }: { open?: boolean }) {
    return (
        <svg className="w-4 h-4 flex-shrink-0 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            {open ? (
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
            ) : (
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            )}
        </svg>
    );
}

function FileIcon({ filename }: { filename: string }) {
    const ext = filename.split(".").pop()?.toLowerCase();

    const colors: Record<string, { bg: string; text: string }> = {
        tsx: { bg: "bg-blue-500/20", text: "text-blue-400" },
        ts: { bg: "bg-blue-500/20", text: "text-blue-400" },
        jsx: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
        js: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
        css: { bg: "bg-pink-500/20", text: "text-pink-400" },
        json: { bg: "bg-yellow-500/20", text: "text-yellow-300" },
        html: { bg: "bg-orange-500/20", text: "text-orange-400" },
        md: { bg: "bg-gray-500/20", text: "text-gray-400" },
    };

    const { bg, text } = colors[ext || ""] || { bg: "bg-zinc-500/20", text: "text-zinc-400" };

    return (
        <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${bg}`}>
            <span className={`text-[9px] font-bold uppercase ${text}`}>
                {ext?.slice(0, 2) || "?"}
            </span>
        </div>
    );
}

/**
 * Open Tabs Component
 */
function OpenTabs({
    tabs,
    activeTab,
    onSelect,
    onClose,
}: {
    tabs: string[];
    activeTab: string;
    onSelect: (path: string) => void;
    onClose: (path: string) => void;
}) {
    return (
        <div className="flex items-center bg-zinc-900 border-b border-zinc-800 overflow-x-auto">
            {tabs.map((tab) => {
                const isActive = normalizePath(tab) === normalizePath(activeTab);
                const filename = tab.split("/").pop() || tab;
                return (
                    <div
                        key={tab}
                        className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-r border-zinc-800 group whitespace-nowrap ${isActive
                            ? "bg-zinc-950 text-white border-t-2 border-t-blue-500"
                            : "text-zinc-400 hover:bg-zinc-800/50"
                            }`}
                        onClick={() => onSelect(tab)}
                    >
                        <FileIcon filename={filename} />
                        <span>{filename}</span>
                        <button
                            className={`ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-zinc-700 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose(tab);
                            }}
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * V0-style Full Code Editor Component with Monaco
 */
export function V0CodeView({ files, onFileSelect, onFileChange }: V0CodeViewProps) {
    const [selectedFile, setSelectedFile] = useState<string>("");
    const [openTabs, setOpenTabs] = useState<string[]>([]);
    const [modified, setModified] = useState<Set<string>>(new Set());
    const editorRef = useRef<unknown>(null);

    const fileTree = useMemo(() => buildFileTree(files), [files]);

    // Normalize file paths for lookup
    const normalizedFiles = useMemo(() => {
        const result: Record<string, string> = {};
        for (const [path, content] of Object.entries(files)) {
            result[normalizePath(path)] = content;
        }
        return result;
    }, [files]);

    const filePaths = Object.keys(normalizedFiles);

    // Auto-select App.tsx on mount
    useEffect(() => {
        const normalizedSelected = normalizePath(selectedFile);
        if (!normalizedSelected || !normalizedFiles[normalizedSelected]) {
            if (filePaths.length > 0) {
                const preferred = filePaths.find(p =>
                    p.endsWith("App.tsx") || p.endsWith("App.jsx") || p === "src/App.tsx"
                ) || filePaths.find(p => p.endsWith(".tsx") || p.endsWith(".jsx")) || filePaths[0];
                if (preferred) {
                    setSelectedFile(preferred);
                    setOpenTabs([preferred]);
                }
            }
        }
    }, [filePaths.length]);

    const activeFile = normalizePath(selectedFile) || filePaths[0] || "";
    const activeContent = normalizedFiles[activeFile] || "";

    const handleSelect = useCallback((path: string) => {
        const normalized = normalizePath(path);
        setSelectedFile(normalized);
        if (!openTabs.includes(normalized)) {
            setOpenTabs(prev => [...prev, normalized]);
        }
        onFileSelect?.(normalized);
    }, [openTabs, onFileSelect]);

    const handleCloseTab = useCallback((path: string) => {
        const normalized = normalizePath(path);
        setOpenTabs(prev => {
            const next = prev.filter(t => t !== normalized);
            if (normalized === activeFile && next.length > 0) {
                setSelectedFile(next[next.length - 1]);
            }
            return next;
        });
    }, [activeFile]);

    const handleEditorChange = useCallback((value: string | undefined) => {
        if (value !== undefined && onFileChange) {
            onFileChange(activeFile, value);
            setModified(prev => new Set(prev).add(activeFile));
        }
    }, [activeFile, onFileChange]);

    const handleEditorMount = useCallback((editor: unknown) => {
        editorRef.current = editor;
    }, []);

    if (filePaths.length === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-zinc-950 text-zinc-500">
                <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">No files yet</p>
                    <p className="text-sm text-zinc-600 mt-1">Start chatting to generate code</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-zinc-950">
            {/* Sidebar - File Explorer */}
            <div className="w-56 border-r border-zinc-800 flex flex-col bg-zinc-900/30">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span>Explorer</span>
                    <span className="ml-auto text-zinc-600">{filePaths.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                    <FileTree
                        nodes={fileTree}
                        selectedPath={activeFile}
                        onSelect={handleSelect}
                    />
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tab Bar */}
                {openTabs.length > 0 && (
                    <OpenTabs
                        tabs={openTabs}
                        activeTab={activeFile}
                        onSelect={handleSelect}
                        onClose={handleCloseTab}
                    />
                )}

                {/* Breadcrumb */}
                <div className="flex items-center px-3 py-1 bg-zinc-900/50 border-b border-zinc-800 text-xs text-zinc-500">
                    {activeFile.split("/").map((part, i, arr) => (
                        <React.Fragment key={i}>
                            <span className={i === arr.length - 1 ? "text-zinc-300" : ""}>{part}</span>
                            {i < arr.length - 1 && <span className="mx-1 text-zinc-600">/</span>}
                        </React.Fragment>
                    ))}
                    {modified.has(activeFile) && (
                        <span className="ml-2 text-amber-500">• Modified</span>
                    )}
                </div>

                {/* Monaco Editor */}
                <div className="flex-1">
                    {activeContent !== undefined ? (
                        <MonacoEditor
                            height="100%"
                            language={getLanguage(activeFile)}
                            value={activeContent}
                            theme="vs-dark"
                            onChange={handleEditorChange}
                            onMount={handleEditorMount}
                            beforeMount={(monaco) => {
                                // Disable TypeScript diagnostics (red squiggly lines)
                                monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                                    noSemanticValidation: true,
                                    noSyntaxValidation: false, // Keep syntax errors
                                });
                                monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                                    noSemanticValidation: true,
                                    noSyntaxValidation: false,
                                });
                                // Set compiler options
                                monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                                    jsx: monaco.languages.typescript.JsxEmit.React,
                                    jsxFactory: "React.createElement",
                                    reactNamespace: "React",
                                    allowNonTsExtensions: true,
                                    allowJs: true,
                                    target: monaco.languages.typescript.ScriptTarget.ESNext,
                                    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                                    module: monaco.languages.typescript.ModuleKind.ESNext,
                                    noEmit: true,
                                    esModuleInterop: true,
                                    allowSyntheticDefaultImports: true,
                                    skipLibCheck: true,
                                    strict: false,
                                });
                            }}
                            options={{
                                fontSize: 13,
                                fontFamily: "'Fira Code', 'JetBrains Mono', Menlo, Monaco, monospace",
                                fontLigatures: true,
                                minimap: { enabled: true, scale: 0.8 },
                                scrollBeyondLastLine: false,
                                lineNumbers: "on",
                                glyphMargin: false,
                                folding: true,
                                renderLineHighlight: "all",
                                bracketPairColorization: { enabled: true },
                                formatOnPaste: true,
                                formatOnType: true,
                                autoClosingBrackets: "always",
                                autoClosingQuotes: "always",
                                autoIndent: "full",
                                wordWrap: "off",
                                tabSize: 2,
                                insertSpaces: true,
                                cursorBlinking: "smooth",
                                cursorSmoothCaretAnimation: "on",
                                smoothScrolling: true,
                                padding: { top: 8 },
                            }}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-zinc-500">
                            Select a file to edit
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default V0CodeView;
