import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { storage } from './services/storageService';
import { generateQuizFromText } from './services/aiService';
import { showInfoModal } from './services/uiService';
import { checkAuth } from './services/sessionService';
import * as pdfjsLib from 'pdfjs-dist';

// Use stable CDN worker (version 3.11.174)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const btnGenerate = document.getElementById('btn-generate') as HTMLButtonElement;
const successView = document.getElementById('success-view');
const settingsCard = document.getElementById('generation-settings');

let currentFile: File | null = null;
let userEmail: string | null = null;

// 1. Universal Institutional Guard (v0.3)
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    console.log("Generation Node Verified:", sessionStorage.getItem('userEmail'));
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        userEmail = user.email;
    } else {
        userEmail = sessionStorage.getItem('userEmail');
    }
});

// --- UPLOAD LOGIC ---
dropZone?.addEventListener('click', () => fileInput?.click());

dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer?.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

fileInput?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.length) {
        handleFile(target.files[0]);
    }
});

function handleFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.txt')) {
        showToast("❌ Strictly: PDF or Educational Text material only.");
        return;
    }
    currentFile = file;
    document.getElementById('file-preview')?.classList.remove('hidden');
    document.getElementById('prev-name')!.textContent = file.name;
    document.getElementById('prev-meta')!.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB • Analyzing Source...`;
    btnGenerate.disabled = false;
    dropZone?.classList.add('hidden');
}

// --- REMOVE FILE LOGIC ---
document.getElementById('btn-remove-file')?.addEventListener('click', () => {
    currentFile = null;
    fileInput.value = '';
    document.getElementById('file-preview')?.classList.add('hidden');
    dropZone?.classList.remove('hidden');
    btnGenerate.disabled = true;
});

// --- SETTINGS UI ---
const inputNum = document.getElementById('input-num') as HTMLInputElement;
const labelNum = document.getElementById('label-num');
inputNum?.addEventListener('input', () => {
    if (labelNum) labelNum.textContent = inputNum.value;
    btnGenerate.textContent = `Generate ${inputNum.value} Unique Questions`;
});

document.querySelectorAll('.progression-option').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.progression-option').forEach(el => el.classList.remove('active'));
        opt.classList.add('active');
    });
});

// --- GENERATION ORCHESTRATION (v0.3 | Neural Scan) ---
btnGenerate?.addEventListener('click', async () => {
    if (!currentFile || !userEmail) return;

    let requestedCount = parseInt(inputNum.value) || 10;
    const processingView = document.getElementById('processing-view');
    const tickerEl = document.getElementById('status-ticker');
    const difficultyMode = document.querySelector('.progression-option.active')?.getAttribute('data-mode') || 'mixed';
    const timeLimit = parseInt((document.getElementById('input-time') as HTMLSelectElement).value);

    settingsCard?.classList.add('hidden');
    processingView?.classList.remove('hidden');

    try {
        // 1. Status Ticker Lifecycle
        const messages = [
            "Scanning Document Topology...",
            "Extracting High-Level Concepts...",
            "Synthesizing Scenario-Based Challenges...",
            "Finalizing Institutional Integrity Check..."
        ];
        let msgIdx = 0;
        const tickerInterval = setInterval(() => {
            if (tickerEl) {
                msgIdx = (msgIdx + 1) % messages.length;
                tickerEl.textContent = messages[msgIdx].toUpperCase() + "...";
            }
        }, 2000);

        // 2. Text Extraction & Smart Chunking (Stability Layer)
        let rawText = currentFile.type === 'application/pdf'
            ? await extractPDFText(currentFile)
            : await currentFile.text();
            
        // Cleaning and trimming to 6,000 characters for token stability
        const liteText = rawText.substring(0, 6000).replace(/[^\x20-\x7E\n]/g, '');
            
        // 3. Document Capacity Estimate
        const cleanText = liteText
            .replace(/\f/g, '\n')
            .replace(/(Page \d+ of \d+|Institutional Header|Confidential|Footer:.*)/gi, '')
            .split('\n')
            .filter(line => line.trim().length > 20)
            .join(' ');
        
        const sentenceCount = (cleanText.match(/[^.!?]+[.!?]+/g) || []).length;
        const maxPossible = Math.max(5, Math.floor(sentenceCount / 1.5));
        
        if (requestedCount > maxPossible && currentFile.type === 'application/pdf') {
            requestedCount = maxPossible;
            showToast(`Document chunk analyzed. Limit adjusted to ${maxPossible} questions.`);
        }

        // 4. Dual-AI Logic
        let quizBundle;
        try {
            quizBundle = await generateQuizFromText(liteText, currentFile.name, requestedCount, difficultyMode);
        } catch (err) {
            console.warn("Dual-AI Exhausted. Retrying with Sovereign Lite-Protocol...");
            quizBundle = await generateQuizFromText(liteText, currentFile.name, 3, 'mixed', [], true);
        }

        const docId = `doc_${Date.now()}`;
        const quizId = `bundle_${docId}`;

        // 5. Sovereign Persistence
        await storage.save('pdfs', {
            id: docId,
            name: currentFile.name,
            text: rawText,
            owner: userEmail,
            timestamp: Date.now()
        });

        await storage.save('quizzes', {
            id: quizId,
            docId,
            owner: userEmail,
            subject: quizBundle.subject,
            questions: quizBundle.questions,
            masteryPack: quizBundle.masteryPack,
            settings: { timeLimit, difficultyMode },
            title: `Quizy Bundle: ${currentFile.name}`,
            timestamp: Date.now()
        });

        clearInterval(tickerInterval);

        // 6. Seamless Transition Sequence
        processingView?.classList.add('fade-out');

        setTimeout(() => {
            processingView?.classList.add('hidden');
            successView?.classList.remove('hidden');
            successView?.classList.add('fade-in');

            const successTitle = document.getElementById('success-title');
            if (successTitle) successTitle.textContent = `${quizBundle.questions.length} Diagnostic Vectors Generated!`;

            const startBtn = successView?.querySelector('a.btn-primary') as HTMLAnchorElement;
            if (startBtn) startBtn.href = `quiz.html?id=${quizId}`;

            // Institutional Auto-Launch
            setTimeout(() => {
                window.location.href = `quiz.html?id=${quizId}`;
            }, 1000);
        }, 500);

    } catch (err: any) {
        console.error("Critical Generation Failure:", err);
        processingView?.classList.add('hidden');
        settingsCard?.classList.remove('hidden');
        
        // Final Stability: Force Lite Option
        const forceLite = await showInfoModal(
            "Generation Failed", 
            `Institutional Protocol Error: ${err.message || 'Check document complexity'}.`, 
            "⚠️",
            "Force Lite Generation"
        );

        if (forceLite) {
            btnGenerate.click(); // Re-trigger (logic will handle lite-retry)
        }
    }
});

// --- CORE UTILS ---

async function extractPDFText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return fullText;
}

function showToast(message: string) {
    const toast = document.getElementById('toast-notify');
    const toastMsg = document.getElementById('toast-message');
    if (toast && toastMsg) {
        toastMsg.textContent = message;
        toast.style.bottom = '20px';
        setTimeout(() => { toast.style.bottom = '-100px'; }, 4000);
    }
}
