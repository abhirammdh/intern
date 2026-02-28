document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const editor = document.getElementById('latex-editor');
    const lineNumbers = document.getElementById('line-numbers');
    const compileBtn = document.getElementById('compile-btn');
    const downloadBtn = document.getElementById('download-btn');
    const errorPanel = document.getElementById('error-panel');
    const loading = document.getElementById('loading');
    const pdfPreview = document.getElementById('pdf-preview');
    const previewTabsContainer = document.getElementById('preview-tabs');
    const themeToggle = document.getElementById('theme-toggle');
    const htmlRoot = document.documentElement;
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const templateBar = document.getElementById('template-bar');

    // Theme Toggle
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        htmlRoot.setAttribute('data-theme', savedTheme);
        themeToggle.checked = savedTheme === 'light';
        const currentThemeEl = document.getElementById('current-theme');
        if (currentThemeEl) currentThemeEl.textContent = savedTheme.charAt(0).toUpperCase() + savedTheme.slice(1);
    }

    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'light' : 'dark';
        htmlRoot.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        const currentThemeEl = document.getElementById('current-theme');
        if (currentThemeEl) currentThemeEl.textContent = newTheme.charAt(0).toUpperCase() + newTheme.slice(1);
    });

    initTheme();

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const pageId = item.dataset.page;
            pages.forEach(page => page.classList.toggle('active', page.id === pageId));

            templateBar.style.display = pageId === 'home' ? 'flex' : 'none';
        });
    });

    // Line Numbers - perfect alignment
    function updateLineNumbers() {
        const lines = editor.value.split('\n');
        const lineCount = lines.length;
        let numbers = '';
        for (let i = 1; i <= lineCount; i++) {
            numbers += i + '\n';
        }
        lineNumbers.textContent = numbers.trimEnd();

        // Sync height
        lineNumbers.style.height = editor.scrollHeight + 'px';
    }

    editor.addEventListener('input', updateLineNumbers);
    editor.addEventListener('scroll', () => {
        lineNumbers.scrollTop = editor.scrollTop;
    });

    // Extra sync for paste/cut/enter/backspace
    editor.addEventListener('paste', () => setTimeout(updateLineNumbers, 0));
    editor.addEventListener('cut', () => setTimeout(updateLineNumbers, 0));
    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Backspace') {
            setTimeout(updateLineNumbers, 0);
        }
    });

    updateLineNumbers();
    window.addEventListener('resize', updateLineNumbers);

    // Templates
    const templates = {
        custom_resume: `\\documentclass[11pt,a4paper,sans]{moderncv}
\\moderncvstyle{classic}
\\moderncvcolor{blue}
\\usepackage{tcolorbox}  % For boxed sections
\\usepackage[scale=0.85]{geometry}  % Adjust margins for better fit

\\name{Your Full Name}{}
\\title{Your Job Title / Position Sought}
\\address{Your Street Address}{City, State, ZIP}{Country}
\\phone[mobile]{+1~(123)~456-7890}  % Optional phone
\\email{your.email@example.com}
\\homepage{www.linkedin.com/in/your-linkedin-id}  % LinkedIn as homepage
\\social[github]{your-github-username}  % Optional GitHub

\\begin{document}

\\makecvtitle

\\begin{tcolorbox}[colback=blue!5!white, colframe=blue!75!black, title=Personal Summary / Objective, sharp corners, boxrule=0.5pt]
Your 3-5 sentence professional summary or career objective goes here. Highlight your strengths, experience, and goals.
\\end{tcolorbox}

\\begin{tcolorbox}[colback=green!5!white, colframe=green!75!black, title=Education, sharp corners, boxrule=0.5pt]
\\cventry{2022--2026}{B.S. Computer Science}{Sri Sathya Sai Institute of Higher Learning (SSSIHL)}{Anekal, Karnataka, India}{}{Relevant coursework: Data Structures, Algorithms, Web Development. GPA: 3.8/4.0}\\\\

\\cventry{2018--2022}{High School Diploma}{Your High School}{City, State}{}{Focused on Mathematics and Sciences.}
\\end{tcolorbox}

\\begin{tcolorbox}[colback=orange!5!white, colframe=orange!75!black, title=Skills, sharp corners, boxrule=0.5pt]
\\cvitem{Programming Languages}{Python, JavaScript, C++, Java}
\\cvitem{Web Development}{HTML/CSS, React, Node.js, Express}
\\cvitem{Tools & Frameworks}{LaTeX, Git, Docker, AWS}
\\cvitem{Soft Skills}{Team Collaboration, Problem-Solving, Communication}
\\end{tcolorbox}

\\begin{tcolorbox}[colback=purple!5!white, colframe=purple!75!black, title=Projects, sharp corners, boxrule=0.5pt]
\\cvitem{LaTeX Editor Project}{Developed a web-based LaTeX editor with real-time preview, templates, and theme switching using HTML, CSS, JS, and Node.js backend. Collaborated with team of 4 at SSSIHL.}
\\cvitem{Another Project}{Brief description: Built a machine learning model for image classification using PyTorch. Achieved 95\\% accuracy on test data.}
\\end{tcolorbox}

\\begin{tcolorbox}[colback=red!5!white, colframe=red!75!black, title=Experience, sharp corners, boxrule=0.5pt]
\\cventry{2024--Present}{Intern / Freelancer}{Company Name}{City, State}{}{Responsibilities: Developed web applications, managed databases, and contributed to open-source projects.}
\\cventry{2023}{Summer Intern}{Another Company}{City, State}{}{Assisted in software testing and bug fixing.}
\\end{tcolorbox}

\\end{document}`,

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

    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.template;
            if (templates[key]) {
                editor.value = templates[key];
                updateLineNumbers();
            }
        });
    });

    editor.value = templates.custom_resume;
    updateLineNumbers();

    // Preview Tabs
    let previewTabCounter = 0;
    let currentPreviewUrl = null;

    function addPreviewTab(url, label) {
        previewTabCounter++;
        const tab = document.createElement('div');
        tab.className = 'preview-tab';
        tab.textContent = label;

        tab.addEventListener('click', () => {
            document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            pdfPreview.src = url + '#view=FitH,top';
            currentPreviewUrl = url;
        });

        previewTabsContainer.innerHTML = '';
        previewTabsContainer.appendChild(tab);

        pdfPreview.src = url + '#view=FitH,top';
        currentPreviewUrl = url;
    }

    // Compile Logic
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

            const timeStr = new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
            addPreviewTab(url, `preview-${timeStr}.pdf`);

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

    // Ctrl + Enter shortcut
    editor.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            compileBtn.click();
        }
    });

    // NEW: Resume Form Handler
    const resumeForm = document.getElementById('resume-form');
    if (resumeForm) {
        resumeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                fullName: document.getElementById('full-name')?.value.trim() || 'Your Name',
                jobTitle: document.getElementById('job-title')?.value.trim() || 'Student / Developer',
                email: document.getElementById('email')?.value.trim() || '',
                phone: document.getElementById('phone')?.value.trim() || '',
                address: document.getElementById('address')?.value.trim() || '',
                summary: document.getElementById('summary')?.value.trim() || '',
                education: document.getElementById('education')?.value.trim() || '',
                skills: document.getElementById('skills')?.value.trim() || '',
                projects: document.getElementById('projects')?.value.trim() || '',
                experience: document.getElementById('experience')?.value.trim() || '',
                certifications: document.getElementById('certifications')?.value.trim() || '',
                languages: document.getElementById('languages')?.value.trim() || ''
            };

            loading.style.display = 'flex';
            loading.querySelector('span').textContent = 'Generating LaTeX with Groq...';

            try {
                const response = await fetch('/generate-resume', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    const err = await response.json();
                    alert('Error: ' + (err.error || 'Failed to generate resume'));
                    return;
                }

                const { latex } = await response.json();

                // Load into editor
                editor.value = latex;
                updateLineNumbers();

                alert('Resume LaTeX generated successfully! Click Compile to preview.');
                // Optional: Auto-compile
                // setTimeout(() => compileBtn.click(), 1000);

            } catch (err) {
                alert('Network error: ' + err.message);
            } finally {
                loading.style.display = 'none';
                loading.querySelector('span').textContent = 'Compiling LaTeX...';
            }
        });
    }
});