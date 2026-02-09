"use client";

/**
 * E2B Cloud Sandbox Client
 * Frontend client for managing E2B sandboxes via the API
 */

interface E2BResponse<T = unknown> {
    success: boolean;
    error?: string;
    data?: T;
}

interface SandboxState {
    sessionId: string;
    isReady: boolean;
    previewUrl: string | null;
    status: string;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Call E2B API
 */
async function callE2BAPI<T>(
    action: string,
    sessionId: string,
    params: Record<string, unknown> = {}
): Promise<E2BResponse<T>> {
    try {
        console.log(`[E2B API Call] Action: ${action}, Session: ${sessionId}`);

        const response = await fetch("/api/e2b", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, sessionId, ...params }),
        });

        const data = await response.json();
        console.log(`[E2B API Response] Action: ${action}, Status: ${response.status}, Success: ${data.success}`);

        if (!response.ok) {
            console.error(`[E2B API Error] Action: ${action}, Error: ${data.error}`);
            return { success: false, error: data.error || "API call failed" };
        }

        return { success: true, data };
    } catch (error) {
        console.error(`[E2B API Network Error] Action: ${action}, Error:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Network error"
        };
    }
}

/**
 * E2B Sandbox Manager Class
 */
export class E2BSandbox {
    private _sessionId: string;
    private _isReady: boolean = false;
    private _previewUrl: string | null = null;
    private _status: string = "Not initialized";
    private _onStatusChange?: (status: string) => void;
    private _onUrlChange?: (url: string | null) => void;
    private _onOutput?: (data: string) => void;

    constructor(options?: {
        onStatusChange?: (status: string) => void;
        onUrlChange?: (url: string | null) => void;
        onOutput?: (data: string) => void;
    }) {
        this._sessionId = generateSessionId();
        this._onStatusChange = options?.onStatusChange;
        this._onUrlChange = options?.onUrlChange;
        this._onOutput = options?.onOutput;
        console.log(`[E2B Client] Created with session ID: ${this._sessionId}`);
    }

    get sessionId(): string {
        return this._sessionId;
    }

    get isReady(): boolean {
        return this._isReady;
    }

    get previewUrl(): string | null {
        return this._previewUrl;
    }

    get status(): string {
        return this._status;
    }

    private setStatus(status: string): void {
        this._status = status;
        this._onStatusChange?.(status);
    }

    private setUrl(url: string | null): void {
        this._previewUrl = url;
        this._onUrlChange?.(url);
    }

    private log(message: string): void {
        console.log(`[E2B Client] ${message}`);
        this._onOutput?.(message);
    }

    /**
     * Initialize the sandbox
     */
    async initialize(): Promise<boolean> {
        this.setStatus("Creating sandbox...");
        this.log("Creating cloud sandbox...");

        const result = await callE2BAPI("create", this._sessionId);

        if (!result.success) {
            this.setStatus(`Error: ${result.error}`);
            this.log(`Error: ${result.error}`);
            return false;
        }

        this._isReady = true;
        this.setStatus("Sandbox ready");
        this.log("Sandbox created successfully");
        return true;
    }

    /**
     * Write files to the sandbox
     */
    async writeFiles(files: Record<string, string>): Promise<boolean> {
        if (!this._isReady) {
            this.log("Error: Sandbox not initialized");
            return false;
        }

        this.setStatus("Writing files...");
        this.log(`Writing ${Object.keys(files).length} files...`);

        const result = await callE2BAPI("writeFiles", this._sessionId, { files });

        if (!result.success) {
            this.setStatus(`Error: ${result.error}`);
            this.log(`Error writing files: ${result.error}`);
            return false;
        }

        this.setStatus("Files written");
        this.log("Files written successfully");
        return true;
    }

    /**
     * Run a shell command
     */
    async runCommand(command: string, args: string[] = []): Promise<{
        success: boolean;
        stdout?: string;
        stderr?: string;
    }> {
        if (!this._isReady) {
            return { success: false, stderr: "Sandbox not initialized" };
        }

        this.log(`Running: ${command} ${args.join(" ")}`);

        const result = await callE2BAPI<{
            success: boolean;
            stdout: string;
            stderr: string;
        }>("runCommand", this._sessionId, { command, args });

        if (!result.success) {
            return { success: false, stderr: result.error };
        }

        if (result.data?.stdout) {
            this.log(result.data.stdout);
        }
        if (result.data?.stderr) {
            this.log(`[stderr] ${result.data.stderr}`);
        }

        return {
            success: result.data?.success ?? false,
            stdout: result.data?.stdout,
            stderr: result.data?.stderr,
        };
    }

    /**
     * Start the dev server and get preview URL
     */
    async startDevServer(): Promise<string | null> {
        if (!this._isReady) {
            this.log("Error: Sandbox not initialized");
            return null;
        }

        this.setStatus("Installing dependencies...");
        this.log("Installing npm dependencies...");

        const result = await callE2BAPI<{
            success: boolean;
            url: string;
            installLogs: string;
            error?: string;
        }>("startDevServer", this._sessionId);

        if (!result.success || !result.data?.success) {
            const error = result.error || result.data?.error || "Unknown error";
            this.setStatus(`Error: ${error}`);
            this.log(`Error starting dev server: ${error}`);
            return null;
        }

        this.log("Dependencies installed");
        this.log(`Dev server started at: ${result.data.url}`);

        this.setUrl(result.data.url);
        this.setStatus("Ready");

        return result.data.url;
    }

    /**
     * Full initialization: create sandbox, write files, start dev server
     */
    async initializeWithFiles(files: Record<string, string>): Promise<string | null> {
        // Create sandbox
        if (!(await this.initialize())) {
            return null;
        }

        // Write files
        if (!(await this.writeFiles(files))) {
            return null;
        }

        // Start dev server
        return await this.startDevServer();
    }

    /**
     * Destroy the sandbox
     */
    async destroy(): Promise<void> {
        this.log("Destroying sandbox...");
        await callE2BAPI("destroy", this._sessionId);
        this._isReady = false;
        this.setUrl(null);
        this.setStatus("Destroyed");
    }
}

/**
 * Get template files from E2B API
 */
export async function getTemplateFiles(): Promise<Record<string, string>> {
    try {
        const response = await fetch("/api/e2b", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "getTemplateFiles", sessionId: "template" }),
        });

        const data = await response.json();

        if (data.success && data.files) {
            return data.files;
        }

        return {};
    } catch (error) {
        console.error("[E2B] Error fetching template files:", error);
        return {};
    }
}

/**
 * React hook for E2B sandbox
 */
export function useE2BSandbox() {
    // This would be implemented as a proper React hook
    // with useState and useEffect for managing sandbox lifecycle
    return {
        createSandbox: async () => new E2BSandbox(),
    };
}

export default E2BSandbox;
