# Page to CSV — Table & List Extractor

A lightweight Chrome (Manifest V3) extension that turns any table or list on a web page into a clean CSV with one click. **No setup, no account, no servers — extraction happens entirely in your browser, so your data never leaves your machine.**

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue) ![No data leaves browser](https://img.shields.io/badge/privacy-100%25%20local-16a34a) ![License: MIT](https://img.shields.io/badge/license-MIT-black)

---

## What it does

- Scans the current page and finds every HTML **table** and meaningful **list** (`<ul>` / `<ol>`).
- Shows a quick preview of each data set with its row/column count.
- Exports any of them to a clean, Excel-ready **CSV** (UTF-8 with BOM, so Turkish and other non-ASCII characters open correctly), or copies it to the clipboard.
- Handles the messy parts for you: quotes, commas and line breaks are escaped properly, `colspan` cells are expanded so columns stay aligned, and navigation menus are skipped.

## Why it's safe

Most "scraper" tools send the page to a remote server. This one doesn't. It uses Chrome's `activeTab` + `scripting` APIs to read the page **only when you click the icon**, processes everything locally, and never makes a network request. There is no backend, no analytics, and no account.

## Install (load unpacked)

Works in any Chromium browser — **Brave**, Chrome, Edge, Opera, Vivaldi.

1. Download or clone this repo.
2. Run `node gen-icons.js` once to generate the icons (or skip — the browser will use a default icon).
3. Open the extensions page:
   - **Brave:** `brave://extensions`
   - Chrome: `chrome://extensions` · Edge: `edge://extensions`
4. Turn on **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select this folder.
6. Pin the extension and open any page with a table — e.g. the included `demo/sample.html` or a Wikipedia article.

## Usage

1. Open a page that has a table or list.
2. Click the **Page to CSV** icon.
3. Pick the data set you want and hit **Download CSV** (or **Copy**).

Try it on `demo/sample.html` (in this repo) to see it work instantly.

## How it works

```
popup opens ──▶ inject scanAndExtract() into the active tab
                     │
                     ▼
          finds <table> + <ul>/<ol>, returns plain 2D text data
                     │
                     ▼
popup renders a preview ──▶ you click Export ──▶ CSV built locally ──▶ download / clipboard
```

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest (`activeTab` + `scripting` permissions only) |
| `popup.html` / `popup.css` | The popup UI |
| `popup.js` | Page scan, CSV building, download/copy |
| `demo/sample.html` | A test page so you can try it immediately |
| `gen-icons.js` | Generates the PNG icons from code |

## Tech

Vanilla JavaScript, Chrome Manifest V3, `chrome.scripting.executeScript`. No dependencies, no build step.

## Roadmap

- Column picking / renaming before export
- Auto-detection of repeated "card" grids (not just `<table>`/`<ul>`)
- One-click export to Google Sheets

## Hire me

I build small, focused tools like this — Chrome extensions, web scrapers, n8n/AI automations, and API integrations — fast and clean. See more of my work at **[github.com/lfameS](https://github.com/lfameS)**.

## License

MIT © 2026 İzzet Koyak
