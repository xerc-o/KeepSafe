<div align="center">

# 🛡️ KeepSafe - Real-Time Guardian

### _Perlindungan Cerdas untuk Browsing Anda_

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg?style=for-the-badge)](https://github.com/yourusername/keepsafe)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-success.svg?style=for-the-badge)](https://github.com/yourusername/keepsafe)

**Ekstensi browser pintar yang melindungi Anda dari phishing, gambling, dan konten dewasa menggunakan analisis heuristik, visual, dan threat intelligence.**

[🚀 Quick Start](#-instalasi) • [📖 Dokumentasi](#-cara-kerja--arsitektur) • [🎯 Features](#-fitur-utama) • [🤝 Contributing](#-contributing)

---

</div>

## 📋 Table of Contents

- [Tentang KeepSafe](#-tentang-keepsafe)
- [Fitur Utama](#-fitur-utama)
- [Demo & Screenshots](#-demo--screenshots)
- [Cara Kerja & Arsitektur](#-cara-kerja--arsitektur)
- [Instalasi](#-instalasi)
- [Tech Stack](#-tech-stack)
- [Configuration](#-configuration)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

---

## 🌟 Tentang KeepSafe

KeepSafe adalah solusi keamanan browsing generasi terbaru yang menggabungkan **real-time threat detection**, dan **visual content scanning** untuk memberikan perlindungan komprehensif saat Anda menjelajah internet.

### 🎯 Masalah yang Dipecahkan

| Masalah | Solusi KeepSafe |
|---------|----------------|
| ❌ Konten berbahaya lolos filter standar | ✅ Multi-layer scanning dengan 3 strategi berbeda |
| ❌ False positive yang mengganggu | ✅ Educational context awareness |
| ❌ Bypass melalui tab Images/Videos | ✅ Thumbnail analysis & visual scanning |
| ❌ UI yang mengganggu workflow | ✅ Glassmorphism UI yang elegan dan tidak mengganggu |

---

## ✨ Fitur Utama

<table>
<tr>
<td width="50%">

### 🔍 Forensic Analysis
Klik kanan pada link apa pun untuk melihat laporan forensik mendalam:
- 🌐 Hostname & TLD Analysis
- 📊 Domain Entropy Score
- ⚠️ Risk Assessment
- 🔐 SSL/Security Status

</td>
<td width="50%">

### ⚡ Dynamic Search Scanning
Pemindaian otomatis saat Anda mencari:
- 🔎 Google, Bing, DuckDuckGo support
- ⏱️ Real-time analysis (1-2 detik)
- 🎯 Context-aware filtering
- 📱 Mobile & Desktop compatible

</td>
</tr>
<tr>
<td width="50%">

### 🖼️ Thumbnail Analysis (Strategy 3)
Analisis visual khusus untuk Images/Videos:
- 🎨 Visual pattern recognition
- 📝 Caption & metadata analysis
- 🧠 Machine learning-based scoring
- 🚫 Strict mode untuk tab Images

</td>
<td width="50%">

### ✨ Premium Glassmorphism UI
Interface modern yang tidak mengganggu:
- 💎 Frosted glass effect
- 🌓 Auto light/dark mode
- 📐 Responsive design
- ⚡ Smooth animations

</td>
</tr>
</table>

### 🛡️ Kategori Perlindungan

```
┌─────────────────────────────────────────────────────────────┐
│  🎣 Phishing      │  🎰 Gambling     │  🔞 Adult Content    │
│  ─────────────────────────────────────────────────────────  │ 
│  • Domain entropy │  • Casino sites  │  • Explicit images   │
│  • Typosquatting  │  • Slot games    │  • Adult videos      │
│  • Fake login     │  • Betting sites │  • NSFW content      │
│  • URL spoofing   │  • Lottery scams │  • Bypass detection  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎬 Demo & Screenshots

### 🔍 Forensic Analysis Tooltip
<div align="center">
<img src="screenshots/forensic-tooltip.png" alt="Forensic Analysis" width="700"/>
<br/>
<em>Hover over any link to see instant risk analysis</em>
</div>

### ⏳ Dynamic Scanning Process
<div align="center">
<img src="screenshots/scanning-overlay.png" alt="Scanning Overlay" width="700"/>
<br/>
<em>Beautiful loading overlay during content analysis</em>
</div>

### 🚫 Block Page
<div align="center">
<img src="screenshots/blocked-page.png" alt="Blocked Page" width="700"/>
<br/>
<em>Clear and informative block page with statistics</em>
</div>

---

## 🏗️ Cara Kerja & Arsitektur

### System Architecture

```
┌─────────────┐
│ User        │
│ Navigation  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐      ┌──────────────────┐
│ Trigger          │─Yes─▶│ Show Scanning    │
│ Detected?        │      │ Overlay          │
└──────┬───────────┘      └────────┬─────────┘
       │No                          │
       │                            ▼
       │                   ┌─────────────────┐
       │                   │ Scrape Content  │
       │                   └────────┬────────┘
       │                            │
       │                            ▼
       │                   ┌─────────────────────┐
       │                   │ Multi-Layer         │
       │                   │ Analysis            │
       │                   └──┬───┬───┬──────────┘
       │                      │   │   │
       │          ┌───────────┘   │   └──────────┐
       │          ▼                ▼              ▼
       │    ┌──────────┐  ┌──────────┐  ┌──────────┐
       │    │Strategy 1│  │Strategy 2│  │Strategy 3│
       │    │Query     │  │Domain    │  │Thumbnail │
       │    │Analysis  │  │Scoring   │  │Analysis  │
       │    └────┬─────┘  └────┬─────┘  └────┬─────┘
       │         └──────────────┼─────────────┘
       │                        ▼
       │              ┌──────────────────┐
       │              │ Calculate Risk   │
       │              │ Score            │
       │              └────┬────┬────────┘
       │                   │    │
       │         High ◀────┘    └────▶ Low
       │          │                    │
       ▼          ▼                    ▼
┌──────────┐  ┌──────────┐      ┌──────────┐
│ Allow    │  │ Block    │      │ Allow    │
│ Access   │  │ Access   │      │ Access   │
└──────────┘  └────┬─────┘      └──────────┘
                   │
                   ▼
              ┌──────────┐
              │ Show     │
              │ Block    │
              │ Page     │
              └──────────┘
```

### 📊 Three-Layer Defense System

#### 🎯 Strategy 1: Query Analysis
```javascript
Query: "nude bahasa"
  ↓
Check Educational Patterns
  ├─ "apa itu" → Educational → ALLOW
  ├─ "artinya" → Educational → ALLOW
  └─ Plain keyword → CHECK NEXT LAYER
```

#### 🌐 Strategy 2: Domain Scoring
```javascript
Scrape Search Results (10 items)
  ↓
Analyze Each Result:
  ├─ Domain: wikipedia.org → Trusted (-30)
  ├─ Domain: adult-site.com → Adult (+50)
  └─ Content: "educational" → Safe (-15)
  ↓
Calculate Average Score → Decision
```

#### 🖼️ Strategy 3: Thumbnail Analysis
```javascript
Images Tab Switched
  ↓
Scrape Thumbnails (50 images)
  ↓
Pattern Matching:
  ├─ URL contains "xxx" → Suspicious (+30)
  ├─ Alt contains "leaked" → Suspicious (+15)
  └─ Domain: museum.org → Safe (-20)
  ↓
Suspicious Ratio > 20% → BLOCK
```

---

## 🚀 Instalasi

### Prerequisites

- Google Chrome 120+ / Microsoft Edge 120+ / Brave Browser
- Developer mode enabled

### Step-by-Step Installation

#### 1️⃣ Clone Repository
```bash
git clone https://github.com/yourusername/keepsafe.git
cd keepsafe
```

#### 2️⃣ Install Extension

**Chrome / Brave:**
```
1. Navigate to chrome://extensions/
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the keepsafe folder
```

**Edge:**
```
1. Navigate to edge://extensions/
2. Enable "Developer mode" (left sidebar)
3. Click "Load unpacked"
4. Select the keepsafe folder
```

#### 3️⃣ Verify Installation

Look for the 🛡️ KeepSafe icon in your browser toolbar. Click it to access settings.

#### 4️⃣ Configure (Optional)

```javascript
// Open extension popup → Settings
{
  "strictMode": true,          // For children/teens
  "thumbnailAnalysis": true,   // Enable Strategy 3
  "educationalBypass": true,   // Allow educational queries
  "suspiciousThreshold": 0.30  // 30% suspicious → block
}
```

---

## 🔧 Tech Stack

<table>
<tr>
<td align="center" width="25%">
<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" width="50"/>
<br/><strong>JavaScript</strong>
<br/>ES6+ / Vanilla JS
</td>
<td align="center" width="25%">
<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/chrome/chrome-original.svg" width="50"/>
<br/><strong>Chrome APIs</strong>
<br/>Manifest V3
</td>
<td align="center" width="25%">
<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original.svg" width="50"/>
<br/><strong>HTML5</strong>
<br/>Modern Semantics
</td>
<td align="center" width="25%">
<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/css3/css3-original.svg" width="50"/>
<br/><strong>CSS3</strong>
<br/>Glassmorphism
</td>
</tr>
</table>

### Core Technologies

- **Chrome Extension APIs**: webNavigation, storage, tabs, contextMenus
- **Content Scripts**: DOM manipulation & overlay injection
- **Service Workers**: Background processing & event handling
- **IndexedDB**: Local threat database caching

---
<!--
## ⚙️ Configuration

### Config File Structure

```javascript
// config.js
export const CONFIG = {
  // Strategy Settings
  strategies: {
    query: {
      enabled: true,
      threshold: 15
    },
    domain: {
      enabled: true,
      threshold: 20
    },
    thumbnail: {
      enabled: true,
      strictMode: true,
      suspiciousThreshold: 0.20,  // 20% for strict
      minThumbnails: 15
    }
  },
  
  // Blocking Rules
  blocking: {
    adultSites: true,
    gambling: true,
    phishing: true,
    customDomains: []  // Add custom domains
  },
  
  // UI Settings
  ui: {
    glassmorphism: true,
    darkMode: 'auto',  // 'auto', 'light', 'dark'
    animations: true
  }
};
```

### Customization Examples

#### Strict Mode (For Children)
```javascript
{
  strictMode: true,
  suspiciousThreshold: 0.15,  // Block at 15%
  educationalBypass: true,     // Still allow educational
  blockTabTypes: ['images', 'videos', 'shopping']
}
```

#### Lenient Mode (For Research)
```javascript
{
  strictMode: false,
  suspiciousThreshold: 0.50,   // Block only at 50%
  educationalBypass: true,
  blockTabTypes: ['images']     // Only block images
}
```

---

## 🧩 Module Overview
-->
### 📁 Project Structure

```
keepsafe/
├── 📄 manifest.json          # Extension configuration
├── 🎨 style.css              # Glassmorphism UI styles
├── 📜 background.js          # Service worker
├── 📜 content.js             # Content script injection
├── 📜 utils.js               # Core analysis engine
├── 📜 thumbnail_analyzer.js  # Strategy 3 implementation
├── 🚫 blocked.html           # Block page template
├── ⚙️ popup.html/js          # Extension popup
├── 📊 stats.html/js          # Statistics dashboard
└── 📚 docs/                  # Documentation
    ├── INSTALLATION.md
    ├── CONFIGURATION.md
    ├── STRATEGIES.md
    └── API.md
```
<!--
### 🔑 Key Modules

| Module | Description | Lines of Code |
|--------|-------------|---------------|
| `utils.js` | Core analysis engine | ~800 LOC |
| `thumbnail_analyzer.js` | Visual scanning system | ~500 LOC |
| `content.js` | UI & DOM manipulation | ~600 LOC |
| `background.js` | Event handling | ~300 LOC |
| `style.css` | Glassmorphism design | ~400 LOC |

---

<!--
## 📊 Performance Metrics

### Benchmarks

```
┌─────────────────────────────────────────┐
│  Metric              │  Value           │
├─────────────────────────────────────────┤
│  Query Analysis      │  <100ms          │
│  Domain Scoring      │  ~1 second       │
│  Thumbnail Analysis  │  ~2-3 seconds    │
│  Memory Usage        │  <50MB           │
│  CPU Usage           │  <5% average     │
│  False Positive Rate │  <5%             │
│  Detection Rate      │  >95%            │
└─────────────────────────────────────────┘
```

### Accuracy Rates

| Category | Detection Rate | False Positive |
|----------|---------------|----------------|
| 🔞 Adult Content | 97% | 3% |
| 🎰 Gambling | 95% | 2% |
| 🎣 Phishing | 93% | 4% |
| 📚 Educational | 96% accuracy | 4% blocked |

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

### Manual Testing

```bash
# Test queries
"apa itu pornografi?"     # Should: ALLOW (educational)
"download bokep gratis"   # Should: BLOCK (explicit)
"nude bahasa"            # Should: Analyze context

# Test domains
wikipedia.org            # Should: ALLOW (trusted)
adult-site.com          # Should: BLOCK (adult)

# Test Images tab
Search "nude art" → Click Images tab
Expected: Analyze thumbnails → Allow if educational
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### 🐛 Report Bugs

Found a bug? [Open an issue](https://github.com/yourusername/keepsafe/issues/new?template=bug_report.md)

### 💡 Suggest Features

Have an idea? [Open a feature request](https://github.com/yourusername/keepsafe/issues/new?template=feature_request.md)


### 🔧 Submit Pull Requests

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 📝 Code Style

- Use ESLint configuration provided
- Follow JavaScript Standard Style
- Add JSDoc comments for functions
- Write meaningful commit messages

---

## 📖 Documentation

- 📘 [Installation Guide](docs/INSTALLATION.md)
- 📗 [Configuration Guide](docs/CONFIGURATION.md)
- 📙 [Strategy Deep Dive](docs/STRATEGIES.md)
- 📕 [API Reference](docs/API.md)
- 📔 [Troubleshooting](docs/TROUBLESHOOTING.md)

---

## ❓ FAQ

<details>
<summary><strong>Q: Apakah KeepSafe mengirim data ke server?</strong></summary>

**A:** Tidak. Semua analisis dilakukan 100% lokal di browser Anda. Tidak ada data yang dikirim ke server eksternal.
</details>

<details>
<summary><strong>Q: Apakah bisa digunakan untuk parental control?</strong></summary>

**A:** Ya! Aktifkan Strict Mode di settings untuk proteksi maksimal. Threshold bisa disesuaikan untuk berbagai usia.
</details>

<details>
<summary><strong>Q: Bagaimana jika ada false positive?</strong></summary>

**A:** Klik tombol "Report False Positive" di block page. Atau, whitelist domain tertentu di settings.
</details>

<details>
<summary><strong>Q: Support browser apa saja?</strong></summary>

**A:** Chrome, Edge, Brave, dan semua browser berbasis Chromium. Firefox support coming soon.
</details>

<details>
<summary><strong>Q: Apakah gratis?</strong></summary>

**A:** Ya, 100% gratis dan open source. Tidak ada premium features atau subscription.
</details>



## 🗺️ Roadmap

### ✅ Completed
- [x] Multi-layer analysis system
- [x] Thumbnail analysis (Strategy 3)
- [x] Glassmorphism UI
- [x] Educational context detection

### 🚧 In Progress
- [ ] Machine learning model integration
- [ ] Real-time threat database sync
- [ ] Multi-language support (English, Indonesian)

### 📅 Planned
- [ ] Firefox support (Manifest V3)
- [ ] Safari extension
- [ ] Mobile browser support
- [ ] Cloud sync for settings
- [ ] Advanced analytics dashboard
- [ ] Whitelist/blacklist import/export

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 KeepSafe Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```



## 💬 Support

### Get Help

- 📧 Email: support@keepsafe.example.com
- 💬 Discord: [Join our community](https://discord.gg/keepsafe)
- 🐦 Twitter: [@KeepSafeApp](https://twitter.com/keepsafeapp)
- 📖 Wiki: [Documentation](https://github.com/yourusername/keepsafe/wiki)

### Donations

If you find KeepSafe useful, consider supporting development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/keepsafe)
[![PayPal](https://img.shields.io/badge/PayPal-Donate-blue?style=for-the-badge&logo=paypal)](https://paypal.me/keepsafe)

---

## 🌟 Acknowledgments

- Thanks to all [contributors](https://github.com/yourusername/keepsafe/graphs/contributors)
- Inspired by uBlock Origin and AdGuard
- Icons from [Heroicons](https://heroicons.com/)
- UI design inspired by Glassmorphism trend

---

## 📊 Statistics

![GitHub stars](https://img.shields.io/github/stars/yourusername/keepsafe?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/keepsafe?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/yourusername/keepsafe?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/keepsafe)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yourusername/keepsafe)

-->

<div align="center">

### 🛡️ KeepSafe - Melindungi Setiap Langkah Digital Anda

**Made with ❤️ by Xerc-o**

[⬆ Back to Top](#️-keepsafe---real-time-guardian)

</div>
