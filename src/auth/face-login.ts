import { faceService } from '../services/faceService';
import { storage } from '../services/storageService';

/**
 * QuizMaster Pro | Second Login: Biometric Verification
 * Logic: Match live descriptor against Sovereign Storage
 */

const video = document.getElementById('face-video') as HTMLVideoElement;
const statusEl = document.getElementById('face-status');
const btnStart = document.getElementById('btn-face-start') as HTMLButtonElement;
const faceEmailInput = document.getElementById('face-email') as HTMLInputElement;
const faceCaptureZone = document.getElementById('face-capture-zone');
const faceEmailGroup = document.getElementById('face-email-group');

const btnReset = document.getElementById('btn-face-reset') as HTMLButtonElement;

let isComparing = false;
let verifiedEmail = '';

function stopVideoStream() {
    if (video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        video.srcObject = null;
    }
    isComparing = false;
}

btnStart?.addEventListener('click', async () => {
    const email = faceEmailInput.value.trim().toLowerCase();
    if (!email) {
        if (statusEl) statusEl.textContent = "[ERROR: EMAIL_REQUIRED]";
        return;
    }

    try {
        // Institutional Lock: Check if biometric data exists for this identity
        const storedData = await storage.get('faceData', email);
        if (!storedData) {
            if (statusEl) statusEl.textContent = "[ERROR: IDENTITY_NOT_ENROLLED]";
            return;
        }

        verifiedEmail = email;
        if (statusEl) statusEl.textContent = "[INITIALIZING_HARDWARE...]";

        // Hide Email Input, Show Video
        if (faceEmailGroup) faceEmailGroup.classList.add('hidden');
        if (faceCaptureZone) faceCaptureZone.classList.remove('hidden');
        if (btnReset) btnReset.classList.remove('hidden');
        btnStart.disabled = true;

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        await faceService.loadModels(() => { });
        isComparing = true;
        runComparisonLoop();
    } catch (err) {
        console.error("Auth Exception:", err);
        if (statusEl) statusEl.textContent = "[ERROR: HARDWARE_FAILURE]";
    }
});

btnReset?.addEventListener('click', () => {
    stopVideoStream();

    // UI Restoration
    if (faceEmailGroup) faceEmailGroup.classList.remove('hidden');
    if (faceCaptureZone) faceCaptureZone.classList.add('hidden');
    if (btnReset) btnReset.classList.add('hidden');
    if (statusEl) statusEl.textContent = "Please verify your email to begin biometric scan.";
    btnStart.disabled = false;
    verifiedEmail = '';
});

async function runComparisonLoop() {
    if (!isComparing || !video || !verifiedEmail) return;

    const analysis = await faceService.analyzeFrame(video);

    if (analysis && (analysis.status === 'OPTIMAL' || analysis.fidelity >= 50) && analysis.descriptor) {
        if (statusEl) statusEl.textContent = `[COMPARING_BIOMETRICS: ${verifiedEmail.toUpperCase()}]`;

        // Retrieve specifically the target descriptor for this email
        const stored = await storage.get('faceData', verifiedEmail);
        if (!stored) {
            isComparing = false;
            if (statusEl) statusEl.textContent = "[ERROR: INTEGRITY_VIOLATION]";
            return;
        }

        const liveDescriptor = analysis.descriptor;
        const distance = faceService.calculateDistance(liveDescriptor, new Float32Array(stored.descriptor));

        // Institutional Stricter Threshold: 0.45 (Standard is 0.6)
        if (distance < 0.45) {
            if (statusEl) statusEl.textContent = `[VERIFIED: ${stored.email.toUpperCase()}]`;
            isComparing = false;

            // Stop streams
            if (video.srcObject) {
                (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            }

            // Sovereign Session Persistence
            sessionStorage.setItem('sovereign_session_email', stored.email);
            sessionStorage.setItem('sovereign_session_time', Date.now().toString());

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            if (statusEl) statusEl.textContent = "[BIOMETRIC_MISMATCH]";
        }
    } else if (analysis) {
        if (statusEl) statusEl.textContent = `[SENSOR: ${analysis.status}]`;
    }

    if (isComparing) requestAnimationFrame(runComparisonLoop);
}
