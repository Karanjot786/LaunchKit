import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

interface DeployRequest {
    projectName: string;
    htmlContent: string;
    cssContent?: string;
    jsContent?: string;
}

export async function POST(request: NextRequest) {
    try {
        const { projectName, htmlContent, cssContent, jsContent }: DeployRequest = await request.json();

        if (!projectName || !htmlContent) {
            return NextResponse.json(
                { error: "Project name and HTML content are required" },
                { status: 400 }
            );
        }

        // Create temp directory for the project
        const tempDir = join(tmpdir(), `LaunchKit-${projectName}-${Date.now()}`);
        mkdirSync(tempDir, { recursive: true });

        try {
            // Write project files
            writeFileSync(join(tempDir, "index.html"), htmlContent);

            if (cssContent) {
                writeFileSync(join(tempDir, "styles.css"), cssContent);
            }

            if (jsContent) {
                writeFileSync(join(tempDir, "script.js"), jsContent);
            }

            // Create firebase.json config
            const firebaseConfig = {
                hosting: {
                    public: ".",
                    ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
                    headers: [
                        {
                            source: "**/*.@(js|css)",
                            headers: [
                                {
                                    key: "Cache-Control",
                                    value: "max-age=31536000"
                                }
                            ]
                        }
                    ]
                }
            };
            writeFileSync(join(tempDir, "firebase.json"), JSON.stringify(firebaseConfig, null, 2));

            // Check if Firebase CLI is available
            try {
                await execAsync("firebase --version");
            } catch {
                return NextResponse.json({
                    success: false,
                    error: "Firebase CLI not installed. Run: npm install -g firebase-tools",
                    manualDeploy: {
                        directory: tempDir,
                        instructions: [
                            "1. Install Firebase CLI: npm install -g firebase-tools",
                            "2. Login to Firebase: firebase login",
                            "3. Initialize project: firebase init hosting",
                            `4. Deploy: firebase deploy --only hosting --project YOUR_PROJECT_ID`
                        ]
                    }
                });
            }

            // Check if user is logged in
            const firebaseToken = process.env.FIREBASE_CI_TOKEN;
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

            if (!projectId) {
                return NextResponse.json({
                    success: false,
                    error: "Firebase project ID not configured",
                    files: {
                        html: htmlContent.substring(0, 500) + "...",
                        tempDir
                    }
                });
            }

            // Deploy to Firebase Hosting
            const deployCommand = firebaseToken
                ? `firebase deploy --only hosting --project ${projectId} --token ${firebaseToken}`
                : `firebase deploy --only hosting --project ${projectId}`;

            const { stdout, stderr } = await execAsync(deployCommand, { cwd: tempDir });

            // Extract the hosting URL from output
            const urlMatch = stdout.match(/Hosting URL: (https:\/\/[^\s]+)/);
            const deployUrl = urlMatch ? urlMatch[1] : `https://${projectId}.web.app`;

            return NextResponse.json({
                success: true,
                data: {
                    url: deployUrl,
                    projectId,
                    message: "Successfully deployed to Firebase Hosting!"
                }
            });

        } finally {
            // Cleanup temp directory
            try {
                rmSync(tempDir, { recursive: true, force: true });
            } catch {
                // Ignore cleanup errors
            }
        }

    } catch (error) {
        console.error("Deploy error:", error);
        return NextResponse.json(
            {
                error: "Deployment failed",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
