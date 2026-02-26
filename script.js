document.addEventListener('DOMContentLoaded', () => {
    // ────────────────────────────────────────────────
    // DOM Elements
    // ────────────────────────────────────────────────
    const editor = document.getElementById('latex-editor');
    const compileBtn = document.getElementById('compile-btn');
    const downloadBtn = document.getElementById('download-btn');
    const errorPanel = document.getElementById('error-panel');
    const loading = document.getElementById('loading');
    const pdfPreview = document.getElementById('pdf-preview');
    const previewTabsContainer = document.getElementById('preview-tabs');
    const themeToggle = document.getElementById('theme-toggle');
    const htmlRoot = document.documentElement;

    // ────────────────────────────────────────────────
    // Theme Toggle (save preference)
    // ────────────────────────────────────────────────
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        htmlRoot.setAttribute('data-theme', savedTheme);
        themeToggle.checked = savedTheme === 'light';
    }

    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'light' : 'dark';
        htmlRoot.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    initTheme();

    // ────────────────────────────────────────────────
    // Templates
    // ────────────────────────────────────────────────
    const templates = {
        basic: `\\documentclass{article}
\\usepackage[margin=1in]{geometry}
\\begin{document}

\\title{My Simple Document}
\\author{Abhiram}
\\date{\\today}

\\maketitle

\\section{Introduction}
Hello! This is a basic article template.

\\section{Conclusion}
Thank you for using this editor.

\\end{document}`,

        report: `\\documentclass[12pt,a4paper]{report}
\\usepackage[margin=2.5cm]{geometry}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{Project Report}
\\author{Abhiram \\\\ Anekal, Karnataka}
\\date{\\today}

\\begin{document}

\\maketitle

\\chapter{Introduction}
This is the first chapter.

\\chapter{Methodology}
Describe your methods here.

\\chapter{Results}
Your findings go here.

\\chapter{Conclusion}
Summary and future work.

\\end{document}`,

        math: `\\documentclass{article}
\\usepackage{amsmath,amssymb,geometry}
\\geometry{margin=1in}

\\begin{document}

\\title{Mathematics Document}
\\author{Abhiram}
\\maketitle

\\section{Important Equations}

Inline: $E = mc^2$

Display:
\\begin{equation}
  \\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
\\end{equation}

Matrix example:
\\begin{equation*}
  A = \\begin{pmatrix}
    1 & 2 \\\\
    3 & 4
  \\end{pmatrix}
\\end{equation*}

\\end{document}`,

        beamer: `\\documentclass{beamer}
\\usetheme{Madrid}
\\usepackage{graphicx}

\\title{My Presentation}
\\author{Abhiram}
\\date{\\today}

\\begin{document}

\\begin{frame}
  \\titlepage
\\end{frame}

\\begin{frame}{Slide 1}
  \\begin{itemize}
    \\item Point one
    \\item Point two
  \\end{itemize}
\\end{frame}

\\begin{frame}{Slide 2}
  Important equation:
  \\[ E = mc^2 \\]
\\end{frame}

\\end{document}`,

        cv: `\\documentclass[11pt,a4paper,sans]{moderncv}
\\moderncvstyle{classic}
\\moderncvcolor{blue}

\\name{Abhiram}{}
\\title{Student / LaTeX Enthusiast}
\\address{Anekal}{Karnataka}{India}
\\phone[mobile]{+91~XXXXXXXXXX}
\\email{abhiram@example.com}

\\begin{document}

\\makecvtitle

\\section{Education}
\\cventry{2022--2026}{B.Sc / B.Tech}{University Name}{City}{}{\\small Relevant coursework}

\\section{Experience}
\\cventry{2024--Present}{Freelance LaTeX Typesetter}{}{}{}

\\section{Skills}
\\cvitem{Software}{LaTeX, Overleaf, GitHub}
\\cvitem{Languages}{Kannada, English, Hindi}

\\end{document}`
    };

    // Load template when button clicked
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.template;
            if (templates[key]) {
                editor.value = templates[key];
                // Optional: auto-compile after loading
                // compileBtn.click();
            }
        });
    });

    // Set default template
    editor.value = templates.basic;

    // ────────────────────────────────────────────────
    // Preview Tabs Management
    // ────────────────────────────────────────────────
    let previewTabCounter = 0;
    let currentPreviewUrl = null;

    function addPreviewTab(url, label) {
        previewTabCounter++;
        const tabId = `preview-${previewTabCounter}`;

        const tab = document.createElement('div');
        tab.className = 'preview-tab active';
        tab.textContent = label;
        tab.dataset.tabId = tabId;

        tab.addEventListener('click', () => {
            document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            pdfPreview.src = url + '#view=FitH,top';
            currentPreviewUrl = url;
        });

        // Clear old tabs or keep history (here we replace for simplicity)
        // previewTabsContainer.innerHTML = '';
        previewTabsContainer.appendChild(tab);

        // Load new preview
        pdfPreview.src = url + '#view=FitH,top';
        currentPreviewUrl = url;
    }

    // ────────────────────────────────────────────────
    // Compile Logic
    // ────────────────────────────────────────────────
    compileBtn.addEventListener('click', async () => {
        errorPanel.style.display = 'none';
        errorPanel.textContent = '';
        loading.style.display = 'flex';
        downloadBtn.disabled = true;

        const latex = editor.value.trim();

        if (!latex) {
            errorPanel.textContent = 'Please enter some LaTeX code first.';
            errorPanel.style.display = 'block';
            loading.style.display = 'none';
            return;
        }

        try {
            const response = await fetch('/compile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latex })
            });

            if (!response.ok) {
                const text = await response.text();
                let errMsg = `Server error (${response.status})`;
                try {
                    const json = JSON.parse(text);
                    errMsg = json.error || text || errMsg;
                } catch {}
                errorPanel.textContent = errMsg;
                errorPanel.style.display = 'block';
                return;
            }

            const blob = await response.blob();
            if (blob.size < 200) {
                errorPanel.textContent = 'Generated PDF is empty or invalid.';
                errorPanel.style.display = 'block';
                return;
            }

            const url = URL.createObjectURL(blob);

            // Create new preview tab with timestamp
            const timeStr = new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            addPreviewTab(url, `preview-${timeStr}.pdf`);

            // Enable download for current preview
            downloadBtn.disabled = false;
            downloadBtn.onclick = () => {
                if (currentPreviewUrl) {
                    const a = document.createElement('a');
                    a.href = currentPreviewUrl;
                    a.download = `document-${timeStr}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            };

        } catch (err) {
            errorPanel.textContent = `Network or server error: ${err.message}`;
            errorPanel.style.display = 'block';
        } finally {
            loading.style.display = 'none';
        }
    });

    // Ctrl + Enter = Compile
    editor.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            compileBtn.click();
        }
    });

    // Optional: Clean up old blob URLs after some time (memory)
    setInterval(() => {
        // You could add logic here to revoke old URLs if you keep many tabs
    }, 60000);
});