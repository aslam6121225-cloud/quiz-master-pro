import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { faceService } from '../services/faceService';
import { storage } from '../services/storageService';

/**
 * QuizMaster Pro | Face Setup Wizard Controller
 * Logic: 3-Angle Capture, Quality Validation, Local Persistence
 */

const video = document.getElementById('video-stream') as HTMLVideoElement;
const statusDetect = document.getElementById('status-detect');
const statusQuality = document.getElementById('status-quality');
const btnCapture = document.getElementById('btn-capture') as HTMLButtonElement;
const instructionEl = document.getElementById('capture-instruction');
const sampleCountEl = document.getElementById('sample-count');
const countdownEl = document.getElementById('countdown');
const flashEl = document.getElementById('flash-effect');

let currentUserEmail: string | null = null;
let sampleIndex = 0;
const samples: Float32Array[] = [];
let isAnalyzing = false;

const INSTRUCTIONS = [
    "Look straight ahead",
    "Turn slightly LEFT",
    "Turn slightly RIGHT"
];

// 1. Auth Guard
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserEmail = user.email;
        initSetup();
    } else {
        window.location.href = 'login.html';
    }
});

async function initSetup() {
    await faceService.loadModels(() => { });
}

// 2. Camera Trigger
window.addEventListener('start-camera', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' }
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            isAnalyzing = true;
            runDetectionLoop();
        };
    } catch (err) {
        console.error("Camera access failed", err);
    }
});

// 3. Detection & Quality Check
async function runDetectionLoop() {
    if (!isAnalyzing || !video || !currentUserEmail) return;

    const analysis = await faceService.analyzeFrame(video);

    if (analysis) {
        if (statusDetect) statusDetect.textContent = analysis.status;
        if (statusQuality) statusQuality.textContent = `${analysis.fidelity}%`;

        if (analysis.status === 'OPTIMAL' && !countdownEl?.style.display || countdownEl?.style.display === 'none') {
            btnCapture.disabled = false;
        } else {
            btnCapture.disabled = true;
        }
    }
    requestAnimationFrame(runDetectionLoop);
}

// 4. Capture Sequential Logic
btnCapture?.addEventListener('click', async () => {
    if (sampleIndex >= 3 || !currentUserEmail) return;

    btnCapture.disabled = true;

    // Countdown
    if (countdownEl) {
        countdownEl.style.display = 'block';
        for (let i = 3; i > 0; i--) {
            countdownEl.textContent = i.toString();
            await new Promise(r => setTimeout(r, 800));
        }
        countdownEl.style.display = 'none';
    }

    // Flash & Capture
    if (flashEl) {
        flashEl.style.opacity = '1';
        setTimeout(() => flashEl.style.opacity = '0', 200);
    }

    const analysis = await faceService.analyzeFrame(video);
    if (analysis && (analysis as any).descriptor) {
        samples.push((analysis as any).descriptor);
        sampleIndex++;

        if (sampleIndex < 3) {
            // Next Angle
            if (sampleCountEl) sampleCountEl.textContent = (sampleIndex + 1).toString();
            if (instructionEl) instructionEl.textContent = INSTRUCTIONS[sampleIndex];
        } else {
            // Finalize
            await finalizeEnrollment();
        }
    }
});

async function finalizeEnrollment() {
    isAnalyzing = false;
    (window as any).nextStep(4); // Move to Processing

    // Stop tracks
    if (video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }

    // Composite/Average the 3 descriptors for better accuracy
    const averaged = averageDescriptors(samples);

    // Save to Sovereign Storage (IndexedDB + StorageService)
    if (currentUserEmail) {
        // Save to Face Store in IndexedDB
        await storage.save('faceData', {
            email: currentUserEmail,
            descriptor: Array.from(averaged),
            capturedAt: new Date().toISOString()
        });
    }

    // Simulate analysis time
    setTimeout(() => {
        (window as any).nextStep(5); // Complete
    }, 2500);
}

function averageDescriptors(descriptors: Float32Array[]): Float32Array {
    const size = descriptors[0].length;
    const result = new Float32Array(size);
    for (let i = 0; i < size; i++) {
        let sum = 0;
        for (let d = 0; d < descriptors.length; d++) {
            sum += descriptors[d][i];
        }
        result[i] = sum / descriptors.length;
    }
    return result;
}
