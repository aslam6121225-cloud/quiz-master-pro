import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { storage } from './services/storageService';

/**
 * QuizMaster Pro | Dashboard Controller
 * Logic: Data Synthesis, Chart Rendering, Topic Analysis
 */

declare var Chart: any;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        initDashboard(user);
    } else {
        // Fallback: Check for Sovereign Session (Face Login)
        const sovEmail = sessionStorage.getItem('sovereign_session_email');
        const sovTime = sessionStorage.getItem('sovereign_session_time');
        const isRecent = sovTime && (Date.now() - parseInt(sovTime)) < 3600000; // 1hr pulse

        if (sovEmail && isRecent) {
            initDashboard({ email: sovEmail, displayName: sovEmail.split('@')[0] });
        } else {
            window.location.href = 'login.html';
        }
    }
});

async function initDashboard(user: any) {
    // 1. UI Updates
    const nameEl = document.getElementById('user-display-name');
    const greetingEl = document.getElementById('greeting');
    const avatarEl = document.getElementById('avatar-initials');
    const dateEl = document.getElementById('current-date');

    if (nameEl) nameEl.textContent = user.displayName || 'Professional User';
    if (greetingEl) {
        const hour = new Date().getHours();
        let timeGreeting = 'Good morning';
        if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
        else if (hour >= 17) timeGreeting = 'Good evening';

        greetingEl.textContent = `${timeGreeting}, ${user.displayName?.split(' ')[0] || 'Member'}`;
    }
    if (avatarEl && user.displayName) {
        avatarEl.textContent = user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
    }
    if (dateEl) {
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // 2. Data Retrieval (Strictly User-Only via storage check + post-filter)
    const allResults = await storage.getResultsForUser(user.email);
    const results = allResults.filter(r => r.userEmail === user.email);

    // 3. Render Views
    // Sort results by timestamp (newest last for chart, but we want newest for stats)
    results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    renderMetrics(results);
    renderPerformanceChart(results);
    renderTopicPerformance(results);

    // 4. Interactivity & Event Listeners
    setupEventListeners(results);
}

function renderMetrics(results: any[]) {
    const total = results.length;
    const avg = total > 0 ? results.reduce((s, r) => s + r.score, 0) / total : 0;
    const totalTimeRaw = results.reduce((s, r) => s + (r.timeSpentSeconds || 0), 0);
    const totalHours = (totalTimeRaw / 3600).toFixed(1);

    updateText('count-quizzes', total.toString());
    updateText('count-accuracy', `${avg.toFixed(1)}%`);
    updateText('count-time', `${totalHours}h`);

    // Last Quiz Logic
    const lastResult = results.length > 0 ? results[results.length - 1] : null;
    if (lastResult) {
        updateText('last-quiz-score', `${lastResult.score}%`);
        updateText('last-quiz-topic', lastResult.topic || 'General Knowledge');
    } else {
        updateText('last-quiz-score', '-');
        updateText('last-quiz-topic', 'No quizzes taken');
    }
}

function setupEventListeners(results: any[]) {
    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', () => {
        sessionStorage.removeItem('sovereign_session_email');
        sessionStorage.removeItem('sovereign_session_time');
        signOut(auth).then(() => window.location.href = 'index.html');
    });

    // Quick Action: Random Challenge
    document.getElementById('btn-random-challenge')?.addEventListener('click', async () => {
        const bundles = await storage.getAll('quizzes');
        if (bundles.length === 0) {
            alert("No Quizy bundles found. Upload something first!");
            return;
        }
        const randomBundle = bundles[Math.floor(Math.random() * bundles.length)];
        window.location.href = `quiz.html?id=${randomBundle.id}`;
    });

    // Quick Action: Review Mistakes
    document.getElementById('btn-review-mistakes')?.addEventListener('click', () => {
        const lowScore = results.filter(r => r.score < 70);
        if (lowScore.length === 0) {
            alert("Excellence maintained! No critical mistakes found to review.");
            return;
        }
        alert(`You have ${lowScore.length} sessions needing review. Visit 'My Quizzes' to re-take specific sequences.`);
        window.location.href = 'my-quizzes.html';
    });

    // Export Data
    document.getElementById('btn-export-data')?.addEventListener('click', () => {
        if (results.length === 0) return alert("No data to export.");
        const csv = "Date,Topic,Score,Time\n" + results.map(r =>
            `${new Date(r.timestamp).toLocaleDateString()},${r.topic},${r.score},${r.timeSpentSeconds}`
        ).join("\n");
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quizy_performance_${Date.now()}.csv`;
        a.click();
    });

    // Notifications Logic
    document.getElementById('btn-notifications')?.addEventListener('click', () => {
        alert("You're all caught up! No pending alerts.");
    });

    // Navigation Logic
    const performanceSection = document.querySelector('.performance-section');
    document.getElementById('nav-analytics')?.addEventListener('click', (e) => {
        e.preventDefault();
        performanceSection?.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('nav-achievements')?.addEventListener('click', (e) => {
        e.preventDefault();
        // Since we don't have a dedicated achievements section yet, scroll to metrics
        document.querySelector('.metrics-grid')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Settings Modal Logic
    const modal = document.getElementById('settings-modal');
    const openSettings = () => {
        if (modal) {
            modal.style.display = 'flex';
            // Populate Data
            const currentUser = auth.currentUser;
            const sovEmail = sessionStorage.getItem('sovereign_session_email');

            (document.getElementById('setting-email') as HTMLInputElement).value = currentUser?.email || sovEmail || 'Guest Mode';
            (document.getElementById('setting-name') as HTMLInputElement).value = currentUser?.displayName || sovEmail?.split('@')[0] || 'Guest';
        }
    };

    ['nav-settings', 'nav-profile'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.preventDefault();
            openSettings();
        });
    });

    document.getElementById('btn-help')?.addEventListener('click', () => {
        alert("Need assistance? Contact our support team at support@quizy.pro or check the documentation in the Library.");
    });

    document.getElementById('close-settings')?.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
    });

    // Close on outside click
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
}


function renderPerformanceChart(results: any[]) {
    const ctx = (document.getElementById('performance-chart') as HTMLCanvasElement)?.getContext('2d');
    if (!ctx) return;

    // Group by date
    const last30Days = results.slice(-30);
    const labels = last30Days.map(r => new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const scores = last30Days.map(r => r.score);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['Feb 1'],
            datasets: [{
                label: 'Quiz Scores',
                data: scores.length > 0 ? scores : [0],
                borderColor: '#1E40AF',
                backgroundColor: 'rgba(30, 64, 175, 0.05)',
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#FFF',
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: '#F1F5F9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderTopicPerformance(results: any[]) {
    const topicStats: Record<string, { total: number, scoreSum: number }> = {};

    results.forEach(r => {
        const topic = r.topic || 'General';
        if (!topicStats[topic]) topicStats[topic] = { total: 0, scoreSum: 0 };
        topicStats[topic].total++;
        topicStats[topic].scoreSum += r.score;
    });

    const topics = Object.entries(topicStats).map(([name, stat]) => ({
        name,
        accuracy: stat.scoreSum / stat.total,
        count: stat.total
    })).sort((a, b) => b.accuracy - a.accuracy);

    const container = document.getElementById('topic-container');
    const quoteContainer = document.getElementById('quote-container');
    if (!container) return;

    // Premium Topic Cards
    container.innerHTML = topics.slice(0, 5).map(t => {
        let level = 'Novice';
        let color = 'var(--slate-text)';
        if (t.accuracy > 90) { level = 'Master'; color = 'var(--purple-mastery)'; }
        else if (t.accuracy > 75) { level = 'Advanced'; color = 'var(--blue-royal)'; }
        else if (t.accuracy > 50) { level = 'Intermediate'; color = 'var(--green-success)'; }

        return `
        <div class="topic-item" style="border-left: 4px solid ${color}; padding-left: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div>
                    <span style="font-weight: 700; font-size: 15px; color: var(--navy-deep); display: block;">${t.name}</span>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: ${color}; font-weight: 700;">${level}</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 18px; font-weight: 700; color: var(--navy-deep);">${Math.round(t.accuracy)}%</span>
                </div>
            </div>
            <div class="progress-bar-bg" style="height: 8px; background: #F1F5F9; border-radius: 4px; margin: 0;">
                <div class="progress-fill" style="width: ${t.accuracy}%; background: ${color}; border-radius: 4px;"></div>
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: var(--slate-text); text-align: right;">
                ${t.count} Sessions Completed
            </div>
        </div>
    `}).join('');

    // Daily Inspiration Logic
    if (quoteContainer) {
        const quotes = [
            { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
            { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
            { text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X" },
            { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
            { text: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden" },
            { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
            { text: "There is no substitute for hard work.", author: "Thomas Edison" },
            { text: "Strive for progress, not perfection.", author: "Unknown" },
            { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
            { text: "He who learns but does not think, is lost! He who thinks but does not learn is in great danger.", author: "Confucius" }
        ];

        // Pick a random quote based on the day of the year to keep it "Daily" (or just random for now as per "every time login" request)
        // User asked: "every time to login give some motive slogan" -> Random is better.
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

        quoteContainer.innerHTML = `
            <div style="text-align: center; padding: 10px;">
                <p style="font-size: 18px; font-weight: 500; font-style: italic; color: #78350F; line-height: 1.6; margin-bottom: 16px;">
                    "${randomQuote.text}"
                </p>
                <p style="font-size: 13px; font-weight: 700; color: #92400E; text-transform: uppercase; letter-spacing: 0.1em;">
                    — ${randomQuote.author}
                </p>
            </div>
        `;
    }
}

function updateText(id: string, text: string) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
