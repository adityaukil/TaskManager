# 🚀 Week 2 Assignment: File-Based Task Manager

A high-performance, elegantly designed **Task Manager Web Application** built with **Node.js**, **Express.js**, **EJS Templating**, and the native **File System (`fs`)** module.

---

## 📋 Features

- **Create Tasks:** Submit a task with a title and full description. It is saved directly to disk as a `.txt` file using `fs.writeFile()`.
- **Card-Based Dashboard:** Dynamically reads all saved `.txt` files in the storage folder using `fs.readdir()`, calculates stats and preview snippets, and presents them in a sleek, responsive card grid.
- **“Read More” Full View:** Uses dynamic Express route parameters (`req.params.filename`) and `fs.readFile()` to display the complete task along with word count, character count, file size, and timestamp metadata.
- **Edit & Rename:** Update task content and rename files seamlessly using `fs.rename()` and `fs.writeFile()`.
- **Delete Tasks:** Remove task files from the filesystem via `fs.unlink()`.
- **File Download:** Direct download of the raw `.txt` file using Express `res.download()`.
- **Live Search & Filter:** Instant client-side search across task titles and content previews.
- **Security & Reliability:** Sanitizes filenames, prevents directory traversal attacks, and provides friendly error views.

---

## 🛠️ Tech Stack & Methods Used

| Technology | Purpose |
| :--- | :--- |
| **Node.js** | JavaScript Runtime |
| **Express.js** | Web Application & Routing Framework |
| **EJS** | Embedded JavaScript Templating Engine |
| **fs Module** | `fs.writeFile`, `fs.readFile`, `fs.readdir`, `fs.stat`, `fs.rename`, `fs.unlink` |
| **Tailwind CSS & Lucide Icons** | Modern Glassmorphism & Responsive UI |

---

## 🗂️ Project Structure

```
Week2Assignment/
├── tasks/                          # Stored .txt task files (persistent)
│   ├── Complete_Express_Routing_Guide.txt
│   └── Master_NodeJS_File_System.txt
├── views/                          # EJS View Templates
│   ├── partials/
│   │   ├── header.ejs              # Global HTML head, fonts, CDN styling
│   │   ├── navbar.ejs              # Navigation bar
│   │   └── footer.ejs              # Footer & scripts
│   ├── index.ejs                   # Task creation form & cards grid
│   ├── task.ejs                    # Full task detail ("Read More") view
│   ├── edit.ejs                    # Edit task form
│   └── error.ejs                   # Error handling view
├── public/                         # Static Assets
│   ├── css/
│   │   └── style.css               # Custom styles & scrollbars
│   └── js/
│       └── main.js                 # Search filtering & UI interactivity
├── app.js                          # Express server & fs route handlers
├── package.json                    # Dependencies and scripts
└── README.md                       # Documentation
```

---

## 🛣️ Express Routes Breakdown

| Method | Endpoint | Description | fs Method / Handler |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Renders dashboard with all task cards | `fs.readdir`, `fs.stat`, `fs.readFile` |
| `POST` | `/create` | Creates new `.txt` task file from form data | `req.body`, `fs.writeFile` |
| `GET` | `/task/:filename` | View full task details (**Read More**) | `req.params`, `fs.readFile`, `fs.stat` |
| `GET` | `/edit/:filename` | Edit task form view | `req.params`, `fs.readFile` |
| `POST` | `/edit/:filename` | Updates task content & renames file | `req.params`, `req.body`, `fs.rename`, `fs.writeFile` |
| `POST` | `/delete/:filename` | Deletes task file from disk | `req.params`, `fs.unlink` |
| `GET` | `/download/:filename` | Downloads `.txt` file | `req.params`, `res.download` |

---

## 🚀 How to Run the Application

1. **Open your terminal inside the project directory:**
   ```powershell
   cd C:\Users\ADITYA\Desktop\Week2Assignment
   ```

2. **Install dependencies (if not already installed):**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   *Or for automatic restart on file changes:*
   ```bash
   npm run dev
   ```

4. **Open your browser and visit:**
   ```
   http://localhost:3000
   ```

---

## 🔒 Security Best Practices Implemented

- **Path Traversal Guard:** Ensures requested filenames cannot escape the designated `tasks/` folder using `path.resolve` and strict boundary validation.
- **Filename Sanitization:** Strips illegal Windows/Unix filesystem characters (`/`, `\`, `?`, `*`, `:`, `|`, `"`, `<`, `>`) and whitespace before file creation.
- **Error Handling:** Gracefully displays user-friendly error views when files are not found or disk operations fail.
