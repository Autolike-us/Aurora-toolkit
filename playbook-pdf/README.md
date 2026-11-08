# The AI Character Playbook (2nd edition) - PDF source

`playbook.html` is the whole book (20 pages, 7 x 9.5 in). `node build.cjs` renders it to `The-AI-Character-Playbook.pdf` with Playwright/Chromium and reports any page whose content overflows.
Images come from `../playbook-site/img`, fonts (Fredoka, Nunito) from `fonts/`.

Upload the PDF to the server as `aurora-releases/uncle-toussaint-playbook.pdf` (see `../playbook-site/README.md`).
When the account numbers change, edit them in `playbook.html` (chapter 1 stats and the "first look vs. latest look" table), rebuild, and re-upload.
