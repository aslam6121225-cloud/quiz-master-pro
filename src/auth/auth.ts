import { auth, db } from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

/**
 * QuizMaster Pro | Core Auth Controller
 * Handling Email/Password, Registration, and Tab Switching
 */

const tabs = document.querySelectorAll('.auth-tab');
const contentSections = document.querySelectorAll('.auth-content');
const loginForm = document.getElementById('form-login') as HTMLFormElement;
const registerForm = document.getElementById('form-register') as HTMLFormElement;
const errorEl = document.getElementById('auth-error');

// 1. Tab Switching Logic
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');

        // Update Tabs
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update Sections
        contentSections.forEach(section => {
            section.classList.add('hidden');
            if (section.id === `tab-${target}`) {
                section.classList.remove('hidden');
            }
        });

        // Reset Face Login if switching tabs
        if (target !== 'face') {
            (document.getElementById('btn-face-reset') as HTMLButtonElement)?.click();
        }

        if (errorEl) errorEl.classList.add('hidden');
    });
});

// 2. Email Login Operation
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('login-email') as HTMLInputElement).value;
    const password = (document.getElementById('login-password') as HTMLInputElement).value;
    const btn = document.getElementById('btn-login-submit') as HTMLButtonElement;

    try {
        setLoading(btn, true);
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'dashboard.html';
    } catch (err: any) {
        showError(err.message);
        setLoading(btn, false);
    }
});

// 3. Institutional Registration
registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (document.getElementById('reg-name') as HTMLInputElement).value;
    const email = (document.getElementById('reg-email') as HTMLInputElement).value;
    const password = (document.getElementById('reg-password') as HTMLInputElement).value;
    const btn = document.getElementById('btn-register-submit') as HTMLButtonElement;

    try {
        setLoading(btn, true);
        const { user } = await createUserWithEmailAndPassword(auth, email, password);

        // Set Profile
        await updateProfile(user, { displayName: name });

        // Institutional Metadata
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            displayName: name,
            email: email,
            role: 'professional',
            createdAt: new Date().toISOString(),
            hasFaceAuth: false
        });

        // Redirect to Face Setup
        window.location.href = 'face-setup.html';
    } catch (err: any) {
        showError(err.message);
        setLoading(btn, false);
    }
});

// Helpers
function showError(msg: string) {
    if (errorEl) {
        errorEl.textContent = `[ACCESS_DENIED]: ${msg}`;
        errorEl.classList.remove('hidden');
    }
}

function setLoading(btn: HTMLButtonElement, isLoading: boolean) {
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent || '';
        btn.textContent = 'Verifying Credentials...';
    } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || 'Submit';
    }
}

// Initial state check for URL params
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('mode') === 'register') {
    (document.querySelector('[data-tab="register"]') as HTMLElement)?.click();
}
