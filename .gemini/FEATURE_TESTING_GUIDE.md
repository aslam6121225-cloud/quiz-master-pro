# 🔍 Quizy Feature Testing Guide

## Quick Start - Test Your Features

I've created tools to help you identify which features aren't working:

### 1. **Interactive Test Page** 
Navigate to: **`http://localhost:5173/test.html`**

This page provides:
- ✅ One-click feature tests
- ✅ Real-time console output
- ✅ Authentication check
- ✅ IndexedDB verification
- ✅ DOM element detection
- ✅ Quick navigation to all pages

### 2. **How to Use the Test Page**

1. Open `http://localhost:5173/test.html` in your browser
2. Click "Run All Tests" to check system health
3. Review the console output for errors
4. Click individual test buttons to isolate issues
5. Use navigation buttons to jump to specific pages

## Common Issues & Solutions

### Issue 1: "No authentication found"
**Solution:**
1. Click "→ Login" button
2. Register or login with email/password
3. Return to test page and run tests again

### Issue 2: "No Quizy bundles found"
**Solution:**
1. Click "→ Upload" button
2. Upload a PDF file
3. Adjust settings (questions, time, difficulty)
4. Click "Generate 15 Unique Quizy Sessions"
5. Wait for completion
6. Return to test page

### Issue 3: "IndexedDB error"
**Solution:**
1. Check browser console (F12) for specific errors
2. Clear browser data and try again
3. Ensure you're using a modern browser
4. Check if IndexedDB is enabled in browser settings

### Issue 4: "Button not found"
**Solution:**
1. Ensure you're on the correct page
2. Check browser console for JavaScript errors
3. Verify the page loaded completely
4. Try refreshing the page

### Issue 5: "Random Challenge doesn't work"
**Cause:** No quiz bundles in database
**Solution:**
1. Upload a PDF first
2. Generate quizzes
3. Then try Random Challenge

### Issue 6: "Export Data doesn't work"
**Cause:** No quiz results in database
**Solution:**
1. Complete at least one quiz
2. Then try Export Data

## Manual Testing Workflow

### Step 1: Authentication (2 min)
```
1. Go to http://localhost:5173/login.html
2. Register new account OR login
3. Should redirect to dashboard
4. Verify your name appears in sidebar
```

### Step 2: Upload & Generate (3 min)
```
1. Click "Upload Material" in sidebar
2. Drag & drop a PDF file
3. Adjust question count slider (15-30)
4. Select time limit (10-30 minutes)
5. Choose difficulty mode
6. Click "Generate 15 Unique Quizy Sessions"
7. Wait for progress bar to complete
8. Should see success message
```

### Step 3: View Library (1 min)
```
1. Click "My Quizzes" in sidebar
2. Should see your generated bundle
3. Verify title, date, and badge display
4. Click "Start Quizy Session"
```

### Step 4: Take Quiz (5 min)
```
1. Read the question
2. Select an answer (A, B, C, or D)
3. Click "Next Sequence"
4. Repeat for all questions
5. View final score
6. Review Deep Conceptual Analysis
7. Click resource links (Wikipedia, YouTube, Google)
```

### Step 5: Dashboard Features (2 min)
```
1. Go to Dashboard
2. Click "Random Challenge" → Should start a quiz
3. Click "Export Data" → Should download CSV
4. Click "Review Mistakes" → Should show alert or navigate
5. Test all sidebar links
```

## Debugging Checklist

If features don't work, check:

### Browser Console (F12)
- [ ] No red error messages
- [ ] No 404 network errors
- [ ] No Firebase errors
- [ ] No TypeScript errors

### IndexedDB (DevTools > Application > IndexedDB)
- [ ] Database "QuizMasterDB" exists
- [ ] Tables: pdfs, quizzes, results, faceData
- [ ] Data has correct structure
- [ ] Owner/email fields populated

### Network Tab (DevTools > Network)
- [ ] All scripts load (200 status)
- [ ] Firebase requests succeed
- [ ] No CORS errors
- [ ] Worker scripts load

### Elements Tab (DevTools > Elements)
- [ ] Button IDs match code
- [ ] Event listeners attached
- [ ] No missing elements
- [ ] Correct HTML structure

## Feature Status Reference

### ✅ Should Be Working:
- Login/Registration
- PDF upload
- Quiz generation
- Quiz taking
- Results display
- Deep analysis
- Resource links
- Dashboard metrics
- My Quizzes library
- Delete bundles
- Random Challenge
- Review Mistakes
- Export Data
- Navigation
- Logout

### ⚠️ Placeholder Features (Show Alerts):
- Analytics page
- Achievements page
- Settings page
- Profile page
- Search functionality
- Notifications

## Specific Feature Tests

### Test Random Challenge:
```javascript
// In browser console on dashboard:
document.getElementById('btn-random-challenge').click();
// Should navigate to quiz.html with random bundle
```

### Test Export Data:
```javascript
// In browser console on dashboard:
document.getElementById('btn-export-data').click();
// Should download CSV file
```

### Test Quiz Generation:
```javascript
// In browser console on create.html:
const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
// Upload file and click generate
```

## Report Issues

If you find features not working, please provide:

1. **Which feature** (e.g., "Random Challenge button")
2. **What happens** (e.g., "Nothing happens when clicked")
3. **Console errors** (F12 > Console tab, copy any red errors)
4. **Browser** (Chrome, Firefox, Safari, Edge)
5. **Steps to reproduce** (what you clicked before the error)

## Quick Fixes

### Clear Everything and Start Fresh:
```javascript
// Run in browser console:
indexedDB.deleteDatabase('QuizMasterDB');
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Check Current User:
```javascript
// Run in browser console:
import { auth } from './src/firebase';
console.log(auth.currentUser);
```

### Check Quiz Bundles:
```javascript
// Run in browser console:
import { storage } from './src/services/storageService';
storage.getAll('quizzes').then(console.log);
```

## Next Steps

1. **Open test page**: `http://localhost:5173/test.html`
2. **Run all tests**: Click "Run All Tests" button
3. **Review output**: Check for any red error messages
4. **Report issues**: Share specific errors you see
5. **Manual test**: Follow the workflow above

The test page will help us quickly identify exactly which features aren't working!
