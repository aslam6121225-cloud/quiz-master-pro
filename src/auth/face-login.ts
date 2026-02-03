import { faceService } from '../services/faceService';
import { storage } from '../services/storageService';

/**
 * QuizMaster Pro | Second Login: Biometric Verification
 * Logic: Match live descriptor against Sovereign Storage
 */

const video = document.getElementById('face-video') as HTMLVideoElement;
const statusEl = document.getElementById('face-status');
const btnStart = document.getElementById('btn-face-start');

let isComparing = false;

btnStart?.addEventListener('click', async () => {
    try {
        if (statusEl) statusEl.textContent = "[INITIALIZING_SENSOR...]";
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        await faceService.loadModels(() => { });
        isComparing = true;
        runComparisonLoop();
    } catch (err) {
        if (statusEl) statusEl.textContent = "[ERROR: SENSOR_ACCESS_DENIED]";
    }
});

async function runComparisonLoop() {
    if (!isComparing || !video) return;

    const analysis = await faceService.analyzeFrame(video);

    if (analysis && (analysis.status === 'OPTIMAL' || analysis.fidelity >= 50) && (analysis as any).descriptor) {
        if (statusEl) statusEl.textContent = "[MATCHING_BIOMETRIC_SIGNATURE...]";

        // Match against all stored descriptors in IndexedDB
        const allFaces = await storage.getAll('faceData');
        const liveDescriptor = (analysis as any).descriptor;

        let bestMatch = null;
        let minDistance = 0.6; // Institutional threshold

        for (const stored of allFaces) {
            const distance = faceService.calculateDistance(liveDescriptor, new Float32Array(stored.descriptor));
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = stored;
            }
        }

        if (bestMatch) {
            if (statusEl) statusEl.textContent = `[MATCH_FOUND: ${bestMatch.email.toUpperCase()}]`;
            isComparing = false;

            // Sovereign Session Persistence
            // This allows the dashboard to trust this terminal session
            sessionStorage.setItem('sovereign_session_email', bestMatch.email);
            sessionStorage.setItem('sovereign_session_time', Date.now().toString());

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            if (statusEl) statusEl.textContent = "[IDENTITY_NOT_RECOGNIZED]";
        }
    } else if (analysis) {
        if (statusEl) statusEl.textContent = `[SENSOR: ${analysis.status}]`;
    }

    if (isComparing) requestAnimationFrame(runComparisonLoop);
}
