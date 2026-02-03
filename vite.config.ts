import { defineConfig } from 'vite';

export default defineConfig({
    root: './',
    plugins: [
        {
            name: 'fix-mime-types',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    if (req.url && req.url.endsWith('.ts')) {
                        res.setHeader('Content-Type', 'application/javascript');
                    }
                    next();
                });
            }
        }
    ],
    build: {
        outDir: 'dist',
        assetsInlineLimit: 0, // Don't inline worker files
        rollupOptions: {
            input: {
                main: 'index.html',
                login: 'login.html',
                faceSetup: 'face-setup.html',
                dashboard: 'dashboard.html',
                create: 'create.html',
                myQuizzes: 'my-quizzes.html',
                quiz: 'quiz.html',
                test: 'test.html'
            }
        }
    },
    optimizeDeps: {
        include: ['pdfjs-dist']
    },
    server: {
        port: 3000,
        open: true
    }
});
