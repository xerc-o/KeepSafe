# KeepSafe - Browser Link Verifier

Chrome extension yang membantu mengidentifikasi dan memblokir link berbahaya dari phishing, gambling, dan konten eksplisit melalui analisis heuristik dan pattern matching.

## Fitur

- **Hover Tooltip** - Analisis link real-time saat hover di atas link
- **Right-click Analysis** - Laporan detail saat klik kanan pada link
- **Search Result Scanning** - Otomatis scan hasil pencarian di Google/Bing/DuckDuckGo
- **Image Tab Protection** - Deteksi konten berbahaya di tab Images
- **Dark/Light Theme** - Otomatis menyesuaikan dengan sistem
- **Local Processing** - Semua analisis dilakukan lokal, tidak ada data yang dikirim ke server

## Instalasi

### Prerequisites
- Google Chrome, Brave, Edge, atau browser Chromium lainnya
- Developer mode diaktifkan

### Langkah Instalasi

1. Clone repository
   ```bash
   git clone https://github.com/xerc-o/KeepSafe.git
   cd KeepSafe
   ```

2. Buka extension page
   - Chrome/Brave: `chrome://extensions/`
   - Edge: `edge://extensions/`

3. Aktifkan "Developer mode" (toggle di kanan atas)

4. Klik "Load unpacked" dan pilih folder KeepSafe

5. Lihat icon 🛡️ di toolbar untuk verifikasi

## Cara Kerja

### Three-Layer Detection

**Strategy 1: Query Analysis**
- Analisis kata kunci dalam search query
- Deteksi educational context (misal "apa itu...", "definisi...")
- Skip search jika diyakini bersifat edukatif

**Strategy 2: Domain Scoring**
- Scrape hasil pencarian (max 8 hasil)
- Score setiap domain berdasarkan trust list dan blacklist
- Hitung rata-rata score dari semua hasil
- Block jika rata-rata score melebihi threshold

**Strategy 3: Thumbnail Analysis**
- Aktif di tab Images/Videos search engines
- Scrape thumbnail metadata (alt text, title, parent link)
- Hitung suspicious ratio dari image captions
- Block jika ratio melebihi 20%

### Risk Categories

- **Safe** (Green) - Trusted domain atau educational content
- **Neutral** (Gray) - Tidak ada indikasi bahaya
- **Suspicious** (Yellow) - Potensi phishing atau deceptive content
- **Gambling** (Orange) - Site gambling atau betting
- **Porn/Adult** (Red) - Konten dewasa atau NSFW
- **Danger** (Dark Red) - Blacklisted domain

## Tech Stack

- **Frontend**: HTML5, CSS3 (Glassmorphism), JavaScript ES6+
- **Backend**: Pure JavaScript, no external libraries
- **APIs**: Chrome Extension APIs (Manifest V3)
  - `webNavigation` - Monitor page navigation
  - `storage` - Local settings persistence
  - `contextMenus` - Right-click menu
  - `tabs` - Tab management
  - `messaging` - Service worker communication

## Project Structure

```
KeepSafe/
├── manifest.json              # Extension config (MV3)
├── background.js              # Service worker
├── content.js                 # Content script & DOM injection
├── utils.js                   # Core analysis engine (~420 LOC)
├── thumbnail_analyzer.js      # Image tab detection class
├── injector.js                # AJAX monitoring (XHR/Fetch)
├── popup.html/popup.js        # Extension popup UI
├── analysis.html/analysis.js  # Forensic report page
├── blocked.html               # Blocking page template
├── style.css                  # All styling (Glassmorphism)
├── blacklist.json             # Known malicious domains
└── icons/                     # Extension icons
```

## Key Functions

### utils.js (Core Analysis)

| Function | Purpose |
|----------|---------|
| `shouldBlockPorn(query)` | Scoring-based porn detection (0-80 points) |
| `shouldTriggerScanning(query)` | Check if query needs dynamic scan |
| `analyzeSearchResults(results)` | Score array of search results |
| `getTrustType(domain)` | Check if domain in trust list |
| `checkBlacklist(domain, data)` | Direct blacklist lookup |
| `getHeuristicScore(url, domain)` | Calculate domain entropy & keyword scores |
| `isEducationalQuery(text)` | Detect educational intent via regex patterns |

### content.js (Main Handler)

| Function | Purpose |
|----------|---------|
| `performFullAnalysis(url, linkText)` | Comprehensive link threat assessment |
| `triggerDynamicScan(query)` | Auto-scan search results |
| `showForensicModal(url, text)` | Open detailed analysis popup |
| `injectBlockingOverlay(reason, details)` | Show full-page block message |
| `analyzeLink(info)` | Score single link |

## Configuration

### Blacklist (blacklist.json)

Domains are manually curated:
- Gambling: `zeus88.com`, `king88.com`, `sbobet.com`
- Adult: `pornhub.com`, `xvideos.com`, `xnxx.com`
- Phishing: `phishing-test.com`, `free-bonus-claim.online`

### Scoring Thresholds

- Query score > 15 → Block
- Domain score > 20 → Dangerous
- Thumbnail suspicious ratio > 20% → Block
- Heuristic entropy > 4.5 → Suspicious

## Development Notes

- **No external dependencies** - Pure vanilla JavaScript
- **No AI/ML models** - Pattern matching and scoring only
- **Local only** - All processing happens in browser
- **Performance optimized** - Cached functions, efficient DOM queries
- **User privacy** - Zero telemetry or data collection

## Testing

### Manual Test Cases

```bash
# Query analysis
"apa itu pornografi?" → Should ALLOW (educational)
"download bokep gratis" → Should BLOCK (explicit)

# Domain check
wikipedia.org → Trust (safe)
pornhub.com → Blacklist (block)

# Image tab
Google Images "nude art" → Analyze thumbnails → Allow if educational

# Tooltip
Hover over any link → Show risk assessment
Right-click link → Open forensic report
```

## Known Limitations

- Image analysis adalah text-based (alt/title), bukan visual ML
- Thumbnail detection bergantung pada metadata availability
- False positives mungkin terjadi untuk domain/query ambiguous
- Blacklist adalah manual, bukan auto-updated

## Browser Support

- ✅ Chrome 120+
- ✅ Brave Browser
- ✅ Microsoft Edge 120+
- ✅ Semua browser berbasis Chromium
- ❌ Firefox (requires MV2 to MV3 migration)

## Recent Updates

### v1.2.0 (Current)
- Backend optimization: Removed 88 LOC redundancy
- Fixed race conditions in counter logic
- Improved thumbnail analysis performance (~30% faster)
- Consolidated trust checking via single source of truth
- Added proper message validation

### v1.1.0
- Added thumbnail analysis for image tabs
- Implemented educational context detection
- Glassmorphism UI redesign

### v1.0.0
- Initial release with 3-layer detection

## License

MIT License - See LICENSE file for details

## Author

Xerc-o - February 2026

---

**Disclaimer**: Ini adalah extension untuk protective browsing, bukan replacement untuk proper security practices. Selalu verifikasi URL secara manual jika ragu dan gunakan password manager yang secure.
