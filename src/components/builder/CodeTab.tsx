"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface CodeTabProps {
    files: Record<string, string>;
    activeFile: string;
    onFileSelect: (file: string) => void;
    onFileChange?: (file: string, content: string) => void;
}

export function CodeTab({ files, activeFile, onFileSelect, onFileChange }: CodeTabProps) {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
        new Set(["src", "src/app", "src/components"])
    );

    const fileList = Object.keys(files);

    const toggleFolder = (folder: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folder)) {
            newExpanded.delete(folder);
        } else {
            newExpanded.add(folder);
        }
        setExpandedFolders(newExpanded);
    };

    const getLanguage = (filename: string): string => {
        if (filename.endsWith(".tsx") || filename.endsWith(".ts")) return "typescript";
        if (filename.endsWith(".jsx") || filename.endsWith(".js")) return "javascript";
        if (filename.endsWith(".css")) return "css";
        if (filename.endsWith(".json")) return "json";
        return "plaintext";
    };

    const getFileIcon = (filename: string): string => {
        if (filename.endsWith(".tsx") || filename.endsWith(".jsx")) return "⚛️";
        if (filename.endsWith(".ts") || filename.endsWith(".js")) return "📜";
        if (filename.endsWith(".css")) return "🎨";
        if (filename.endsWith(".json")) return "📋";
        return "📄";
    };

    // Group files by folder
    const groupedFiles: Record<string, string[]> = {};
    fileList.forEach((file) => {
        const parts = file.split("/");
        const folder = parts.slice(0, -1).join("/") || "/";
        if (!groupedFiles[folder]) groupedFiles[folder] = [];
        groupedFiles[folder].push(file);
    });

    return (
        <div className="flex-1 flex">
            {/* File Explorer */}
            <div className="w-64 bg-zinc-900 border-r border-zinc-800 overflow-y-auto">
                <div className="p-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    File Explorer
                </div>
                {Object.entries(groupedFiles)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([folder, folderFiles]) => (
                        <div key={folder}>
                            {folder !== "/" && (
                                <button
                                    onClick={() => toggleFolder(folder)}
                                    className="w-full text-left px-3 py-1 text-sm flex items-center gap-2 hover:bg-zinc-800 text-zinc-400"
                                >
                                    <span className="text-xs">{expandedFolders.has(folder) ? "▼" : "▶"}</span>
                                    <span>📁</span>
                                    <span>{folder.split("/").pop()}</span>
                                </button>
                            )}
                            {(folder === "/" || expandedFolders.has(folder)) &&
                                folderFiles.map((file) => (
                                    <button
                                        key={file}
                                        onClick={() => onFileSelect(file)}
                                        className={`w-full text-left px-3 py-1 text-sm flex items-center gap-2 hover:bg-zinc-800 ${activeFile === file ? "bg-zinc-800 text-white" : "text-zinc-400"
                                            }`}
                                        style={{ paddingLeft: folder !== "/" ? "28px" : "12px" }}
                                    >
                                        <span>{getFileIcon(file)}</span>
                                        <span>{file.split("/").pop()}</span>
                                    </button>
                                ))}
                        </div>
                    ))}
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col">
                {/* Tab bar */}
                <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-2">
                    <div className="flex items-center gap-1 px-3 py-1 bg-zinc-800 rounded text-sm text-white">
                        <span>{getFileIcon(activeFile)}</span>
                        <span>{activeFile.split("/").pop()}</span>
                        <button className="ml-2 hover:bg-zinc-700 rounded px-1">×</button>
                    </div>
                </div>

                {/* Monaco Editor */}
                <div className="flex-1">
                    <Editor
                        height="100%"
                        language={getLanguage(activeFile)}
                        value={files[activeFile] || "// Select a file"}
                        theme="vs-dark"
                        onChange={(value) => onFileChange?.(activeFile, value || "")}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            lineNumbers: "on",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 2,
                            wordWrap: "on",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
