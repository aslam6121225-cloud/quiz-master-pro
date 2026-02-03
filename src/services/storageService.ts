import { openDB } from 'idb';

/**
 * QuizMaster Pro | Data Storage Infrastructure
 * Architecture: IndexedDB-First, Unlimited Local Storage
 * Purpose: FREE processing of large PDFs and biometric data
 */

const DB_NAME = 'QuizMasterDB';
const DB_VERSION = 2;

class StorageService {
    private dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // PDF Repository: Stores full text extracted from documents
            if (!db.objectStoreNames.contains('pdfs')) {
                db.createObjectStore('pdfs', { keyPath: 'id' });
            }

            // Quiz Archive: Stores 15+ generated quizzes per document
            if (!db.objectStoreNames.contains('quizzes')) {
                db.createObjectStore('quizzes', { keyPath: 'id' });
            }

            // Results History: Stores analytics and per-user scores
            if (!db.objectStoreNames.contains('results')) {
                db.createObjectStore('results', { keyPath: 'id' });
            }

            // Face Sovereign Data: Stores 128-float descriptors bound to Email
            if (!db.objectStoreNames.contains('faceData')) {
                db.createObjectStore('faceData', { keyPath: 'email' });
            }
        },
    });

    // GENERIC OPS
    async save(storeName: string, data: any) {
        const db = await this.dbPromise;
        return db.put(storeName, data);
    }

    async get(storeName: string, key: string) {
        const db = await this.dbPromise;
        return db.get(storeName, key);
    }

    async getAll(storeName: string) {
        const db = await this.dbPromise;
        return db.getAll(storeName);
    }

    async delete(storeName: string, key: string) {
        const db = await this.dbPromise;
        return db.delete(storeName, key);
    }

    // SPECIALIZED OPS
    async getQuizzesForDoc(docId: string) {
        const all = await this.getAll('quizzes');
        return all.filter(q => q.docId === docId);
    }

    async getResultsForUser(email: string) {
        const all = await this.getAll('results');
        return all.filter(r => r.userEmail === email);
    }
}

export const storage = new StorageService();
