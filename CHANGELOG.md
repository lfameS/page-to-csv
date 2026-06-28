# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-06-28

### Added
- Initial release.
- One-click extraction of HTML **tables** to CSV with full **colspan + rowspan** grid normalization.
- Extraction of **`<ul>` / `<ol>` lists**, capturing item text plus links as a second column; navigation menus are skipped.
- Smart data-set labelling from `<caption>` or the nearest preceding heading (bounded lookup).
- Clean CSV output: quote/comma/newline escaping and a UTF-8 BOM for correct Excel rendering of non-ASCII text.
- **Copy to clipboard** and **download** actions, with a live preview of each detected data set.
- 100% local processing — `activeTab` + `scripting` permissions only, no network requests.
- `demo/sample.html` test page and code-generated PNG icons (`gen-icons.js`).
- Continuous integration validating JSON and JavaScript on every push.
