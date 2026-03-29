import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { storage } from './services/storageService';
import { showInfoModal } from './services/uiService';
import { checkAuth } from './services/sessionService';

/**
 * QuizMaster Pro | Dashboard Controller
 * Logic: Data Synthesis, Chart Rendering, Topic Analysis
 */

declare var Chart: any;

// 1. Universal Institutional Guard (v0.3)
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Instant Persona Rendering (v0.3)
    const cachedName = sessionStorage.getItem('displayName');
    const nameEl = document.getElementById('user-display-name');
    if (cachedName && nameEl) {
        nameEl.textContent = cachedName;
    }

    console.log("Institutional Node Verified:", sessionStorage.getItem('userEmail'));
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        initDashboard(user);
    } else {
        const userEmail = sessionStorage.getItem('userEmail');
        const displayName = sessionStorage.getItem('displayName');
        if (userEmail) {
            initDashboard({ email: userEmail, displayName: displayName || userEmail.split('@')[0] });
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
    renderRecentReviews(results);

    // 4. Interactivity & Event Listeners
    setupEventListeners(results);
}

function renderRecentReviews(results: any[]) {
    const container = document.getElementById('recent-reviews-container');
    if (!container) return;

    if (results.length === 0) return;

    // Get the top 3 most recent results
    const recent = [...results].reverse().slice(0, 3);
    
    container.innerHTML = recent.map(r => `
        <div style="background: rgba(15, 23, 42, 0.02); padding: 12px; border-radius: 8px; border: 1px solid rgba(15, 23, 42, 0.05); display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
                <p style="font-size: 13px; font-weight: 700; color: var(--navy-deep); margin-bottom: 2px;">${r.quizTitle.split(':')[1]?.trim() || 'General Resource'}</p>
                <p style="font-size: 11px; color: var(--slate-text);">${new Date(r.timestamp).toLocaleDateString()}</p>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 12px;">
                <div style="background: ${r.score >= 70 ? '#DCFCE7' : '#FEE2E2'}; color: ${r.score >= 70 ? '#166534' : '#991B1B'}; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 800;">${r.score}%</div>
                <a href="quiz.html?reviewId=${r.id}" class="btn btn-outline" style="padding: 4px 10px; font-size: 11px; border-color: var(--blue-royal); color: var(--blue-royal); background: transparent;">Review Log</a>
            </div>
        </div>
    `).join('');
}

function renderMetrics(results: any[]) {
    const total = results.length;
    const avg = total > 0 ? results.reduce((s, r) => s + r.score, 0) / total : 0;
    const totalTimeSec = results.reduce((s, r) => s + (r.timeSpentSeconds || 0), 0);
    const totalHours = (totalTimeSec / 3600).toFixed(1);

    const countEl = document.getElementById('count-quizzes');
    const accEl = document.getElementById('count-accuracy');
    const timeEl = document.getElementById('count-time');

    if (countEl) countEl.textContent = total.toString();
    if (accEl) accEl.textContent = `${Math.round(avg)}%`;
    if (timeEl) timeEl.textContent = `${totalHours}h`;

    // Update charts
    renderMasteryHeatmap(results);

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
    const handleLogout = () => {
        sessionStorage.removeItem('sovereign_session_email');
        sessionStorage.removeItem('sovereign_session_time');
        signOut(auth).then(() => window.location.href = 'index.html');
    };
    document.getElementById('btn-logout')?.addEventListener('click', handleLogout);
    document.getElementById('btn-logout-top')?.addEventListener('click', handleLogout);

    // Quick Action: Random Challenge
    document.getElementById('btn-random-challenge')?.addEventListener('click', async () => {
        const bundles = await storage.getAll('quizzes');
        if (bundles.length === 0) {
            await showInfoModal("Empty Archive", "No Quizy bundles found in your institutional archive. Please upload material first.", "🎲");
            return;
        }
        const randomBundle = bundles[Math.floor(Math.random() * bundles.length)];
        window.location.href = `quiz.html?id=${randomBundle.id}`;
    });

    // Quick Action: Review Mistakes
    document.getElementById('btn-review-mistakes')?.addEventListener('click', async () => {
        const lowScore = results.filter(r => r.score < 70);
        if (lowScore.length === 0) {
            await showInfoModal("Excellence Achieved", "Maximum proficiency maintained! No critical mistakes found to review at this time.", "⭐");
            return;
        }
        await showInfoModal("Remediation Required", `You have ${lowScore.length} sessions needing conceptual review. Visit 'My Quizzes' to re-take specific sequences.`, "🔬");
        window.location.href = 'my-quizzes.html';
    });

    // Export Data
    document.getElementById('btn-export-data')?.addEventListener('click', async () => {
        if (results.length === 0) return await showInfoModal("No Data", "No performance records available for protocol export.", "📤");
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
    document.getElementById('btn-notifications')?.addEventListener('click', async () => {
        await showInfoModal("All Clear", "You're all caught up! No pending alerts or security protocols needing attention.", "🔔");
    });

    // Navigation Logic



    // Settings Modal Logic
    const modal = document.getElementById('settings-modal');
    const openSettings = async () => {
        if (modal) {
            modal.style.display = 'flex';
            
            const currentUser = auth.currentUser;
            const sovEmail = sessionStorage.getItem('userEmail');
            const sovName = sessionStorage.getItem('displayName');

            (document.getElementById('setting-email') as HTMLInputElement).value = currentUser?.email || sovEmail || 'Guest Mode';
            (document.getElementById('setting-name') as HTMLInputElement).value = currentUser?.displayName || sovName || 'Guest';

            // Biometric Identity Sync (v0.3)
            const biometricEl = document.getElementById('biometric-status');
            if (biometricEl) {
                const faceData = await storage.getAll('faceData');
                const hasProfile = faceData.length > 0;
                biometricEl.textContent = hasProfile ? 'Biometric Identity: Active & Secure' : 'Biometric Identity: No Enrollment Found';
                biometricEl.style.color = hasProfile ? 'var(--green-success)' : 'var(--slate-text)';
            }
        }
    };

    document.getElementById('nav-account-settings')?.addEventListener('click', (e) => {
        e.preventDefault();
        openSettings();
    });


    document.getElementById('btn-help')?.addEventListener('click', async () => {
        await showInfoModal("Institutional Support", "Need assistance? Access our 24/7 technical team at protocols@quizy.pro or review the documentation in the Archive Library.", "🔭");
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

function renderMasteryHeatmap(results: any[]) {
    const canvas = document.getElementById('mastery-heatmap') as HTMLCanvasElement;
    if (!canvas) return;

    // Aggregate Topics
    const topicMap: Record<string, { total: number, count: number }> = {};
    results.forEach(r => {
        const topic = r.topic || 'General';
        if (!topicMap[topic]) topicMap[topic] = { total: 0, count: 0 };
        topicMap[topic].total += r.score;
        topicMap[topic].count++;
    });

    const labels = Object.keys(topicMap);
    const dataPoints = labels.map(l => Math.round(topicMap[l].total / topicMap[l].count));

    if (labels.length === 0) return;
    
    // Ensure enough axes for radar
    const finalLabels = [...labels];
    const finalData = [...dataPoints];
    if (finalLabels.length < 3) {
        finalLabels.push("Standard Domain", "Institutional Vector");
        finalData.push(0, 0);
    }

    new (window as any).Chart(canvas, {
        type: 'radar',
        data: {
            labels: finalLabels,
            datasets: [{
                label: 'Subject Mastery Index',
                data: finalData,
                backgroundColor: 'rgba(37, 99, 235, 0.15)',
                borderColor: 'rgba(37, 99, 235, 0.8)',
                pointBackgroundColor: 'rgba(37, 99, 235, 1)',
                pointBorderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: 'rgba(15, 23, 42, 0.05)' },
                    grid: { color: 'rgba(15, 23, 42, 0.05)' },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    pointLabels: { font: { weight: 'bold', size: 10 } }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
