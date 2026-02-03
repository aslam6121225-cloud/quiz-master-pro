import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { storage } from './services/storageService';
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
        const keywords = extractKeywords(rawText);
        await simulateDelay(1000);
        updateProgress(50);
        updateStep('keywords', 'complete');

        // STEP 3: GENERATE
        updateStep('questions', 'active');
        const numToGen = parseInt((document.getElementById('input-num') as HTMLInputElement).value);
        const quizzes = generateQuizzes(keywords, numToGen, rawText);
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

        // Save Quizy Bundle (Single Entry with 15 Sequences)
        await storage.save('quizzes', {
            id: `bundle_${docId}`,
            docId,
            owner: userEmail,
            sequences: quizzes,
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

function extractKeywords(text: string): string[] {
    const STOP_WORDS = new Set([
        "college", "department", "university", "institute", "page", "chapter", "section",
        "author", "prof", "professor", "chennai", "autonomous", "shift", "application",
        "question", "answer", "marks", "total", "time", "date", "reg", "number", "email"
    ]);

    // specific filtering for 5+ char words
    const words = text.toLowerCase().match(/[a-z]{5,}/g) || [];
    const freq: Record<string, number> = {};

    words.forEach(w => {
        if (!STOP_WORDS.has(w)) {
            freq[w] = (freq[w] || 0) + 1;
        }
    });

    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(e => e[0]);
}

function generateQuizzes(keywords: string[], count: number, fullText: string) {
    const sets = [];
    const definitions = extractDefinitions(fullText, keywords);

    // Professional EdTech Question Templates 
    // Designed to test conceptual mastery without repetitive phrasing
    const questionTypes = [
        "Which statement accurately describes the concept of **{keyword}**?",
        "In the context of this document, **{keyword}** is best indicated by which description?",
        "The term **{keyword}** specifically refers to:",
        "How is **{keyword}** defined in the provided material?",
        "Identify the correct characterization of **{keyword}**:",
        "Which of the following best captures the essence of **{keyword}**?",
        "According to the text, **{keyword}** involves:",
        "Select the explanation that best fits **{keyword}**:"
    ];

    // Generate 15 Quizzes based on Real Content
    for (let i = 0; i < 15; i++) {
        const questions: any[] = [];
        for (let j = 0; j < count; j++) {
            const keyword = keywords[Math.floor(Math.random() * keywords.length)];
            const defSentence = definitions[keyword];

            // If we can't find a sentence for this keyword, skip or pick another
            if (!defSentence || defSentence.length < 20) {
                // Try one more time
                continue;
            }

            const template = questionTypes[Math.floor(Math.random() * questionTypes.length)];
            const topic = keyword.toUpperCase();

            let questionText = template.replace('{keyword}', keyword);
            let correctAnswer = defSentence;

            // Distractors: Sentences for OTHER keywords
            const distractors = getRandomKeywords(keywords, keyword, 3);
            const wrongAnswers = distractors.map(d => definitions[d] || `A related concept involving ${d}.`);

            const allOpts = shuffle([correctAnswer, ...wrongAnswers]);
            const labels = ['A', 'B', 'C', 'D'];
            const options = allOpts.map((opt, idx) => `${labels[idx]}) ${opt}`);
            correctAnswer = options.find(o => o.includes(defSentence)) || options[0];

            const correctLetter = correctAnswer.split(')')[0];

            // Detailed Explanation
            const deepAnalysis = `Correct Answer: ${correctLetter}

Detailed Explanation:
The document defines ${keyword} as: "${defSentence}"

Key Context:
This concept is central to the text's discussion on ${topic}. Differentiating it from ${distractors.join(', ')} is crucial for understanding the material.`;

            questions.push({
                question: questionText,
                answer: correctAnswer,
                options: options,
                topic: topic,
                explanation: deepAnalysis,
                resources: {
                    wikipedia: `https://en.wikipedia.org/wiki/${encodeURIComponent(keyword)}`,
                    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword + ' tutorial')}`,
                    google: `https://www.google.com/search?q=${encodeURIComponent(keyword + ' definition')}`
                }
            });
        }
        sets.push({ title: `Quizy Sequence ${i + 1}`, questions, timestamp: Date.now() });
    }
    return sets;
}

function extractDefinitions(text: string, keywords: string[]): Record<string, string> {
    const definitions: Record<string, string> = {};

    // 1. Pre-clean: Remove common footer/header patterns before sentence splitting
    const coreText = text
        .replace(/Page \d+ of \d+/g, '') // Remove "Page X of Y"
        .replace(/Department of .+/gi, '') // Remove Department headers
        .replace(/The New College/gi, '') // Remove specific repeated noise
        .replace(/\n/g, ' '); // Join rest for flow

    const sentences = coreText.match(/[^.!?]+[.!?]+/g) || [];

    keywords.forEach(keyword => {
        // Find sentences containing the keyword
        const matches = sentences.filter(s => s.toLowerCase().includes(keyword.toLowerCase()));

        // STAGE 2: STRICT QUALITY FILTER
        // We only want sentences that explain concepts, not addresses
        const validSentences = matches.filter(s => {
            const cleanS = s.trim();
            // 1. Must be decent length (avoid "Unit I." or "See below.")
            if (cleanS.length < 25) return false;
            // 2. Must not look like an address or title (mostly Uppercase)
            const upperCount = cleanS.replace(/[^A-Z]/g, "").length;
            if (upperCount > cleanS.length * 0.5) return false;
            // 3. Must not contain prohibited noise words
            if (cleanS.toLowerCase().includes('autonomous') ||
                cleanS.toLowerCase().includes('chennai-14') ||
                cleanS.match(/\d{6}/)) return false; // Pin codes

            return true;
        });

        // STAGE 3: DEFINITION SCORING
        // Prefer sentences with "is a", "refers to", "can be defined"
        const bestMatch = validSentences.sort((a, b) => {
            const scoreA = (a.includes(' is ') ? 2 : 0) + (a.includes(' defined ') ? 3 : 0);
            const scoreB = (b.includes(' is ') ? 2 : 0) + (b.includes(' defined ') ? 3 : 0);
            return scoreB - scoreA;
        })[0];

        if (bestMatch) {
            definitions[keyword] = bestMatch.trim();
        }
    });
    return definitions;
}

function getRandomKeywords(keywords: string[], exclude: string, count: number) {
    return keywords.filter(k => k !== exclude).sort(() => 0.5 - Math.random()).slice(0, count);
}

function shuffle(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
