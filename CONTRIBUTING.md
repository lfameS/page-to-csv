# Contributing

Thanks for your interest in improving Page to CSV!

## Getting started

1. Fork and clone the repo.
2. Run `node gen-icons.js` to generate the icons.
3. Load the folder as an unpacked extension (`brave://extensions` or `chrome://extensions` → Developer mode → Load unpacked).
4. Make changes, reload the extension, and test against `demo/sample.html`.

## Before opening a pull request

- Keep it dependency-free and local-only — no network requests, no new permissions beyond `activeTab` + `scripting` without a clear reason.
- Run the same checks CI runs:
  ```bash
  node --check popup.js
  node --check gen-icons.js
  node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))"
  ```
- Match the existing code style (vanilla JS, small focused functions, comments explaining the "why").
- Update `CHANGELOG.md` under an "Unreleased" heading.

## Reporting bugs

Open an issue with the page/site where it happened (or a minimal HTML snippet), what you expected, and what you got. Screenshots help.
