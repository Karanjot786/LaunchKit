"use client";

import { WebContainer } from "@webcontainer/api";

// Singleton - only one WebContainer instance per page
let webcontainerInstance: WebContainer | null = null;
let isBooting = false;
let bootPromise: Promise<WebContainer> | null = null;

/**
 * Check if the page has cross-origin isolation (required for WebContainers)
 */
export function checkCrossOriginIsolation(): { isolated: boolean; message: string } {
    if (typeof window === "undefined") {
        return { isolated: false, message: "Not in browser environment" };
    }

    const isolated = window.crossOriginIsolated;

    if (!isolated) {
        return {
            isolated: false,
            message: "Cross-origin isolation not enabled. WebContainers require COOP/COEP headers."
        };
    }

    return { isolated: true, message: "Cross-origin isolation enabled" };
}

// Default Vite React project files with Tailwind v3 (npm, not CDN)
const DEFAULT_FILES = {
    "package.json": {
        file: {
            contents: JSON.stringify({
                name: "launchpad-app",
                version: "1.0.0",
                type: "module",
                scripts: {
                    dev: "vite --host",
                },
                dependencies: {
                    react: "^18.2.0",
                    "react-dom": "^18.2.0",
                    "lucide-react": "^0.400.0",
                    "framer-motion": "^11.0.0",
                    "clsx": "^2.0.0",
                    "tailwind-merge": "^2.0.0",
                },
                devDependencies: {
                    "@vitejs/plugin-react": "^4.2.0",
                    vite: "^5.0.0",
                    tailwindcss: "^3.4.0",
                    postcss: "^8.4.0",
                    autoprefixer: "^10.4.0",
                },
            }, null, 2),
        },
    },
    "vite.config.js": {
        file: {
            contents: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
})`,
        },
    },
    "tailwind.config.js": {
        file: {
            contents: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}`,
        },
    },
    "postcss.config.js": {
        file: {
            contents: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
        },
    },
    "index.html": {
        file: {
            contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LaunchPad App</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>`,
        },
    },
    src: {
        directory: {
            "index.css": {
                file: {
                    contents: `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`,
                },
            },
            "main.jsx": {
                file: {
                    contents: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
                },
            },
            "App.jsx": {
                file: {
                    contents: `export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
      <div className="text-center text-white">
        <h1 className="text-5xl font-bold mb-4">🚀 Building your app...</h1>
        <p className="text-xl opacity-80">Start chatting to create your landing page</p>
      </div>
    </main>
  )
}`,
                },
            },
        },
    },
};

/**
 * Boot WebContainer (singleton pattern)
 */
export async function bootWebContainer(): Promise<WebContainer> {
    if (webcontainerInstance) {
        return webcontainerInstance;
    }

    if (isBooting && bootPromise) {
        return bootPromise;
    }

    isBooting = true;
    console.log("Booting WebContainer...");

    bootPromise = WebContainer.boot();
    webcontainerInstance = await bootPromise;

    console.log("WebContainer booted successfully");
    isBooting = false;

    return webcontainerInstance;
}

/**
 * Mount default project files
 */
export async function mountDefaultProject(): Promise<void> {
    const container = await bootWebContainer();
    console.log("Mounting default project files...");
    await container.mount(DEFAULT_FILES);
    console.log("Files mounted");
}

/**
 * Install npm dependencies
 */
export async function installDependencies(
    onOutput?: (data: string) => void
): Promise<boolean> {
    const container = await bootWebContainer();
    console.log("Installing dependencies...");

    const installProcess = await container.spawn("npm", ["install"]);

    installProcess.output.pipeTo(
        new WritableStream({
            write(data) {
                console.log("[npm install]", data);
                onOutput?.(data);
            },
        })
    );

    const exitCode = await installProcess.exit;
    console.log("npm install exit code:", exitCode);

    return exitCode === 0;
}

/**
 * Start Vite dev server
 */
export async function startDevServer(
    onReady: (url: string) => void,
    onOutput?: (data: string) => void
): Promise<void> {
    const container = await bootWebContainer();
    console.log("Starting dev server...");

    // Listen for server-ready event
    container.on("server-ready", (port, url) => {
        console.log(`Server ready on port ${port}: ${url}`);
        onReady(url);
    });

    const devProcess = await container.spawn("npm", ["run", "dev"]);

    devProcess.output.pipeTo(
        new WritableStream({
            write(data) {
                console.log("[dev server]", data);
                onOutput?.(data);
            },
        })
    );
}

/**
 * Write a file to the WebContainer
 */
export async function writeFile(path: string, contents: string): Promise<void> {
    const container = await bootWebContainer();

    // Ensure directory exists
    const dir = path.substring(0, path.lastIndexOf("/"));
    if (dir) {
        try {
            await container.fs.mkdir(dir, { recursive: true });
        } catch {
            // Directory might already exist
        }
    }

    await container.fs.writeFile(path, contents);
    console.log(`Wrote file: ${path}`);
}

/**
 * Update App.jsx with new code (triggers hot reload)
 */
export async function updateAppCode(code: string): Promise<void> {
    // Convert the code path as needed
    let cleanCode = code;

    // Remove "use client" directives (not needed in Vite)
    cleanCode = cleanCode.replace(/["']use client["'];?\n?/g, "");

    // Change .tsx imports to .jsx
    cleanCode = cleanCode.replace(/from\s+["'](.+)\.tsx["']/g, 'from "$1.jsx"');

    await writeFile("/src/App.jsx", cleanCode);
}

/**
 * Write multiple files to WebContainer (for multi-file code generation)
 */
export async function writeFiles(files: Record<string, string>): Promise<void> {
    for (const [path, content] of Object.entries(files)) {
        let fullPath: string;

        // Map Next.js style paths to Vite structure
        if (path.includes("page.tsx") || path.includes("page.jsx") || path === "src/App.jsx") {
            fullPath = "/src/App.jsx";
        } else if (path.startsWith("components/") || path.startsWith("src/")) {
            fullPath = `/${path.replace("src/", "src/")}`;
        } else if (path.startsWith("app/")) {
            fullPath = `/src/${path.replace("app/", "")}`;
        } else {
            fullPath = `/src/${path}`;
        }

        // Clean up the code
        let cleanCode = content;
        cleanCode = cleanCode.replace(/["']use client["'];?\n?/g, "");
        cleanCode = cleanCode.replace(/from\s+["'](.+)\.tsx["']/g, 'from "$1.jsx"');

        await writeFile(fullPath, cleanCode);
    }
}

/**
 * Full initialization: boot, mount, install, start server
 */
export async function initializeWebContainer(
    onReady: (url: string) => void,
    onStatus?: (status: string) => void
): Promise<void> {
    try {
        onStatus?.("Booting WebContainer...");
        await bootWebContainer();

        onStatus?.("Mounting project files...");
        await mountDefaultProject();

        onStatus?.("Installing dependencies (~30s)...");
        await installDependencies((data) => {
            // Could update status with npm install progress
        });

        onStatus?.("Starting dev server...");
        await startDevServer(onReady);
    } catch (error) {
        console.error("WebContainer initialization error:", error);
        throw error;
    }
}
