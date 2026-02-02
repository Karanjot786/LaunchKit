import { Sandbox } from "@e2b/code-interpreter";

// Sandbox timeout (30 minutes)
const SANDBOX_TIMEOUT_MS = 30 * 60 * 1000;

// Sandbox resource configuration
const SANDBOX_CONFIG = {
    cpuCount: 4,        // 4 CPUs for faster builds
    memoryMB: 4096,     // 4GB RAM for Node.js
    diskSizeMB: 10240,  // 10GB disk for npm packages
};

export interface SandboxSession {
    sandboxId: string;
    previewUrl: string;
}

/**
 * Create a new E2B sandbox with Vite (faster, more reliable than Next.js dev)
 * Configured with 4 CPUs, 4GB RAM, 10GB disk
 */
export async function createSandbox(): Promise<SandboxSession> {
    console.log("Creating E2B sandbox with enhanced resources (4 CPU, 4GB RAM, 10GB disk)...");

    const sandbox = await Sandbox.create({
        apiKey: process.env.E2B_API_KEY,
        ...SANDBOX_CONFIG,
    });

    await sandbox.setTimeout(SANDBOX_TIMEOUT_MS);

    console.log("Setting up Vite React app in sandbox...");

    // Check Node.js is available
    const nodeCheck = await sandbox.commands.run("node --version");
    console.log("Node version:", nodeCheck.stdout);

    // Create project directory
    await sandbox.commands.run("mkdir -p /home/user/app/src");

    // Create package.json for Vite with common UI dependencies
    await sandbox.files.write("/home/user/app/package.json", JSON.stringify({
        name: "launchpad-app",
        version: "1.0.0",
        private: true,
        type: "module",
        scripts: {
            dev: "vite --host 0.0.0.0 --port 3000",
            build: "vite build",
            preview: "vite preview"
        },
        dependencies: {
            react: "^18.2.0",
            "react-dom": "^18.2.0",
            "lucide-react": "^0.400.0",
            "framer-motion": "^11.0.0"
        },
        devDependencies: {
            "@vitejs/plugin-react": "^4.2.0",
            vite: "^5.0.0"
        }
    }, null, 2));

    // Create vite.config.js with allowedHosts for E2B
    await sandbox.files.write("/home/user/app/vite.config.js", `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  }
})`);

    // Create index.html
    await sandbox.files.write("/home/user/app/index.html", `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LaunchPad App</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', system-ui, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`);

    // Create main.jsx
    await sandbox.files.write("/home/user/app/src/main.jsx", `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`);

    // Create default App.jsx
    await sandbox.files.write("/home/user/app/src/App.jsx", `export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
      <div className="text-center text-white">
        <h1 className="text-5xl font-bold mb-4">🚀 Building your app...</h1>
        <p className="text-xl opacity-80">This will update automatically</p>
      </div>
    </main>
  )
}`);

    // Install dependencies
    console.log("Installing Vite dependencies (~30s)...");
    const installResult = await sandbox.commands.run("cd /home/user/app && npm install", {
        timeoutMs: 120000
    });
    console.log("Install completed:", installResult.exitCode === 0 ? "success" : "failed");

    // Start Vite dev server in background
    console.log("Starting Vite dev server in background...");
    sandbox.commands.run("cd /home/user/app && npm run dev", { background: true });

    // Wait for Vite to start (much faster than Next.js)
    console.log("Waiting for Vite to start (10s)...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verify server is running
    const checkServer = await sandbox.commands.run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'failed'");
    console.log("Server status code:", checkServer.stdout);

    const host = sandbox.getHost(3000);

    return {
        sandboxId: sandbox.sandboxId,
        previewUrl: `https://${host}`,
    };
}

/**
 * Connect to existing sandbox
 */
export async function connectSandbox(sandboxId: string): Promise<Sandbox> {
    const sandbox = await Sandbox.connect(sandboxId, {
        apiKey: process.env.E2B_API_KEY,
    });
    await sandbox.setTimeout(SANDBOX_TIMEOUT_MS);
    return sandbox;
}

/**
 * Write files to sandbox (for Vite React app) and ensure server is running
 */
export async function writeFilesToSandbox(
    sandboxId: string,
    files: Record<string, string>
): Promise<void> {
    const sandbox = await connectSandbox(sandboxId);

    for (const [path, content] of Object.entries(files)) {
        let fullPath: string;

        // Map Next.js style paths to Vite structure
        if (path.includes("page.tsx") || path.includes("page.jsx")) {
            // Main page becomes App.jsx
            fullPath = "/home/user/app/src/App.jsx";
        } else if (path.startsWith("components/") || path.startsWith("src/")) {
            fullPath = `/home/user/app/src/${path.replace("src/", "")}`;
        } else if (path.startsWith("app/")) {
            // Convert app/ paths to src/
            fullPath = `/home/user/app/src/${path.replace("app/", "")}`;
        } else {
            fullPath = `/home/user/app/src/${path}`;
        }

        console.log(`Writing: ${fullPath}`);

        // Convert the code to be Vite-compatible
        let code = content;
        // Remove "use client" directives (not needed in Vite)
        code = code.replace(/["']use client["'];?\n?/g, "");
        // Change .tsx imports to .jsx
        code = code.replace(/from\s+["'](.+)\.tsx["']/g, 'from "$1.jsx"');

        await sandbox.files.write(fullPath, code);
    }

    // Check if server is running, restart if not
    console.log("Checking if Vite server is running...");
    const checkServer = await sandbox.commands.run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'failed'");

    if (!checkServer.stdout.includes("200")) {
        console.log("Server not running, restarting Vite...");

        // Kill any existing npm/node processes (ignore errors)
        try {
            await sandbox.commands.run("killall node 2>/dev/null; exit 0", { timeoutMs: 3000 });
        } catch {
            // Ignore kill errors - process may not exist
        }

        // Restart the server
        sandbox.commands.run("cd /home/user/app && npm run dev", { background: true });

        // Wait for server to start
        console.log("Waiting for Vite to restart (5s)...");
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Verify it's running
        const verify = await sandbox.commands.run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'failed'");
        console.log("Server status after restart:", verify.stdout);
    } else {
        console.log("Server already running (hot reload should handle file changes)");
    }
}

/**
 * Read file from sandbox
 */
export async function readFileFromSandbox(
    sandboxId: string,
    path: string
): Promise<string> {
    const sandbox = await connectSandbox(sandboxId);
    const fullPath = path.startsWith("/home/user") ? path : `/home/user/app/src/${path}`;
    return await sandbox.files.read(fullPath);
}

/**
 * Run command in sandbox terminal
 */
export async function runCommand(
    sandboxId: string,
    command: string
): Promise<{ stdout: string; stderr: string }> {
    const sandbox = await connectSandbox(sandboxId);
    const result = await sandbox.commands.run(command);
    return {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
    };
}

/**
 * Get preview URL for sandbox
 */
export async function getSandboxPreviewUrl(sandboxId: string): Promise<string> {
    const sandbox = await connectSandbox(sandboxId);
    const host = sandbox.getHost(3000);
    return `https://${host}`;
}

/**
 * Kill sandbox
 */
export async function killSandbox(sandboxId: string): Promise<void> {
    const sandbox = await connectSandbox(sandboxId);
    await sandbox.kill();
}
