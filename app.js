/**
 * ============================================================================
 * Task Manager Web Application
 * Built with: Node.js, Express.js, EJS, and File System (fs) Module
 * ============================================================================
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TASKS_DIR = path.join(__dirname, 'tasks');

// Ensure the tasks storage directory exists
if (!fs.existsSync(TASKS_DIR)) {
    fs.mkdirSync(TASKS_DIR, { recursive: true });
}

// ----------------------------------------------------------------------------
// Middleware Configuration
// ----------------------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parsing URL-encoded bodies (form submissions) and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serving static assets (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------------------------------
// Helper Utilities
// ----------------------------------------------------------------------------

/**
 * Sanitize filename to prevent directory traversal and illegal characters.
 * @param {string} rawTitle 
 * @returns {string} Safe filename (without .txt)
 */
function sanitizeFilename(rawTitle) {
    if (!rawTitle || typeof rawTitle !== 'string') {
        return 'Untitled_Task_' + Date.now();
    }
    // Remove illegal file system characters: / \ ? * : | " < > and trim whitespace
    const clean = rawTitle
        .trim()
        .replace(/[/\\?%*:|"<>]/g, '')
        .replace(/\s+/g, '_')
        .replace(/\.txt$/i, '');
    return clean.length > 0 ? clean : 'Untitled_Task_' + Date.now();
}

/**
 * Validates that the requested file stays strictly inside the TASKS_DIR.
 * @param {string} filename 
 * @returns {string|null} Resolved safe absolute path or null if invalid
 */
function getSafeFilePath(filename) {
    if (!filename || typeof filename !== 'string') return null;
    const safeName = path.basename(filename);
    const finalName = safeName.endsWith('.txt') ? safeName : `${safeName}.txt`;
    const resolvedPath = path.resolve(TASKS_DIR, finalName);

    // Verify boundary confinement
    if (!resolvedPath.startsWith(TASKS_DIR)) {
        return null;
    }
    return resolvedPath;
}

// ----------------------------------------------------------------------------
// Application Routes
// ----------------------------------------------------------------------------

/**
 * GET /
 * Display all tasks on the dashboard as cards with preview snippets.
 * Uses: fs.readdir, fs.stat, fs.readFile
 */
app.get('/', (request, response) => {
    fs.readdir(TASKS_DIR, (err, files) => {
        if (err) {
            console.error('Error reading tasks directory:', err);
            return response.status(500).render('error', {
                title: '500 - Server Error',
                message: 'Unable to retrieve tasks from disk.',
                error: err
            });
        }

        // Filter only .txt files
        const txtFiles = files.filter(file => file.endsWith('.txt'));

        // Read metadata and preview for each file
        const taskPromises = txtFiles.map(file => {
            return new Promise((resolve) => {
                const filePath = path.join(TASKS_DIR, file);
                fs.stat(filePath, (statErr, stats) => {
                    if (statErr) {
                        return resolve(null);
                    }

                    fs.readFile(filePath, 'utf-8', (readErr, content) => {
                        if (readErr) {
                            return resolve(null);
                        }

                        const rawName = path.basename(file, '.txt');
                        const displayName = rawName.replace(/_/g, ' ');
                        const preview = content.trim();
                        const isTruncated = preview.length > 140;
                        const snippet = isTruncated ? preview.substring(0, 140) + '...' : preview;
                        const wordCount = preview ? preview.split(/\s+/).filter(Boolean).length : 0;

                        resolve({
                            filename: file,
                            title: displayName,
                            snippet: snippet || 'No description provided.',
                            fullContent: preview,
                            wordCount: wordCount,
                            charCount: preview.length,
                            createdAt: stats.birthtime,
                            modifiedAt: stats.mtime
                        });
                    });
                });
            });
        });

        Promise.all(taskPromises).then(tasks => {
            // Remove nulls and sort by modifiedAt descending (newest first)
            const validTasks = tasks
                .filter(Boolean)
                .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

            response.render('index', {
                title: 'TaskFlow | Minimal Task Manager',
                tasks: validTasks,
                totalCount: validTasks.length
            });
        });
    });
});

/**
 * POST /create
 * Create a new task and save it as a .txt file.
 * Uses: req.body, fs.writeFile
 */
app.post('/create', (request, response) => {
    const { title, description } = request.body;

    if (!title || title.trim() === '') {
        return response.status(400).render('error', {
            title: '400 - Bad Request',
            message: 'Task title is required.',
            error: new Error('Empty task title provided.')
        });
    }

    const safeBaseName = sanitizeFilename(title);
    let targetFileName = `${safeBaseName}.txt`;
    let targetFilePath = path.join(TASKS_DIR, targetFileName);

    // If file with same name exists, append timestamp to make it unique
    if (fs.existsSync(targetFilePath)) {
        targetFileName = `${safeBaseName}_${Date.now()}.txt`;
        targetFilePath = path.join(TASKS_DIR, targetFileName);
    }

    const taskContent = description ? description.trim() : '';

    fs.writeFile(targetFilePath, taskContent, 'utf-8', (err) => {
        if (err) {
            console.error('Error creating task file:', err);
            return response.status(500).render('error', {
                title: '500 - File Write Error',
                message: 'Failed to write task to the filesystem.',
                error: err
            });
        }

        console.log(`[CREATED] Task saved successfully: ${targetFileName}`);
        response.redirect('/');
    });
});

/**
 * GET /task/:filename
 * Read and view the complete task details with "Read More".
 * Uses: req.params, fs.readFile, fs.stat
 */
app.get('/task/:filename', (request, response) => {
    const requestedFile = request.params.filename;
    const targetFilePath = getSafeFilePath(requestedFile);

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
        return response.status(404).render('error', {
            title: '404 - Task Not Found',
            message: `The task file "${requestedFile}" could not be found.`,
            error: new Error('File does not exist on disk.')
        });
    }

    fs.stat(targetFilePath, (statErr, stats) => {
        if (statErr) {
            return response.status(500).render('error', {
                title: '500 - Stat Error',
                message: 'Error fetching file metadata.',
                error: statErr
            });
        }

        fs.readFile(targetFilePath, 'utf-8', (readErr, content) => {
            if (readErr) {
                console.error('Error reading task file:', readErr);
                return response.status(500).render('error', {
                    title: '500 - File Read Error',
                    message: 'Failed to read task content from disk.',
                    error: readErr
                });
            }

            const rawName = path.basename(targetFilePath, '.txt');
            const displayName = rawName.replace(/_/g, ' ');
            const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;

            response.render('task', {
                title: `${displayName} | Task Details`,
                task: {
                    filename: path.basename(targetFilePath),
                    title: displayName,
                    content: content,
                    wordCount: wordCount,
                    charCount: content.length,
                    createdAt: stats.birthtime,
                    modifiedAt: stats.mtime,
                    sizeBytes: stats.size
                }
            });
        });
    });
});

/**
 * GET /edit/:filename
 * Render the task edit form.
 * Uses: req.params, fs.readFile
 */
app.get('/edit/:filename', (request, response) => {
    const requestedFile = request.params.filename;
    const targetFilePath = getSafeFilePath(requestedFile);

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
        return response.status(404).render('error', {
            title: '404 - Task Not Found',
            message: `Cannot edit "${requestedFile}". Task does not exist.`,
            error: new Error('File not found.')
        });
    }

    fs.readFile(targetFilePath, 'utf-8', (err, content) => {
        if (err) {
            return response.status(500).render('error', {
                title: '500 - Read Error',
                message: 'Unable to open task for editing.',
                error: err
            });
        }

        const rawName = path.basename(targetFilePath, '.txt');
        const displayName = rawName.replace(/_/g, ' ');

        response.render('edit', {
            title: `Edit ${displayName}`,
            task: {
                filename: path.basename(targetFilePath),
                title: displayName,
                content: content
            }
        });
    });
});

/**
 * POST /edit/:filename
 * Update task title (rename file) and description (rewrite file).
 * Uses: req.params, req.body, fs.rename, fs.writeFile
 */
app.post('/edit/:filename', (request, response) => {
    const currentFilename = request.params.filename;
    const currentFilePath = getSafeFilePath(currentFilename);

    const { newTitle, newDescription } = request.body;

    if (!currentFilePath || !fs.existsSync(currentFilePath)) {
        return response.status(404).render('error', {
            title: '404 - Task Not Found',
            message: 'Target task file for update does not exist.',
            error: new Error('File not found.')
        });
    }

    if (!newTitle || newTitle.trim() === '') {
        return response.status(400).render('error', {
            title: '400 - Validation Error',
            message: 'Task title cannot be empty.',
            error: new Error('Missing new title.')
        });
    }

    const sanitizedNewName = `${sanitizeFilename(newTitle)}.txt`;
    const newFilePath = path.join(TASKS_DIR, sanitizedNewName);
    const updatedContent = newDescription !== undefined ? newDescription.trim() : '';

    const performWrite = (destinationPath, finalName) => {
        fs.writeFile(destinationPath, updatedContent, 'utf-8', (writeErr) => {
            if (writeErr) {
                return response.status(500).render('error', {
                    title: '500 - Update Error',
                    message: 'Failed to write updated task content.',
                    error: writeErr
                });
            }
            console.log(`[UPDATED] Task updated: ${finalName}`);
            response.redirect(`/task/${encodeURIComponent(finalName)}`);
        });
    };

    // If filename has changed, rename the file first
    if (path.basename(currentFilePath) !== sanitizedNewName) {
        fs.rename(currentFilePath, newFilePath, (renameErr) => {
            if (renameErr) {
                return response.status(500).render('error', {
                    title: '500 - Rename Error',
                    message: 'Failed to rename task file on disk.',
                    error: renameErr
                });
            }
            performWrite(newFilePath, sanitizedNewName);
        });
    } else {
        performWrite(currentFilePath, currentFilename);
    }
});

/**
 * POST /delete/:filename
 * Delete a task file from the filesystem.
 * Uses: req.params, fs.unlink
 */
app.post('/delete/:filename', (request, response) => {
    const requestedFile = request.params.filename;
    const targetFilePath = getSafeFilePath(requestedFile);

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
        return response.status(404).render('error', {
            title: '404 - Task Not Found',
            message: `Cannot delete "${requestedFile}". Task does not exist.`,
            error: new Error('File not found.')
        });
    }

    fs.unlink(targetFilePath, (err) => {
        if (err) {
            console.error('Error deleting task file:', err);
            return response.status(500).render('error', {
                title: '500 - Delete Error',
                message: 'Failed to delete task file from disk.',
                error: err
            });
        }

        console.log(`[DELETED] Task deleted: ${requestedFile}`);
        response.redirect('/');
    });
});

/**
 * GET /download/:filename
 * Direct download of the raw .txt task file.
 */
app.get('/download/:filename', (request, response) => {
    const requestedFile = request.params.filename;
    const targetFilePath = getSafeFilePath(requestedFile);

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
        return response.status(404).send('File not found.');
    }

    response.download(targetFilePath, path.basename(targetFilePath));
});

// ----------------------------------------------------------------------------
// 404 & Global Error Handling
// ----------------------------------------------------------------------------
app.use((request, response) => {
    response.status(404).render('error', {
        title: '404 - Page Not Found',
        message: `The requested endpoint "${request.originalUrl}" was not found on this server.`,
        error: new Error('Route not found')
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🚀 Task Manager Server is live!                         ║
  ║   📡 URL: http://localhost:${PORT}                         ║
  ║   📁 Storage: ${TASKS_DIR}        ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
