import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// ─── DATA REPOSITORY (CLIENT-SIDE ARCHIVE) ────────────────────
const QuizArchive = {
    getAll: () => {
        const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
        return quizzes.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    remove: (id: string) => {
        const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
        const filtered = quizzes.filter((q: any) => q.id !== id);
        localStorage.setItem('quizzes', JSON.stringify(filtered));
        window.location.reload();
    }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        const nameEl = document.getElementById('user-display-name');
        if (nameEl) nameEl.textContent = user.displayName || 'Learner';
        renderQuizArchive();
    } else {
        window.location.href = 'login.html';
    }
});

function renderQuizArchive() {
    const container = document.getElementById('quizzes-container');
    if (!container) return;

    const quizzes = QuizArchive.getAll();

    if (quizzes.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 48px; color: var(--grey-500); font-style: italic;">No diagnostic assessments found in the institutional archive.</td></tr>';
        return;
    }

    container.innerHTML = quizzes.map((q: any) => `
        <tr>
            <td style="font-weight: 500; color: var(--grey-900);">${q.title}</td>
            <td style="color: var(--grey-600);">${q.questions[0]?.topic || 'General Domain'}</td>
            <td style="color: var(--grey-600);">${q.questions.length} Items</td>
            <td style="color: var(--grey-400); font-size: 13px;">${new Date(q.createdAt).toLocaleDateString()}</td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 16px; justify-content: flex-end;">
                    <a href="quiz.html?id=${q.id}" style="color: var(--accent); font-weight: 600; font-size: 13px; text-decoration: none;">Open Assessment</a>
                    <button class="delete-trigger" data-id="${q.id}" style="background: none; border: none; color: #B91C1C; cursor: pointer; font-size: 13px; font-weight: 500;">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');

    // Attach delete listeners
    document.querySelectorAll('.delete-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLElement).dataset.id;
            if (id && confirm('Are you certain you wish to remove this assessment from the permanent archive?')) {
                QuizArchive.remove(id);
            }
        });
    });
}
