import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { storage } from './services/storageService';

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

const slogans = [
    "Conceptual mastery is the foundation of Quizy excellence.",
    "Every Quizy session accelerates your professional growth.",
    "Analyze your patterns; Quizy reveals the path to perfection.",
    "Focus your mind. The sequence is the secret to Quizy success.",
    "Master the document. Conquer the Quizy."
];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userEmail = user.email;
        initQuiz();
    } else {
        window.location.href = 'login.html';
    }
});

async function initQuiz() {
    const params = new URLSearchParams(window.location.search);
    const quizId = params.get('id');

    const allQuizzes = await storage.getAll('quizzes');
    const bundle = quizId ? allQuizzes.find(q => q.id === quizId) : allQuizzes[0];

    if (!bundle) {
        alert("Quizy material not found. Returning to workspace.");
        window.location.href = 'dashboard.html';
        return;
    }

    // Pick random sequence if bundle exists
    if (bundle.sequences) {
        const randIdx = Math.floor(Math.random() * bundle.sequences.length);
        currentQuiz = {
            ...bundle.sequences[randIdx],
            id: bundle.id,
            title: `${bundle.title} (Seq ${randIdx + 1})`,
            settings: bundle.settings
        };
    } else {
        currentQuiz = bundle;
    }

    // Set Time Limit from settings
    timeRemaining = currentQuiz.settings?.timeLimit || 900;

    renderQuestion();
    startTimer();
}

function renderQuestion() {
    const q = currentQuiz.questions[currentQIdx];
    const textEl = document.getElementById('q-text');
    const container = document.getElementById('options-container');
    const nextBtn = document.getElementById('btn-next') as HTMLButtonElement;
    const currentEl = document.getElementById('q-current');
    const totalEl = document.getElementById('q-total');
    const progressEl = document.getElementById('progress-bar');

    if (!textEl || !container) return;

    container.innerHTML = "";
    nextBtn.disabled = true;

    if (currentEl) currentEl.textContent = (currentQIdx + 1).toString();
    if (totalEl) totalEl.textContent = currentQuiz.questions.length;
    if (progressEl) progressEl.style.width = `${((currentQIdx + 1) / currentQuiz.questions.length) * 100}%`;

    // Strict Rule: No Meta-talk. Start directly with the question.
    textEl.textContent = q.text;

    // Concept Visual Injection (Premium Feature)
    const visualContainer = document.getElementById('concept-visual');
    const visualImg = document.getElementById('concept-img') as HTMLImageElement;

    if (visualContainer && visualImg) {
        // Use a consistent definition image based on the question length
        const seed = q.text.length + currentQIdx;
        visualImg.src = `https://picsum.photos/seed/${seed}/800/240?grayscale&blur=1`;
        visualContainer.style.display = 'flex';
    }

    const labels = ["A", "B", "C", "D"];
    q.options.forEach((opt: string, idx: number) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<span style="font-weight: 700; margin-right: 12px;">${labels[idx]})</span> <span style="flex: 1;">${opt}</span>`;

        btn.onclick = () => {
            // Remove previous selection
            document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            nextBtn.disabled = false;

            // Temporary store for current question choice
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

async function finalizeQuiz() {
    clearInterval(timerInterval);
    if (!userEmail) return;

    const initialTime = currentQuiz.settings?.timeLimit || 900;
    const timeSpent = initialTime - timeRemaining;
    const finalScore = Math.round((userScore / currentQuiz.questions.length) * 100);

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
        timestamp: Date.now()
    });

    // Toggle Views
    document.getElementById('quiz-main')?.classList.add('hidden');
    document.getElementById('result-view')?.classList.remove('hidden');
    document.getElementById('final-score')!.textContent = `${finalScore}%`;
    document.getElementById('res-accuracy')!.textContent = `${userScore}/${currentQuiz.questions.length}`;
    document.getElementById('res-time')!.textContent = document.getElementById('timer')!.textContent;

    // Slogan rendering
    const sloganEl = document.getElementById('motive-slogan');
    if (sloganEl) sloganEl.textContent = slogans[Math.floor(Math.random() * slogans.length)];

    renderReviewList();
}

function renderReviewList() {
    const list = document.getElementById('review-list');
    if (!list) return;

    // Render Individual Review Items
    const reviewItems = userAnswers.map((ans, idx) => `
        <div class="review-item" style="padding: 24px; border-bottom: 1px solid var(--slate-border); border-left: 4px solid ${ans.isCorrect ? 'var(--green-success)' : 'var(--red-error)'}; margin-bottom: 24px;">
            <p style="font-weight: 700; font-size: 14px; margin-bottom: 12px; color: var(--slate-text);">SEQUENCE ${idx + 1} | TOPIC: ${ans.topic}</p>
            <p style="font-family: var(--font-serif); font-size: 18px; margin-bottom: 20px;">${ans.question}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                <div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--slate-text);">YOUR CHOICE</span>
                    <p style="font-size: 15px; color: ${ans.isCorrect ? 'var(--green-success)' : 'var(--red-error)'}; font-weight: 600;">${ans.choice}</p>
                </div>
                <div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--slate-text);">CORRECT RESPONSE</span>
                    <p style="font-size: 15px; color: var(--green-success); font-weight: 600;">${ans.correctAnswer}</p>
                </div>
            </div>

            <div style="background: var(--paper); padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid var(--slate-border);">
                <p style="font-size: 12px; font-weight: 800; margin-bottom: 8px; color: var(--blue-royal); letter-spacing: 0.5px;">${ans.isCorrect ? 'REINFORCEMENT LOGIC' : 'CORRECTIVE ANALYSIS'}</p>
                <div style="font-size: 14px; color: var(--slate-text); line-height: 1.7; white-space: pre-line;">${ans.explanation}</div>
            </div>
        </div>
    `).join('');

    // Mastery Pack Global Links
    const pack = currentQuiz.masteryPack;
    const masterySection = `
        <div style="margin-top: 64px; padding: 40px; background: var(--navy-deep); border-radius: 12px; color: white; text-align: center;">
            <h2 class="serif" style="margin-bottom: 16px;">Subject Mastery Pack</h2>
            <p style="color: rgba(255,255,255,0.7); margin-bottom: 32px;">Deepen your understanding of ${currentQuiz.subject} with these curated external resources.</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; text-align: left;">
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px;">
                    <h4 style="font-size: 13px; color: var(--blue-soft); margin-bottom: 12px;">📺 YOUTUBE TUTORIALS</h4>
                    ${pack.youtubeLinks.map((link: string, i: number) => `<a href="${link}" target="_blank" style="display: block; color: white; margin-bottom: 8px; font-size: 13px;">• Tutorial Sequence ${i + 1}</a>`).join('')}
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px;">
                    <h4 style="font-size: 13px; color: var(--blue-soft); margin-bottom: 12px;">📖 DEEP DIVE</h4>
                    <a href="${pack.wikipediaLink}" target="_blank" style="display: block; color: white; margin-bottom: 12px; font-size: 13px;">• Wikipedia Article Link</a>
                    <h4 style="font-size: 13px; color: var(--blue-soft); margin-bottom: 12px;">🔍 RESEARCH QUERY</h4>
                    <a href="${pack.searchQuery}" target="_blank" style="display: block; color: white; font-size: 13px;">• Execute Global Search</a>
                </div>
            </div>
        </div>
    `;

    list.innerHTML = reviewItems + masterySection;
}
