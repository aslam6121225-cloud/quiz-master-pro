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

    currentQuiz.questions = currentQuiz.questions.map((q: any) => ({
        ...q,
        options: shuffle([...q.options])
    }));

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

    // Anti-Cheating: Dynamic Prefixing
    const prefixes = ["Analysis: ", "Objective: ", "Inquiry: ", "Conceptual Node: "];
    textEl.textContent = prefixes[currentQIdx % 4] + q.question;

    q.options.forEach((opt: string) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
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

    const isCorrect = choice === q.answer;
    if (isCorrect) userScore++;

    userAnswers.push({
        question: q.question,
        choice,
        correctAnswer: q.answer,
        isCorrect,
        topic: q.topic,
        explanation: q.explanation,
        resources: q.resources
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
        topic: currentQuiz.questions[0].topic,
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

    list.innerHTML = userAnswers.map((ans, idx) => `
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
                <p style="font-size: 12px; font-weight: 800; margin-bottom: 8px; color: var(--blue-royal); letter-spacing: 0.5px;">DEEP CONCEPTUAL ANALYSIS</p>
                <div style="font-size: 14px; color: var(--slate-text); line-height: 1.7; white-space: pre-line;">${ans.explanation}</div>
            </div>

            <div style="display: flex; gap: 20px; flex-wrap: wrap; padding-top: 12px; border-top: 1px dashed var(--slate-border);">
                <a href="${ans.resources?.wikipedia || '#'}" target="_blank" style="font-size: 12px; font-weight: 700; color: var(--blue-royal);">📖 WIKIPEDIA REF</a>
                <a href="${ans.resources?.youtube || '#'}" target="_blank" style="font-size: 12px; font-weight: 700; color: var(--blue-royal);">📺 VIDEO ANALYSIS</a>
                <a href="${ans.resources?.google || '#'}" target="_blank" style="font-size: 12px; font-weight: 700; color: var(--blue-royal);">🔗 GOOGLE DEEP-DIVE</a>
            </div>
        </div>
    `).join('');
}

function shuffle(array: any[]) {
    let m = array.length, t, i;
    while (m) {
        i = Math.floor(Math.random() * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
}
