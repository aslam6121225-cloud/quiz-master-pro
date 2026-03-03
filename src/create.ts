import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { storage } from './services/storageService';
import { generateQuizFromText } from './services/aiService';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * Quizy Pro | PDF Processor & Quiz Generator
 * Philosophy: 100% Client-Side, Pattern-Based Generation
 */

// Use stable CDN worker (version 3.11.174)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const btnGenerate = document.getElementById('btn-generate') as HTMLButtonElement;
const progressOverlay = document.getElementById('processing-overlay');
const progressBar = document.getElementById('progress-bar');
const successView = document.getElementById('success-view');
const settingsCard = document.getElementById('generation-settings');

let rawText = "";
let currentFile: File | null = null;
let userEmail: string | null = null;

onAuthStateChanged(auth, (user) => {
    if (user) userEmail = user.email;
    else window.location.href = 'login.html';
});

// 1. Interaction Handlers
dropZone?.addEventListener('click', () => fileInput.click());
fileInput?.addEventListener('change', (e: any) => handleFile(e.target.files[0]));

dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone?.addEventListener('drop', (e: any) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
});

// Remove File
document.getElementById('btn-remove-file')?.addEventListener('click', () => {
    currentFile = null;
    document.getElementById('file-preview')?.classList.add('hidden');
    btnGenerate.disabled = true;
});

// Update Question Count Label
document.getElementById('input-num')?.addEventListener('input', (e: any) => {
    const label = document.getElementById('label-num');
    if (label) label.textContent = e.target.value;
    const genBtn = document.getElementById('btn-generate');
    if (genBtn) genBtn.textContent = `Generate 15 Unique Quizy Sessions (${e.target.value * 15} Scenarios)`;
});

// Progression Modes
document.querySelectorAll('.progression-option').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.progression-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
    });
});

async function handleFile(file: File) {
    if (!file || (file.type !== 'application/pdf' && file.type !== 'text/plain')) return;
    currentFile = file;

    // Update UI
    document.getElementById('file-preview')?.classList.remove('hidden');
    document.getElementById('prev-name')!.textContent = file.name;
    document.getElementById('prev-meta')!.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    btnGenerate.disabled = false;
}

// 2. Generation Engine
btnGenerate?.addEventListener('click', async () => {
    if (!currentFile || !userEmail) return;

    progressOverlay?.classList.remove('hidden');
    settingsCard?.classList.add('hidden');

    try {
        // STEP 1: EXTRACT
        updateStep('extract', 'active');
        rawText = currentFile.type === 'application/pdf'
            ? await extractPDFText(currentFile)
            : await currentFile.text();
        updateProgress(25);
        updateStep('extract', 'complete');

        // STEP 2: KEYWORDS
        updateStep('keywords', 'active');
        await simulateDelay(1000);
        updateProgress(50);
        updateStep('keywords', 'complete');

        // STEP 3: GENERATE (Using Advanced Cognitive Learning Architect Service)
        updateStep('questions', 'active');
        const quizBundle = await generateQuizFromText(rawText, currentFile.name);
        updateProgress(80);
        updateStep('questions', 'complete');

        // STEP 4: FINALIZE
        updateStep('finalize', 'active');
        const docId = Date.now().toString();

        // Save Master PDF Record
        await storage.save('pdfs', {
            id: docId,
            name: currentFile.name,
            text: rawText,
            owner: userEmail,
            timestamp: Date.now()
        });

        const timeLimit = parseInt((document.getElementById('input-time') as HTMLSelectElement).value);
        const difficultyMode = document.querySelector('.progression-option.active')?.getAttribute('data-mode') || 'mixed';

        // Save Quizy Bundle with AI-generated content
        await storage.save('quizzes', {
            id: `bundle_${docId}`,
            docId,
            owner: userEmail,
            subject: quizBundle.subject,
            questions: quizBundle.questions,
            masteryPack: quizBundle.masteryPack,
            settings: { timeLimit, difficultyMode },
            title: `Quizy Bundle: ${currentFile.name}`,
            timestamp: Date.now()
        });

        updateProgress(100);
        updateStep('finalize', 'complete');

        // SUCCESS
        setTimeout(() => {
            progressOverlay?.classList.add('hidden');
            successView?.classList.remove('hidden');
        }, 800);

    } catch (err) {
        console.error("Generation Error:", err);
        alert("Quizy Generation Failed. Check document accessibility.");
        progressOverlay?.classList.add('hidden');
        settingsCard?.classList.remove('hidden');
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

function updateProgress(val: number) { if (progressBar) progressBar.style.width = `${val}%`; }
function updateStep(id: string, status: 'active' | 'complete') {
    const el = document.getElementById(`step-${id}`);
    if (el) {
        el.className = `progress-item ${status}`;
        if (status === 'complete') el.innerHTML = "✓ " + el.innerHTML;
    }
}
function simulateDelay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
