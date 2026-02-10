import { NextRequest, NextResponse } from "next/server";
import { db, storage, ref, uploadBytes, getDownloadURL } from "@/lib/firebase";

export async function POST(req: NextRequest) {
    try {
        const { projectId, logoDataUrl } = await req.json();

        if (!logoDataUrl || !projectId) {
            return NextResponse.json(
                { error: "Missing projectId or logoDataUrl" },
                { status: 400 }
            );
        }

        // Extract base64 data from data URL
        const base64Match = logoDataUrl.match(/^data:image\/\w+;base64,(.+)$/);
        if (!base64Match) {
            // Already a URL (not data URL), just return it
            return NextResponse.json({ success: true, url: logoDataUrl });
        }

        const base64Data = base64Match[1];

        // Try uploading to Firebase Storage
        if (storage) {
            try {
                const buffer = Buffer.from(base64Data, "base64");
                const blob = new Uint8Array(buffer);
                const timestamp = Date.now();
                const storageRef = ref(storage, `logos/${projectId}/selected_logo_${timestamp}.png`);

                await uploadBytes(storageRef, blob, { contentType: "image/png" });
                const downloadUrl = await getDownloadURL(storageRef);

                console.log(`Uploaded selected logo to Storage: ${downloadUrl}`);

                // Also update the project document with the selected logo
                if (db) {
                    try {
                        const { doc, updateDoc } = await import("firebase/firestore");
                        await updateDoc(doc(db, "builder_projects", projectId), {
                            logo: downloadUrl,
                        });
                    } catch (dbErr) {
                        console.error("Failed to update project with logo URL:", dbErr);
                    }
                }

                return NextResponse.json({ success: true, url: downloadUrl });
            } catch (uploadError) {
                console.error("Failed to upload selected logo:", uploadError);
                // Fallback to data URL
                return NextResponse.json({ success: true, url: logoDataUrl });
            }
        }

        // No storage, return the data URL as-is
        return NextResponse.json({ success: true, url: logoDataUrl });
    } catch (error) {
        console.error("Logo upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload logo" },
            { status: 500 }
        );
    }
}
