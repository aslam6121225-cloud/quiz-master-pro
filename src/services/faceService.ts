import * as faceapi from 'face-api.js';

/**
 * IDENTITY_SENTINEL | Face-API Integration Layer
 * Philosophy: Local-Only Sovereignty, High Fidelity
 */

class FaceService {
    private modelsLoaded = false;
    private readonly MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

    async loadModels(onStatus: (status: string) => void) {
        if (this.modelsLoaded) {
            onStatus('READY');
            return;
        }

        try {
            onStatus('LOADING_MODELS');
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(this.MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
            ]);
            this.modelsLoaded = true;
            onStatus('READY');
        } catch (err) {
            console.error('Model Load Failed:', err);
            onStatus('FAILED');
            throw err;
        }
    }

    async analyzeFrame(videoEl: HTMLVideoElement) {
        if (!this.modelsLoaded) return null;

        const detection = await faceapi.detectSingleFace(videoEl)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) return { status: 'NO_TARGET', fidelity: 0 };

        // 1. Quality Control: Centering
        const { width, height } = videoEl;
        const box = detection.detection.box;
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        const isCentered =
            Math.abs(centerX - width / 2) < (width * 0.15) &&
            Math.abs(centerY - height / 2) < (height * 0.15);

        // 2. Quality Control: Lighting (Average Brightness)
        const brightness = await this.getBrightness(videoEl);
        const isWellLit = brightness > 50 && brightness < 230;

        // 3. Quality Control: Multiple Faces (detectSingleFace takes care of "single", 
        // but we verify no other candidates are close in the same frame if needed)

        const qualityLevel = (isCentered ? 50 : 0) + (isWellLit ? 50 : 0);

        return {
            status: isCentered ? (isWellLit ? 'OPTIMAL' : 'LOW_LIGHT') : 'ALIGN_FACE',
            fidelity: qualityLevel,
            descriptor: detection.descriptor,
            detection: detection
        };
    }

    private async getBrightness(videoEl: HTMLVideoElement): Promise<number> {
        const canvas = document.createElement('canvas');
        canvas.width = 40; // Low res for speed
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        if (!ctx) return 100;

        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
            total += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        return total / (canvas.width * canvas.height);
    }

    saveDescriptorLocally(email: string, descriptor: Float32Array) {
        // Data Sovereignty: Never leaves the terminal
        const serialized = Array.from(descriptor);
        // Simple obfuscation
        const encrypted = btoa(JSON.stringify(serialized));
        localStorage.setItem(`biometric_descriptor_${email}`, encrypted);
    }

    getDescriptorLocally(email: string): Float32Array | null {
        const stored = localStorage.getItem(`biometric_descriptor_${email}`);
        if (!stored) return null;
        try {
            const raw = JSON.parse(atob(stored));
            return new Float32Array(raw);
        } catch {
            return null;
        }
    }

    calculateDistance(desc1: Float32Array, desc2: Float32Array): number {
        return faceapi.euclideanDistance(desc1, desc2);
    }
}

export const faceService = new FaceService();
