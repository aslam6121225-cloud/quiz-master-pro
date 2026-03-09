/**
 * Quizy Platform - Diagnostic Script
 * Run this in browser console to check system health
 */

console.log('🔍 QUIZY DIAGNOSTIC STARTING...\n');

// 1. Check Authentication
console.log('1️⃣ AUTHENTICATION CHECK');
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('✅ User authenticated:', user.email);
        console.log('   Display Name:', user.displayName);
        console.log('   UID:', user.uid);
    } else {
        console.log('❌ No user authenticated');
        console.log('   Session Storage:', sessionStorage.getItem('sovereign_session_email'));
    }
});

// 2. Check IndexedDB
console.log('\n2️⃣ INDEXEDDB CHECK');
import { storage } from './services/storageService';

async function checkStorage() {
    try {
        const pdfs = await storage.getAll('pdfs');
        const quizzes = await storage.getAll('quizzes');
        const results = await storage.getAll('results');
        const faceData = await storage.getAll('faceData');

        console.log('✅ IndexedDB accessible');
        console.log('   PDFs:', pdfs.length);
        console.log('   Quizzes:', quizzes.length);
        console.log('   Results:', results.length);
        console.log('   Face Data:', faceData.length);

        if (quizzes.length > 0) {
            console.log('\n   Sample Quiz Bundle:');
            console.log('   -', quizzes[0].title);
            console.log('   - ID:', quizzes[0].id);
            console.log('   - Owner:', quizzes[0].owner);
            console.log('   - Sequences:', quizzes[0].sequences?.length || 0);
            console.log('   - Settings:', quizzes[0].settings);
        }

        if (results.length > 0) {
            console.log('\n   Sample Result:');
            console.log('   - Score:', results[0].score);
            console.log('   - User:', results[0].userEmail);
            console.log('   - Time:', results[0].timeSpentSeconds, 'seconds');
        }
    } catch (err) {
        console.error('❌ IndexedDB error:', err);
    }
}

checkStorage();

// 3. Check DOM Elements
console.log('\n3️⃣ DOM ELEMENTS CHECK');

const criticalElements = {
    'Dashboard': [
        'btn-logout',
        'btn-random-challenge',
        'btn-review-mistakes',
        'btn-export-data',
        'dashboard-search',
        'user-display-name',
        'greeting'
    ],
    'Create': [
        'drop-zone',
        'file-input',
        'btn-generate',
        'btn-remove-file',
        'input-num',
        'input-time'
    ],
    'Quiz': [
        'btn-next',
        'quiz-main',
        'result-view',
        'timer',
        'question-text'
    ],
    'Login': [
        'btn-login-submit',
        'btn-face-start',
        'face-email',
        'btn-face-reset'
    ]
};

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
console.log('Current Page:', currentPage);

Object.entries(criticalElements).forEach(([page, elements]) => {
    if (currentPage.includes(page.toLowerCase())) {
        console.log(`\n${page} Elements:`);
        elements.forEach(id => {
            const el = document.getElementById(id);
            console.log(el ? `✅ ${id}` : `❌ ${id} NOT FOUND`);
        });
    }
});

// 4. Check Event Listeners
console.log('\n4️⃣ EVENT LISTENERS CHECK');
console.log('(Check browser DevTools > Elements > Event Listeners)');

// 5. Check Network
console.log('\n5️⃣ NETWORK CHECK');
console.log('Firebase Config:', {
    projectId: 'quiz-035',
    authDomain: 'quiz-035.firebaseapp.com'
});

// 6. Check PDF.js
console.log('\n6️⃣ PDF.JS CHECK');
try {
    import('pdfjs-dist').then(pdfjsLib => {
        console.log('✅ PDF.js loaded');
        console.log('   Version:', pdfjsLib.version);
        console.log('   Worker:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    });
} catch (err) {
    console.error('❌ PDF.js error:', err);
}

// 7. Check Console Errors
console.log('\n7️⃣ CONSOLE ERRORS');
console.log('Check above for any red error messages');

// 8. Quick Health Summary
console.log('\n📊 HEALTH SUMMARY');
console.log('Run the following tests:');
console.log('1. Login → Should redirect to dashboard');
console.log('2. Upload PDF → Should generate quizzes');
console.log('3. Start Quiz → Should load questions');
console.log('4. Complete Quiz → Should show results');
console.log('5. Export Data → Should download CSV');

console.log('\n✅ DIAGNOSTIC COMPLETE');
console.log('If you see errors above, share them for debugging.');
