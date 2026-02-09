/**
 * Export Utilities
 * 
 * Functions for exporting and deploying projects.
 */

// Export as ZIP
export async function exportAsZip(
    files: Record<string, string>,
    projectName: string
): Promise<Blob> {
    // Dynamically import JSZip
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    // Add all files to the zip
    for (const [path, content] of Object.entries(files)) {
        zip.file(path, content);
    }

    // Add package.json if not exists
    if (!files["package.json"]) {
        zip.file(
            "package.json",
            JSON.stringify(
                {
                    name: projectName.toLowerCase().replace(/\s+/g, "-"),
                    version: "1.0.0",
                    private: true,
                    scripts: {
                        dev: "vite",
                        build: "vite build",
                        preview: "vite preview",
                    },
                    dependencies: {
                        react: "^18.2.0",
                        "react-dom": "^18.2.0",
                        "lucide-react": "^0.263.1",
                        "framer-motion": "^10.16.4",
                    },
                    devDependencies: {
                        "@vitejs/plugin-react": "^4.0.4",
                        vite: "^4.4.9",
                        tailwindcss: "^3.3.3",
                        postcss: "^8.4.29",
                        autoprefixer: "^10.4.15",
                    },
                },
                null,
                2
            )
        );
    }

    // Add vite.config.js if not exists
    if (!files["vite.config.js"]) {
        zip.file(
            "vite.config.js",
            `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`
        );
    }

    // Add index.html if not exists
    if (!files["index.html"]) {
        zip.file(
            "index.html",
            `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`
        );
    }

    // Add README.md
    zip.file(
        "README.md",
        `# ${projectName}

Generated with LaunchPad

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Building for Production

\`\`\`bash
npm run build
\`\`\`
`
    );

    return zip.generateAsync({ type: "blob" });
}

// Download a blob as a file
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Export and download project
export async function downloadProject(
    files: Record<string, string>,
    projectName: string
): Promise<void> {
    const blob = await exportAsZip(files, projectName);
    const filename = `${projectName.toLowerCase().replace(/\s+/g, "-")}.zip`;
    downloadBlob(blob, filename);
}

// Deploy to Vercel (requires API key)
export async function deployToVercel(
    files: Record<string, string>,
    projectName: string,
    options: {
        token: string;
        teamId?: string;
    }
): Promise<{
    success: boolean;
    url?: string;
    error?: string;
}> {
    try {
        // Convert files to Vercel's expected format
        const vercelFiles = Object.entries(files).map(([path, content]) => ({
            file: path,
            data: content,
        }));

        // Create deployment
        const response = await fetch("https://api.vercel.com/v13/deployments", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${options.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: projectName.toLowerCase().replace(/\s+/g, "-"),
                files: vercelFiles,
                projectSettings: {
                    framework: "vite",
                },
                target: "production",
                ...(options.teamId && { teamId: options.teamId }),
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error?.message || "Deployment failed",
            };
        }

        return {
            success: true,
            url: `https://${data.url}`,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

// Create GitHub repository and push files
export async function pushToGitHub(
    files: Record<string, string>,
    options: {
        token: string;
        repoName: string;
        isPrivate?: boolean;
        description?: string;
    }
): Promise<{
    success: boolean;
    url?: string;
    error?: string;
}> {
    try {
        // Create the repository
        const repoResponse = await fetch("https://api.github.com/user/repos", {
            method: "POST",
            headers: {
                Authorization: `token ${options.token}`,
                "Content-Type": "application/json",
                Accept: "application/vnd.github.v3+json",
            },
            body: JSON.stringify({
                name: options.repoName,
                private: options.isPrivate ?? false,
                description: options.description || "Created with LaunchPad",
                auto_init: true,
            }),
        });

        const repoData = await repoResponse.json();

        if (!repoResponse.ok) {
            // Check if repo already exists
            if (repoData.errors?.[0]?.message?.includes("name already exists")) {
                return {
                    success: false,
                    error: `Repository "${options.repoName}" already exists`,
                };
            }
            return {
                success: false,
                error: repoData.message || "Failed to create repository",
            };
        }

        // Wait a bit for repo to be ready
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Get the user's login
        const userResponse = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `token ${options.token}`,
                Accept: "application/vnd.github.v3+json",
            },
        });
        const userData = await userResponse.json();

        // Create files using the Contents API
        const filePromises = Object.entries(files).map(async ([path, content]) => {
            const response = await fetch(
                `https://api.github.com/repos/${userData.login}/${options.repoName}/contents/${path}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `token ${options.token}`,
                        "Content-Type": "application/json",
                        Accept: "application/vnd.github.v3+json",
                    },
                    body: JSON.stringify({
                        message: `Add ${path}`,
                        content: btoa(unescape(encodeURIComponent(content))),
                    }),
                }
            );

            if (!response.ok) {
                const data = await response.json();
                console.warn(`Failed to create ${path}:`, data.message);
            }
        });

        await Promise.all(filePromises);

        return {
            success: true,
            url: repoData.html_url,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
