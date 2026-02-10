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
                name: "LaunchKit-app",
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
                    "class-variance-authority": "^0.7.0",
                    "@radix-ui/react-slot": "^1.0.0",
                },
                devDependencies: {
                    "@vitejs/plugin-react": "^4.2.0",
                    "@types/react": "^18.2.0",
                    "@types/react-dom": "^18.2.0",
                    typescript: "^5.3.0",
                    vite: "^5.0.0",
                    tailwindcss: "^3.4.0",
                    postcss: "^8.4.0",
                    autoprefixer: "^10.4.0",
                    "tailwindcss-animate": "^1.0.0",
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
    "tailwind.config.ts": {
        file: {
            contents: `import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [animate],
}

export default config`,
        },
    },
    "components.json": {
        file: {
            contents: JSON.stringify({
                "$schema": "https://ui.shadcn.com/schema.json",
                style: "default",
                rsc: false,
                tsx: true,
                tailwind: {
                    config: "tailwind.config.ts",
                    css: "src/index.css",
                    baseColor: "slate",
                    cssVariables: true,
                },
                aliases: {
                    components: "@/components",
                    utils: "@/lib/utils",
                },
            }, null, 2),
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
    "tsconfig.json": {
        file: {
            contents: JSON.stringify({
                compilerOptions: {
                    target: "ES2020",
                    useDefineForClassFields: true,
                    lib: ["ES2020", "DOM", "DOM.Iterable"],
                    module: "ESNext",
                    skipLibCheck: true,
                    moduleResolution: "bundler",
                    allowImportingTsExtensions: true,
                    resolveJsonModule: true,
                    isolatedModules: true,
                    noEmit: true,
                    jsx: "react-jsx",
                    strict: true,
                    noUnusedLocals: true,
                    noUnusedParameters: true,
                    noFallthroughCasesInSwitch: true,
                    baseUrl: ".",
                    paths: { "@/*": ["./src/*"] }
                },
                include: ["src"]
            }, null, 2),
        },
    },
    "index.html": {
        file: {
            contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LaunchKit App</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
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

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}`,
                },
            },
            lib: {
                directory: {
                    "utils.ts": {
                        file: {
                            contents: `import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`,
                        },
                    },
                },
            },
            "main.tsx": {
                file: {
                    contents: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
                },
            },
            "App.tsx": {
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
 * Base shadcn/ui components to pre-install for common landing page patterns
 */
const BASE_SHADCN_COMPONENTS = ["button", "card", "input", "badge", "separator"];

/**
 * Install pre-defined base shadcn/ui components during initialization
 */
export async function installBaseShadcnComponents(
    onOutput?: (data: string) => void
): Promise<boolean> {
    return installShadcnComponents(BASE_SHADCN_COMPONENTS, onOutput);
}

/**
 * Install specific shadcn/ui components by name
 * @param components - Array of component names (e.g., ["button", "card", "input"])
 */
export async function installShadcnComponents(
    components: string[],
    onOutput?: (data: string) => void
): Promise<boolean> {
    if (components.length === 0) return true;

    const container = await bootWebContainer();
    console.log(`Installing shadcn/ui components: ${components.join(", ")}...`);

    // Use npx shadcn@latest add with --yes flag for non-interactive install
    const installProcess = await container.spawn("npx", [
        "shadcn@latest",
        "add",
        ...components,
        "--yes",
        "--overwrite",
    ]);

    installProcess.output.pipeTo(
        new WritableStream({
            write(data) {
                console.log("[shadcn]", data);
                onOutput?.(data);
            },
        })
    );

    const exitCode = await installProcess.exit;
    console.log(`shadcn install exit code: ${exitCode}`);

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

    // Remove .tsx/.jsx extensions from imports (TypeScript handles this)
    cleanCode = cleanCode.replace(/from\s+["'](.+)\.(tsx|jsx)["']/g, 'from "$1"');

    await writeFile("/src/App.tsx", cleanCode);
}

/**
 * Clear generated files from WebContainer (preserves default files like index.html, package.json)
 * Call this before writing new files from a fresh generation
 */
export async function clearGeneratedFiles(): Promise<void> {
    const container = await bootWebContainer();

    // Directories to clear (user-generated content)
    const dirsToClean = ["/src/components"];

    // Files to preserve (defaults)
    const preserveFiles = new Set([
        "/src/main.tsx",
        "/src/index.css",
        "/src/lib/utils.ts",
        "/src/vite-env.d.ts",
    ]);

    for (const dir of dirsToClean) {
        try {
            const entries = await container.fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = `${dir}/${entry.name}`;
                if (!preserveFiles.has(fullPath)) {
                    if (entry.isDirectory()) {
                        // Recursively remove directories (like ui/)
                        await removeDir(container, fullPath);
                    } else {
                        await container.fs.rm(fullPath);
                        console.log(`[Cleanup] Removed: ${fullPath}`);
                    }
                }
            }
        } catch {
            // Directory might not exist yet
        }
    }

    // Also remove App.tsx to force fresh generation
    try {
        await container.fs.rm("/src/App.tsx");
        console.log("[Cleanup] Removed: /src/App.tsx");
    } catch {
        // File might not exist
    }
}

/**
 * Recursively remove a directory
 */
async function removeDir(container: WebContainer, path: string): Promise<void> {
    try {
        const entries = await container.fs.readdir(path, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = `${path}/${entry.name}`;
            if (entry.isDirectory()) {
                await removeDir(container, fullPath);
            } else {
                await container.fs.rm(fullPath);
            }
        }
        await container.fs.rm(path);
        console.log(`[Cleanup] Removed directory: ${path}`);
    } catch {
        // Ignore errors
    }
}

/**
 * Write multiple files to WebContainer (for multi-file code generation)
 */
export async function writeFiles(files: Record<string, string>): Promise<void> {
    for (const [path, content] of Object.entries(files)) {
        let fullPath: string;

        // Map Next.js style paths to Vite TSX structure
        if (path.includes("page.tsx") || path.includes("page.jsx") || path === "src/App.tsx" || path === "src/App.jsx") {
            fullPath = "/src/App.tsx";
        } else if (path.startsWith("components/") || path.startsWith("src/")) {
            // Ensure .tsx extension for component files
            let normalizedPath = path.replace("src/", "src/");
            if (normalizedPath.endsWith(".jsx")) {
                normalizedPath = normalizedPath.replace(".jsx", ".tsx");
            } else if (!normalizedPath.endsWith(".tsx") && !normalizedPath.endsWith(".css") && !normalizedPath.endsWith(".ts")) {
                normalizedPath = normalizedPath + ".tsx";
            }
            fullPath = `/${normalizedPath}`;
        } else if (path.startsWith("app/")) {
            let normalizedPath = path.replace("app/", "");
            if (normalizedPath.endsWith(".jsx")) {
                normalizedPath = normalizedPath.replace(".jsx", ".tsx");
            }
            fullPath = `/src/${normalizedPath}`;
        } else {
            // Ensure .tsx extension for other files
            let normalizedPath = path;
            if (normalizedPath.endsWith(".jsx")) {
                normalizedPath = normalizedPath.replace(".jsx", ".tsx");
            }
            fullPath = `/src/${normalizedPath}`;
        }

        // Clean up the code
        let cleanCode = content;
        cleanCode = cleanCode.replace(/["']use client["'];?\n?/g, "");
        // Remove .tsx/.jsx extensions from imports (TypeScript handles this)
        cleanCode = cleanCode.replace(/from\s+["'](.+)\.(tsx|jsx)["']/g, 'from "$1"');

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
