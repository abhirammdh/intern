require('dotenv').config();

const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const { exec } = require('child_process');
const tmp      = require('tmp');
const xml2js   = require('xml2js');

const app  = express();
const port = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── /templates  – parse templates.xml and return JSON ────────────────
app.get('/templates', (req, res) => {
  const xmlPath = path.join(__dirname, 'templates', 'templates.xml');

  fs.readFile(xmlPath, 'utf8', (err, xmlData) => {
    if (err) {
      console.error('Failed to read templates.xml:', err.message);
      return res.status(500).json({ error: 'Could not load templates.xml' });
    }

    xml2js.parseString(
      xmlData,
      { explicitArray: false, trim: true },
      (parseErr, result) => {
        if (parseErr) {
          console.error('XML parse error:', parseErr.message);
          return res.status(500).json({ error: 'Invalid templates.xml format' });
        }

        // Normalise into a flat array of { id, label, description, content }
        const raw = result?.templates?.template;
        const list = Array.isArray(raw) ? raw : [raw]; // handle single-template edge case

        const templates = list.map(t => ({
          id:          t.$.id,
          label:       t.$.label,
          description: t.description || '',
          content:     t.content || ''
        }));

        console.log(`Served ${templates.length} templates from XML`);
        res.json({ templates });
      }
    );
  });
});

// ── /compile ─────────────────────────────────────────────────────────
app.post('/compile', (req, res) => {
  const latex = req.body.latex;

  if (!latex || typeof latex !== 'string' || latex.trim() === '') {
    return res.status(400).json({ error: 'No valid LaTeX code provided' });
  }

  console.log('--- COMPILE REQUEST ---  length:', latex.length);

  tmp.dir({ unsafeCleanup: true }, (err, dir, cleanup) => {
    if (err) {
      console.error('Temp dir error:', err.message);
      return res.status(500).json({ error: 'Failed to create temp dir' });
    }

    const texPath = path.join(dir, 'document.tex');
    const pdfPath = path.join(dir, 'document.pdf');

    fs.writeFile(texPath, latex, (err) => {
      if (err) { cleanup(); return res.status(500).json({ error: 'Failed to write .tex file' }); }

      const pdflatex = '/usr/bin/pdflatex';
      const cmd = `"${pdflatex}" -output-directory="${dir}" -halt-on-error -interaction=nonstopmode -no-shell-escape "${texPath}"`;

      fs.access(pdflatex, fs.constants.X_OK, (accessErr) => {
        if (accessErr) { cleanup(); return res.status(500).json({ error: `pdflatex not found at ${pdflatex}` }); }

        exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
          if (err) {
            cleanup();
            return res.status(400).json({ error: stderr || stdout || 'No output from pdflatex' });
          }

          fs.readFile(pdfPath, (err, data) => {
            if (err) { cleanup(); return res.status(500).json({ error: 'Failed to read PDF' }); }
            res.set('Content-Type', 'application/pdf');
            res.send(data);
            cleanup();
          });
        });
      });
    });
  });
});

// ── /ai-resume  – Gemini AI route ────────────────────────────────────
app.post('/ai-resume', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: 'No prompt provided' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY missing from .env' });

  console.log('--- AI RESUME REQUEST ---  length:', prompt.length);

  const models = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
  ];

  let lastError = '';

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const geminiResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: 'You are a LaTeX expert. Output ONLY raw compilable LaTeX code. No markdown fences, no explanations, nothing outside the LaTeX document.' }]
          },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
        }),
      });

      const data = await geminiResponse.json();

      if (!geminiResponse.ok) {
        lastError = data?.error?.message || `HTTP ${geminiResponse.status}`;
        console.warn(`Model ${model} failed: ${lastError}`);
        continue;
      }

      let latex = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      latex = latex
        .replace(/^```latex\s*/im, '')
        .replace(/^```\s*/im, '')
        .replace(/```\s*$/im, '')
        .trim();

      if (!latex) { lastError = 'Empty response from model'; continue; }

      console.log(`Success with model: ${model}, length: ${latex.length}`);
      return res.json({ latex });

    } catch (err) {
      lastError = err.message;
      console.warn(`Model ${model} threw: ${err.message}`);
    }
  }

  return res.status(502).json({ error: `All Gemini models failed. Last error: ${lastError}` });
});

// ── Global error handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global crash:', err.stack);
  if (!res.headersSent) res.status(500).json({ error: 'Server crashed' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log('Gemini API key:', process.env.GEMINI_API_KEY ? 'loaded ✓' : 'MISSING ← add to .env!');
});