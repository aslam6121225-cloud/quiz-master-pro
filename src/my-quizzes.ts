import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { storage } from './services/storageService';
import { showConfirmModal } from './services/uiService';
import { checkAuth } from './services/sessionService';

// ─── DATA REPOSITORY (CLIENT-SIDE ARCHIVE) ────────────────────
const QuizArchive = {
    getAll: async () => {
        const quizzes = await storage.getAll('quizzes');
        return quizzes.sort((a: any, b: any) => b.timestamp - a.timestamp);
    },
    remove: async (id: string) => {
        await storage.delete('quizzes', id);
        window.location.reload();
    }
};

// 1. Universal Institutional Guard (v0.3)
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Instant Persona Rendering (v0.3)
    const cachedName = sessionStorage.getItem('displayName');
    const nameEl = document.getElementById('user-display-name');
    if (cachedName && nameEl) {
        nameEl.textContent = cachedName;
    }
});

onAuthStateChanged(auth, async (user) => {
    const displayName = sessionStorage.getItem('displayName');
    const userEmail = sessionStorage.getItem('userEmail');

    const handleAuth = async (name: string) => {
        const nameEl = document.getElementById('user-display-name');
        if (nameEl) nameEl.textContent = name || 'Learner';
        await renderQuizArchive();
    };

    if (user) {
        await handleAuth(user.displayName || 'Professional User');
    } else {
        if (userEmail) {
            await handleAuth(displayName || userEmail.split('@')[0]);
        }
    }
});

async function renderQuizArchive() {
    const container = document.getElementById('quizzes-container');
    if (!container) return;

    container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 48px;">Loading Archive...</td></tr>';
    
    const quizzes = await QuizArchive.getAll();

    if (quizzes.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 48px; color: var(--grey-500); font-style: italic;">No diagnostic assessments found in the institutional archive.</td></tr>';
        return;
    }

    container.innerHTML = quizzes.map((q: any) => `
        <tr>
            <td style="font-weight: 500; color: var(--grey-900);">${q.title || 'Untitled Assessment'}</td>
            <td style="color: var(--grey-600);">${q.subject || 'General Domain'}</td>
            <td style="color: var(--grey-600);">${q.questions ? q.questions.length : 0} Items</td>
            <td style="color: var(--grey-400); font-size: 13px;">${new Date(q.timestamp).toLocaleDateString()}</td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 16px; justify-content: flex-end;">
                    <a href="quiz.html?id=${q.id}&mode=revisit_weak" style="color: #7C3AED; font-weight: 600; font-size: 13px; text-decoration: none;">Re-take Weak Areas</a>
                    <a href="quiz.html?id=${q.id}&mode=review" style="color: #2563EB; font-weight: 600; font-size: 13px; text-decoration: none;">Review Logic</a>
                    <a href="quiz.html?id=${q.id}" style="color: var(--accent); font-weight: 600; font-size: 13px; text-decoration: none;">Start Diagnostic</a>
                    <button class="delete-trigger" data-id="${q.id}" style="background: none; border: none; color: #B91C1C; cursor: pointer; font-size: 13px; font-weight: 500;">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');

    // Attach delete listeners
    document.querySelectorAll('.delete-trigger').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = (e.currentTarget as HTMLElement).dataset.id;
            if (id) {
                const confirmed = await showConfirmModal(
                    "Permanent Deletion",
                    "Are you certain you wish to remove this assessment from the permanent archive? This action cannot be reversed.",
                    "🗑️"
                );
                if (confirmed) {
                    await QuizArchive.remove(id);
                }
            }
        });
    });
}
