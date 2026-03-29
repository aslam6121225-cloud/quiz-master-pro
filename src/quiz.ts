import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { storage } from './services/storageService';
import { generateQuizFromText } from './services/aiService';
import { showConfirmModal, showInfoModal } from './services/uiService';
import { faceService } from './services/faceService';
import { checkAuth } from './services/sessionService';

/**
 * QuizMaster Pro | Institutional Quiz Engine (v2)
 * Logic: Deferred Feedback, Detailed Remediation, Motivational Metrics
 */

let currentQuiz: any = null;
let currentQIdx = 0;
let userScore = 0;
let timeRemaining = 900;
let timerInterval: any = null;
let userAnswers: any[] = [];
let userEmail: string | null = null;
let focusViolations = 0;
let heartbeatInterval: any = null;
let heartbeatFailures = 0;

const slogans = [
    "Conceptual mastery is the foundation of Quizy excellence.",
    "Every Quizy session accelerates your professional growth.",
    "Analyze your patterns; Quizy reveals the path to perfection.",
    "Focus your mind. The sequence is the secret to Quizy success.",
    "Master the document. Conquer the Quizy."
];

// 1. FOCUS-LOCK PROTOCOL (Tab Protection)
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
        focusViolations++;
        // Pause timer if user is not on tab
        clearInterval(timerInterval);
        await showInfoModal(
            "Security Alert", 
            "Focus violation detected. Please remain on the assessment tab. Multiple violations have been logged for institutional review.", 
            "⚠️"
        );
        startTimer(); // Resume upon return
    }
});

// Exit Assessment Sequence
document.getElementById('btn-exit')?.addEventListener('click', async () => {
    const confirmed = await showConfirmModal(
        "Terminate Assessment?",
        "Your current conceptual progress will be saved, but the session will be archived immediately. Proceed?",
        "🚪"
    );
    if (confirmed) {
        finalizeQuiz(true); // Forced termination
        window.location.href = 'dashboard.html';
    }
});

// 1. Universal Institutional Guard (v0.3)
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    console.log("Assessment Node Verified:", sessionStorage.getItem('userEmail'));
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userEmail = user.email;
        initQuiz();
    }
});

async function initQuiz() {
    const params = new URLSearchParams(window.location.search);
    const quizId = params.get('id');
    const reviewId = params.get('reviewId');

    // Handle Direct Review Mode (v0.3)
    if (reviewId) {
        const results = await storage.getAll('results');
        const pastResult = results.find(r => r.id === reviewId);
        if (pastResult) {
            userAnswers = pastResult.answers;
            document.getElementById('quiz-main')?.classList.add('hidden');
            document.getElementById('review-view')?.classList.remove('hidden');
            renderReviewMode();
            return;
        }
    }

    // Handle Direct Library Review Mode (v0.3)
    if (params.get('mode') === 'review' && quizId) {
        const bundle = (await storage.getAll('quizzes')).find(q => q.id === quizId);
        if (bundle) {
            userAnswers = bundle.questions.map((q: any) => ({
                question: q.text,
                choice: q.options[q.correctAnswer],
                correctAnswer: q.options[q.correctAnswer],
                isCorrect: true,
                topic: bundle.subject,
                rationale: q.rationale || "Conceptual analysis is being established for this segment."
            }));
            document.getElementById('quiz-main')?.classList.add('hidden');
            document.getElementById('review-view')?.classList.remove('hidden');
            renderReviewMode();
            return;
        }
    }

    // Handle Remedial Re-take Mode (v0.3)
    if (params.get('mode') === 'revisit_weak' && quizId) {
        const results = await storage.getAll('results');
        const pastResults = results.filter(r => r.quizId === quizId).sort((a,b) => b.timestamp - a.timestamp);
        const lastResult = pastResults[0];

        if (lastResult) {
            const weakTopics = lastResult.answers.filter((a: any) => !a.isCorrect).map((a: any) => a.topic);
            const uniqueWeak = Array.from(new Set(weakTopics)) as string[];

            if (uniqueWeak.length > 0) {
                // Trigger AI Remedial Generation
                await showInfoModal("Remedial Protocol", `Initializing targeted generation for previously identified weak areas: ${uniqueWeak.slice(0,2).join(', ')}...`, "🤖");
                const bundle = (await storage.getAll('quizzes')).find(q => q.id === quizId);
                const pdfRecord = await storage.get('pdfs', bundle.docId);
                
                const freshBundle = await generateQuizFromText(pdfRecord.text, pdfRecord.name, 5, 'mixed', uniqueWeak);
                currentQuiz = freshBundle;
                currentQuiz.id = quizId;
                renderQuestion();
                startTimer();
                return;
            }
        }
    }

    const allQuizzes = await storage.getAll('quizzes');
    const bundle = quizId ? allQuizzes.find(q => q.id === quizId) : null;

    if (!bundle) {
        await showInfoModal("Access Protocol Error", "Quizy material not found or invalid URL. Returning to archive.", "⚠️");
        window.location.href = 'my-quizzes.html';
        return;
    }

    currentQuiz = (bundle.sequences) ? {
        ...JSON.parse(JSON.stringify(bundle.sequences[Math.floor(Math.random() * bundle.sequences.length)])),
        id: bundle.id,
        title: bundle.title,
        settings: bundle.settings
    } : JSON.parse(JSON.stringify(bundle));

    if (currentQuiz && currentQuiz.questions) {
        currentQuiz.questions.sort(() => 0.5 - Math.random());
        currentQuiz.questions.forEach((q: any) => {
            const correctText = q.options[q.correctAnswer];
            q.options.sort(() => 0.5 - Math.random());
            q.correctAnswer = q.options.indexOf(correctText);
        });
    }

    timeRemaining = currentQuiz.settings?.timeLimit || 900;
    renderQuestion();
    startTimer();
    startProctoringHeartbeat();
}

// 2. BIOMETRIC HEARTBEAT (Heartbeat Protocol)
async function startProctoringHeartbeat() {
    try {
        const video = document.getElementById('proctor-video') as HTMLVideoElement;
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        video.srcObject = stream;
        
        await faceService.loadModels(() => {});
        
        heartbeatInterval = setInterval(async () => {
            const analysis = await faceService.analyzeFrame(video);
            if (!analysis || analysis.status === 'NO_TARGET') {
                heartbeatFailures++;
                if (heartbeatFailures >= 2) {
                    await showInfoModal("Biometric Alert", "User missing or identity unverified. Please remain in view of the camera.", "👁️");
                    heartbeatFailures = 0; 
                }
            } else {
                heartbeatFailures = 0;
            }
        }, 10000); // 10s Heartbeat
    } catch (err) {
        console.warn("Proctoring Heartbeat Initialization Failed (Check camera permissions)");
    }
}

function renderQuestion() {
    const q = currentQuiz.questions[currentQIdx];
    const textEl = document.getElementById('q-text');
    const container = document.getElementById('options-container');
    const nextBtn = document.getElementById('btn-next') as HTMLButtonElement;
    const currentEl = document.getElementById('q-current');
    const progressEl = document.getElementById('progress-bar');

    if (!textEl || !container) return;
    container.innerHTML = "";
    nextBtn.disabled = true;

    if (currentEl) currentEl.textContent = (currentQIdx + 1).toString();
    if (progressEl) progressEl.style.width = `${((currentQIdx + 1) / currentQuiz.questions.length) * 100}%`;

    textEl.textContent = q.text;



    const labels = ["A", "B", "C", "D"];
    q.options.forEach((opt: string, idx: number) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<span style="font-weight: 700; margin-right: 12px;">${labels[idx]})</span> <span style="flex: 1;">${opt}</span>`;
        btn.onclick = () => {
            document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            nextBtn.disabled = false;
            (btn as any)._choice = opt;
        };
        container.appendChild(btn);
    });
}

document.getElementById('btn-next')?.addEventListener('click', () => {
    const selectedBtn = document.querySelector('.option-btn.selected') as any;
    const choice = selectedBtn?._choice;
    const q = currentQuiz.questions[currentQIdx];
    const correctOptionText = q.options[q.correctAnswer];
    const isCorrect = choice === correctOptionText;
    if (isCorrect) userScore++;

    userAnswers.push({
        question: q.text,
        choice,
        correctAnswer: correctOptionText,
        isCorrect,
        topic: currentQuiz.subject,
        explanation: isCorrect ? q.reinforcement : q.explanation,
        rationale: q.rationale,
        resources: currentQuiz.masteryPack
    });

    if (currentQIdx < currentQuiz.questions.length - 1) {
        currentQIdx++;
        renderQuestion();
    } else {
        finalizeQuiz();
    }
});

function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerUI();
        if (timeRemaining <= 0) finalizeQuiz();
    }, 1000);
}

function updateTimerUI() {
    const min = Math.floor(timeRemaining / 60);
    const sec = timeRemaining % 60;
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

async function finalizeQuiz(isForced = false) {
    clearInterval(timerInterval);
    clearInterval(heartbeatInterval);
    if (!userEmail) return;

    const initialTime = currentQuiz.settings?.timeLimit || 900;
    const timeSpent = initialTime - timeRemaining;
    const finalScore = (userAnswers.length > 0) ? Math.round((userScore / currentQuiz.questions.length) * 100) : 0;
    
    const integrityLevel = Math.max(0, 100 - (focusViolations * 10));

    await storage.save('results', {
        id: Date.now().toString(),
        quizId: currentQuiz.id,
        quizTitle: currentQuiz.title,
        userEmail: userEmail,
        score: finalScore,
        correctCount: userScore,
        totalCount: currentQuiz.questions.length,
        timeSpentSeconds: timeSpent,
        topic: currentQuiz.subject || 'General Domain',
        answers: userAnswers,
        violations: focusViolations,
        integrityLevel: integrityLevel,
        isTerminated: isForced,
        timestamp: Date.now()
    });

    if (!isForced) {
        document.getElementById('quiz-main')?.classList.add('hidden');
        document.getElementById('result-view')?.classList.remove('hidden');
        document.getElementById('final-score')!.textContent = `${finalScore}%`;
        document.getElementById('res-accuracy')!.textContent = `${userScore}/${currentQuiz.questions.length}`;
        document.getElementById('res-violations')!.textContent = focusViolations.toString();
        document.getElementById('res-integrity')!.textContent = `${integrityLevel}%`;
        document.getElementById('res-time')!.textContent = document.getElementById('timer')!.textContent;

        const sloganEl = document.getElementById('motive-slogan');
        if (sloganEl) sloganEl.textContent = slogans[Math.floor(Math.random() * slogans.length)];

        renderReviewMode();
    }
}

document.getElementById('btn-review')?.addEventListener('click', () => {
    document.getElementById('result-view')?.classList.add('hidden');
    document.getElementById('review-view')?.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('btn-review-close')?.addEventListener('click', () => {
    document.getElementById('review-view')?.classList.add('hidden');
    document.getElementById('result-view')?.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

function renderReviewMode() {
    const container = document.getElementById('review-cards-container');
    if (!container) return;

    container.innerHTML = userAnswers.map((ans, idx) => `
        <div class="review-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <span style="font-size: 11px; font-weight: 800; color: var(--blue-royal); letter-spacing: 0.1em; text-transform: uppercase;">SEQUENCE ${idx + 1} | TOPIC: ${ans.topic || 'Diagnostic'}</span>
                <span class="status-badge ${ans.isCorrect ? 'status-correct' : 'status-incorrect'}">${ans.isCorrect ? 'Correct' : 'Incorrect'}</span>
            </div>

            <h3 style="font-family: var(--font-serif); font-size: 20px; line-height: 1.5; margin-bottom: 24px; color: var(--navy-deep);">${ans.question}</h3>

            <!-- Response Matrix (v0.3) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
                <div style="background: rgba(15, 23, 42, 0.02); padding: 16px; border-radius: 12px; border: 1px solid rgba(15, 23, 42, 0.05);">
                    <p style="font-size: 10px; font-weight: 800; color: var(--slate-text); text-transform: uppercase; margin-bottom: 4px;">Your Choice</p>
                    <p style="font-weight: 700; color: ${ans.isCorrect ? 'var(--green-success)' : 'var(--red-error)'};">${ans.choice || 'Incomplete Sequence'}</p>
                </div>
                <div style="background: rgba(15, 23, 42, 0.02); padding: 16px; border-radius: 12px; border: 1px solid rgba(15, 23, 42, 0.05);">
                    <p style="font-size: 10px; font-weight: 800; color: var(--slate-text); text-transform: uppercase; margin-bottom: 4px;">Correct Institutional Response</p>
                    <p style="font-weight: 700; color: var(--green-success);">${ans.correctAnswer}</p>
                </div>
            </div>

            <!-- Concept Insight Layer (v0.3) -->
            <div style="background: rgba(124, 58, 237, 0.03); border-left: 4px solid var(--purple-mastery); padding: 24px; border-radius: 0 12px 12px 0;">
                <div class="insight-header" style="margin-top: 0; padding-top: 0; border-top: none; color: var(--purple-mastery); border-bottom: 1px solid rgba(124, 58, 237, 0.1); padding-bottom: 12px; margin-bottom: 16px;">
                    <div class="pulse-dot" style="background: var(--purple-mastery);"></div>
                    Concept Insight
                </div>
                <p style="font-size: 14px; line-height: 1.7; color: var(--slate-text);">${ans.rationale || 'AI Rationale Sync in progress...'}</p>
            </div>
        </div>
    `).join('');
}

(window as any).retakeQuiz = async function () {
    const overlay = document.getElementById('retake-overlay');
    const statusEl = document.getElementById('retake-status');
    if (overlay) overlay.style.display = 'flex';
    if (statusEl) statusEl.textContent = '🔍 Fetching your original document...';

    try {
        const bundle = await storage.get('quizzes', currentQuiz.id);
        const pdfRecord = await storage.get('pdfs', bundle.docId);
        if (!pdfRecord || !pdfRecord.text) throw new Error('Original text not found');

        if (statusEl) statusEl.textContent = '🤖 Generating brand new questions with Gemini AI...';
        const freshBundle = await generateQuizFromText(pdfRecord.text, pdfRecord.name);

        if (statusEl) statusEl.textContent = '💾 Saving your new diagnostic...';
        await storage.save('quizzes', {
            ...bundle,
            questions: freshBundle.questions,
            subject: freshBundle.subject,
            masteryPack: freshBundle.masteryPack,
            timestamp: Date.now()
        });

        location.reload();
    } catch (err: any) {
        console.error('Retake failed:', err);
        if (overlay) overlay.style.display = 'none';
        await showInfoModal("Regeneration Error", `Could not regenerate: ${err.message}`, "⚠️");
    }
};
