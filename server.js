const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const tmp = require('tmp');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/compile', (req, res) => {
  const latex = req.body.latex;

  if (!latex || typeof latex !== 'string' || latex.trim() === '') {
    return res.status(400).json({ error: 'No valid LaTeX code provided' });
  }

  // Debug everything
  console.log('--- COMPILE REQUEST START ---');
  console.log('LaTeX length:', latex.length);
  console.log('Node process.cwd():', process.cwd());
  console.log('Node process.env.PATH:', process.env.PATH || '(PATH is empty/undefined!)');

  tmp.dir({ unsafeCleanup: true }, (err, dir, cleanup) => {
    if (err) {
      console.error('Temp dir error:', err.message);
      return res.status(500).json({ error: 'Failed to create temp dir' });
    }

    console.log('Temp dir created:', dir);

    const texPath = path.join(dir, 'document.tex');
    const pdfPath = path.join(dir, 'document.pdf');

    fs.writeFile(texPath, latex, (err) => {
      if (err) {
        cleanup();
        console.error('Write tex error:', err.message);
        return res.status(500).json({ error: 'Failed to write .tex file' });
      }

      console.log('Wrote tex file to:', texPath);

      // ────────────────────────────────────────────────
      // Force absolute path – this fixes 99% of Codespaces ENOENT issues
      const pdflatex = '/usr/bin/pdflatex';
      // ────────────────────────────────────────────────

      const cmd = `"${pdflatex}" -output-directory="${dir}" -halt-on-error -interaction=nonstopmode -no-shell-escape "${texPath}"`;

      console.log('EXECUTING COMMAND:', cmd);

      // Test if binary even exists (super debug)
      fs.access(pdflatex, fs.constants.X_OK, (accessErr) => {
        if (accessErr) {
          console.error('pdflatex NOT executable / not found at:', pdflatex, accessErr.message);
          cleanup();
          return res.status(500).json({ error: `pdflatex binary missing or not executable at ${pdflatex}` });
        }

        console.log('pdflatex binary exists and is executable at', pdflatex);

        exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {  // 30s timeout to prevent hangs
          if (err) {
            cleanup();
            const output = stderr || stdout || 'No output from pdflatex';
            console.error('pdflatex FAILED:', output);
            console.error('exec error code:', err.code);
            return res.status(400).json({ error: output });
          }

          console.log('pdflatex SUCCESS - stdout snippet:', stdout.substring(0, 300));

          fs.readFile(pdfPath, (err, data) => {
            if (err) {
              cleanup();
              console.error('Read PDF error:', err.message);
              return res.status(500).json({ error: 'Failed to read PDF' });
            }

            console.log('Sending PDF, size:', data.length);
            res.set('Content-Type', 'application/pdf');
            res.send(data);
            cleanup();
          });
        });
      });
    });
  });
});

app.use((err, req, res, next) => {
  console.error('Global crash:', err.stack);
  if (!res.headersSent) res.status(500).json({ error: 'Server crashed - check terminal' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log('Using pdflatex at: /usr/bin/pdflatex');
});