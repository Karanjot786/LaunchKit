/**
 * Version History Manager
 * 
 * Provides undo/redo functionality for file changes with snapshots.
 */

export interface VersionSnapshot {
    id: string;
    timestamp: number;
    files: Record<string, string>;
    description: string;
    type: "auto" | "manual" | "generation";
}

export interface VersionHistoryState {
    snapshots: VersionSnapshot[];
    currentIndex: number;
    maxSnapshots: number;
}

/**
 * Create a new version history manager
 */
export function createVersionHistory(maxSnapshots = 50): VersionHistoryState {
    return {
        snapshots: [],
        currentIndex: -1,
        maxSnapshots,
    };
}

/**
 * Add a new snapshot to history
 */
export function addSnapshot(
    history: VersionHistoryState,
    files: Record<string, string>,
    description: string,
    type: "auto" | "manual" | "generation" = "auto"
): VersionHistoryState {
    const snapshot: VersionSnapshot = {
        id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        files: { ...files }, // Deep copy
        description,
        type,
    };

    // Remove any snapshots after current index (discard redo stack)
    const snapshots = history.snapshots.slice(0, history.currentIndex + 1);

    // Add new snapshot
    snapshots.push(snapshot);

    // Trim to max size
    while (snapshots.length > history.maxSnapshots) {
        snapshots.shift();
    }

    return {
        ...history,
        snapshots,
        currentIndex: snapshots.length - 1,
    };
}

/**
 * Check if undo is available
 */
export function canUndo(history: VersionHistoryState): boolean {
    return history.currentIndex > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(history: VersionHistoryState): boolean {
    return history.currentIndex < history.snapshots.length - 1;
}

/**
 * Go to previous snapshot (undo)
 */
export function undo(history: VersionHistoryState): {
    history: VersionHistoryState;
    files: Record<string, string> | null;
} {
    if (!canUndo(history)) {
        return { history, files: null };
    }

    const newIndex = history.currentIndex - 1;
    const snapshot = history.snapshots[newIndex];

    return {
        history: { ...history, currentIndex: newIndex },
        files: { ...snapshot.files },
    };
}

/**
 * Go to next snapshot (redo)
 */
export function redo(history: VersionHistoryState): {
    history: VersionHistoryState;
    files: Record<string, string> | null;
} {
    if (!canRedo(history)) {
        return { history, files: null };
    }

    const newIndex = history.currentIndex + 1;
    const snapshot = history.snapshots[newIndex];

    return {
        history: { ...history, currentIndex: newIndex },
        files: { ...snapshot.files },
    };
}

/**
 * Go to a specific snapshot by index
 */
export function goToSnapshot(
    history: VersionHistoryState,
    index: number
): {
    history: VersionHistoryState;
    files: Record<string, string> | null;
} {
    if (index < 0 || index >= history.snapshots.length) {
        return { history, files: null };
    }

    const snapshot = history.snapshots[index];

    return {
        history: { ...history, currentIndex: index },
        files: { ...snapshot.files },
    };
}

/**
 * Get current snapshot info
 */
export function getCurrentSnapshot(
    history: VersionHistoryState
): VersionSnapshot | null {
    if (history.currentIndex < 0 || history.currentIndex >= history.snapshots.length) {
        return null;
    }
    return history.snapshots[history.currentIndex];
}

/**
 * Get all snapshots with relative position info
 */
export function getSnapshotsWithInfo(history: VersionHistoryState): Array<
    VersionSnapshot & {
        isCurrent: boolean;
        canRestore: boolean;
        relativeTime: string;
    }
> {
    const now = Date.now();

    return history.snapshots.map((snapshot, index) => ({
        ...snapshot,
        isCurrent: index === history.currentIndex,
        canRestore: index !== history.currentIndex,
        relativeTime: getRelativeTime(now - snapshot.timestamp),
    }));
}

/**
 * Format relative time
 */
function getRelativeTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 120) return "1 min ago";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 7200) return "1 hour ago";
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * React hook for version history with Firebase persistence
 */
import { useState, useCallback, useRef, useEffect } from "react";
import {
    saveVersionSnapshot,
    getVersionSnapshots,
    clearVersionHistory as clearFirebaseHistory,
    VersionSnapshot as FirebaseVersionSnapshot,
} from "./firebase";

export function useVersionHistory(
    files: Record<string, string>,
    options: {
        projectId?: string; // Required for Firebase persistence
        maxSnapshots?: number;
        autoSnapshotInterval?: number; // ms
        debounceDelay?: number; // ms
    } = {}
) {
    const { projectId, maxSnapshots = 50, debounceDelay = 2000 } = options;

    const [history, setHistory] = useState<VersionHistoryState>(() =>
        createVersionHistory(maxSnapshots)
    );
    const [isLoading, setIsLoading] = useState(false);

    const filesRef = useRef(files);
    const lastSnapshotRef = useRef(0);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const initialLoadRef = useRef(false);

    // Track file changes
    useEffect(() => {
        filesRef.current = files;
    }, [files]);

    // Load history from Firebase on mount
    useEffect(() => {
        if (!projectId || initialLoadRef.current) return;
        initialLoadRef.current = true;

        const loadHistory = async () => {
            setIsLoading(true);
            try {
                const snapshots = await getVersionSnapshots(projectId, maxSnapshots);
                if (snapshots.length > 0) {
                    setHistory({
                        snapshots: snapshots.map(s => ({
                            id: s.id || `snap_${s.timestamp}`,
                            timestamp: s.timestamp,
                            files: s.files,
                            description: s.description,
                            type: s.type,
                        })),
                        currentIndex: snapshots.length - 1,
                        maxSnapshots,
                    });
                }
            } catch (error) {
                console.error("Failed to load version history:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadHistory();
    }, [projectId, maxSnapshots]);

    // Auto-snapshot on file changes (debounced) with Firebase sync
    // Track last snapshot content to avoid duplicates
    const lastSnapshotHashRef = useRef<string>("");

    useEffect(() => {
        if (Object.keys(files).length === 0) return;

        // Create a simple hash of file contents to detect actual changes
        const contentHash = Object.entries(files)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([path, content]) => `${path}:${content.length}`)
            .join("|");

        // Skip if content hasn't actually changed
        if (contentHash === lastSnapshotHashRef.current) return;

        // Clear existing debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            const timeSinceLast = Date.now() - lastSnapshotRef.current;

            // Only snapshot if enough time has passed
            if (timeSinceLast >= debounceDelay) {
                // Update hash to prevent duplicates
                lastSnapshotHashRef.current = contentHash;

                // Use callback form to avoid depending on history state
                setHistory((prev) => addSnapshot(prev, files, "Auto-save", "auto"));
                lastSnapshotRef.current = Date.now();

                // Sync to Firebase
                if (projectId) {
                    try {
                        await saveVersionSnapshot(projectId, {
                            timestamp: Date.now(),
                            files,
                            description: "Auto-save",
                            type: "auto",
                        });
                    } catch (error) {
                        console.error("Failed to save snapshot to Firebase:", error);
                    }
                }
            }
        }, debounceDelay);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [files, debounceDelay, projectId]); // Removed 'history' from deps to prevent infinite loop

    // Manual snapshot with Firebase sync
    const createSnapshot = useCallback(
        async (description: string, type: "manual" | "generation" = "manual") => {
            setHistory((prev) => addSnapshot(prev, filesRef.current, description, type));
            lastSnapshotRef.current = Date.now();

            // Sync to Firebase
            if (projectId) {
                try {
                    await saveVersionSnapshot(projectId, {
                        timestamp: Date.now(),
                        files: filesRef.current,
                        description,
                        type,
                    });
                } catch (error) {
                    console.error("Failed to save snapshot to Firebase:", error);
                }
            }
        },
        [projectId]
    );

    // Clear all history (for new generation)
    const clearHistory = useCallback(async () => {
        setHistory(createVersionHistory(maxSnapshots));

        // Clear Firebase history
        if (projectId) {
            try {
                await clearFirebaseHistory(projectId);
            } catch (error) {
                console.error("Failed to clear Firebase history:", error);
            }
        }
    }, [projectId, maxSnapshots]);

    // Undo
    const undoChanges = useCallback((): Record<string, string> | null => {
        let restoredFiles: Record<string, string> | null = null;

        setHistory((prev) => {
            const result = undo(prev);
            restoredFiles = result.files;
            return result.history;
        });

        return restoredFiles;
    }, []);

    // Redo
    const redoChanges = useCallback((): Record<string, string> | null => {
        let restoredFiles: Record<string, string> | null = null;

        setHistory((prev) => {
            const result = redo(prev);
            restoredFiles = result.files;
            return result.history;
        });

        return restoredFiles;
    }, []);

    // Go to specific snapshot
    const restoreSnapshot = useCallback((index: number): Record<string, string> | null => {
        let restoredFiles: Record<string, string> | null = null;

        setHistory((prev) => {
            const result = goToSnapshot(prev, index);
            restoredFiles = result.files;
            return result.history;
        });

        return restoredFiles;
    }, []);

    return {
        history,
        snapshots: getSnapshotsWithInfo(history),
        currentSnapshot: getCurrentSnapshot(history),
        canUndo: canUndo(history),
        canRedo: canRedo(history),
        isLoading,
        createSnapshot,
        clearHistory,
        undoChanges,
        redoChanges,
        restoreSnapshot,
    };
}

