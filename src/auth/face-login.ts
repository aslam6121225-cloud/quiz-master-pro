import { faceService } from '../services/faceService';
import { storage } from '../services/storageService';
import { setSovereignSession } from '../services/sessionService';

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

// Premium MNC-Level Toast Notification System
let lastToastTime = 0;
function showToast(message: string, type: 'error' | 'success' | 'info' = 'info') {
    const now = Date.now();
    // Throttle rapid toasts to prevent spam UI
    if (now - lastToastTime < 2500) return;
    lastToastTime = now;

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '24px';
    toast.style.right = '24px';
    toast.style.padding = '14px 24px';
    toast.style.borderRadius = '8px';
    toast.style.color = '#fff';
    toast.style.fontWeight = '500';
    toast.style.fontSize = '14px';
    toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    toast.style.zIndex = '99999';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.backdropFilter = 'blur(10px)';

    if (type === 'error') {
        toast.style.background = 'rgba(220, 38, 38, 0.9)'; // Premium Red
        toast.style.borderLeft = '4px solid #991b1b';
    } else if (type === 'success') {
        toast.style.background = 'rgba(22, 163, 74, 0.9)'; // Premium Green
        toast.style.borderLeft = '4px solid #166534';
    } else {
        toast.style.background = 'rgba(37, 99, 235, 0.9)'; // Premium Blue
        toast.style.borderLeft = '4px solid #1e40af';
    }

    document.body.appendChild(toast);

    // Animate In
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Destroy
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

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
        updateStatus("Email identity required.", "error");
        showToast("Please provide your registered email to initiate scan.", "error");
        return;
    }

    try {
        // Institutional Lock: Check if biometric data exists for this identity
        const storedData = await storage.get('faceData', email);
        if (!storedData) {
            updateStatus("Identity not enrolled.", "error");
            showToast("No biometric profile found. Please register first.", "error");
            return;
        }

        verifiedEmail = email;
        updateStatus("Initializing biometric hardware...", "scanning");

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
        updateStatus("Hardware failure detected.", "error");
        showToast("Camera access denied or hardware failure detected.", "error");
    }
});

btnReset?.addEventListener('click', () => {
    stopVideoStream();

    // UI Restoration
    if (faceEmailGroup) faceEmailGroup.classList.remove('hidden');
    if (faceCaptureZone) faceCaptureZone.classList.add('hidden');
    if (btnReset) btnReset.classList.add('hidden');
    updateStatus("Verify email to begin biometric scan.", "default");
    btnStart.disabled = false;
    verifiedEmail = '';
});

function updateStatus(message: string, type: 'scanning' | 'success' | 'error' | 'default' = 'default') {
    if (!statusEl) return;
    
    // Clear previous states
    statusEl.classList.remove('scanning', 'success', 'error');
    
    // Add new state
    if (type !== 'default') {
        statusEl.classList.add(type);
    }
    
    // Set Icon and message
    let icon = '';
    switch(type) {
        case 'scanning': icon = '🤖'; break;
        case 'success': icon = '✅'; break;
        case 'error': icon = '❌'; break;
        default: icon = 'ℹ️';
    }
    
    statusEl.innerHTML = `<span class="status-icon">${icon}</span> <span class="status-message">${message}</span>`;
}

function getReadableStatus(code: string): string {
    switch (code) {
        case 'NO_TARGET': return 'Scanning for facial geometry...';
        case 'ALIGN_FACE': return 'Please center your face in the frame.';
        case 'LOW_LIGHT': return 'Lighting too low. Adjust environment.';
        case 'OPTIMAL': return 'Biometric geometry acquired. Analyzing...';
        default: return 'Initializing scanner...';
    }
}

async function runComparisonLoop() {
    if (!isComparing || !video || !verifiedEmail) return;

    const analysis = await faceService.analyzeFrame(video);

    if (analysis && (analysis.status === 'OPTIMAL' || analysis.fidelity >= 50) && analysis.descriptor) {
        updateStatus("Comparing live descriptor with secure enclave...", "scanning");

        // Retrieve specifically the target descriptor for this email
        const stored = await storage.get('faceData', verifiedEmail);
        if (!stored) {
            isComparing = false;
            updateStatus("Security Exception: Descriptor corrupted.", "error");
            showToast("Security Exception: Descriptor corrupted.", "error");
            return;
        }

        const liveDescriptor = analysis.descriptor;
        const distance = faceService.calculateDistance(liveDescriptor, new Float32Array(stored.descriptor));

        // Institutional Stricter Threshold: 0.45 (Standard is 0.6)
        if (distance < 0.45) {
            updateStatus("Authentication Successful", "success");
            showToast(`Identity Confirmed: ${stored.email}`, "success");
            isComparing = false;

            // Stop streams
            if (video.srcObject) {
                (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            }

            // Institutional Sovereign Session Protocol (v0.3)
            setSovereignSession({ 
                email: stored.email, 
                method: 'face',
                displayName: stored.name || stored.email.split('@')[0]
            });

            console.log("Biometric Identity Confirmed:", stored.name);

            // Force Sync Delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        } else {
            updateStatus("Biometric mismatch detected", "error");
            showToast("Face mismatch. Unauthorized identity detected.", "error");
        }
    } else if (analysis) {
        updateStatus(getReadableStatus(analysis.status), "scanning");
    }

    if (isComparing) requestAnimationFrame(runComparisonLoop);
}
