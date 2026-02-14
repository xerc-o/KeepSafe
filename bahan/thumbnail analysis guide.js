# 🖼️ STRATEGI 3: THUMBNAIL ANALYSIS - Pedoman Lengkap

Panduan komprehensif untuk mengimplementasikan analisis thumbnail di Images / Videos tab.

---

## 📖 Table of Contents

1.[Konsep Dasar](#konsep - dasar)
2.[Cara Kerja Detail](#cara - kerja - detail)
3.[Pattern Detection](#pattern - detection)
4.[Implementation Code](#implementation - code)
5.[Configuration & Tuning](#configuration--tuning)
6.[Testing Guide](#testing - guide)
7.[Optimization](#optimization)
8.[Troubleshooting](#troubleshooting)

---

## 🎯 Konsep Dasar

### Apa itu Thumbnail Analysis ?

** Analisis konten visual ** yang sebenarnya muncul di halaman hasil pencarian, bukan hanya mengandalkan query atau metadata.

### Kenapa Diperlukan ?

    ```
Query: "nude bahasa"

Tanpa Thumbnail Analysis:
  ├─ Cuma cek query → Ada "nude" → Mungkin block/allow
  └─ MASALAH: Tidak tau isi sebenarnya!

Dengan Thumbnail Analysis:
  ├─ Cek query: "nude bahasa"
  ├─ Load halaman Images tab
  ├─ Scrape 50 thumbnails
  ├─ Analyze setiap gambar:
  │   ├─ 45 dari Wikipedia, museums, educational → SAFE
  │   └─ 5 dari unknown sources → CHECK PATTERN
  ├─ Ratio: 5/50 = 10% suspicious
  └─ Decision: 10% < 30% → ALLOW ✅

RESULT: Keputusan based on REAL content, not assumptions
```

### Kapan Digunakan ?

✅ ** GUNAKAN ketika:**
    - User di Images / Videos tab
        - Query punya trigger keyword tapi bisa educational
            - Butuh akurasi maksimal
                - Strategi 1 & 2 tidak cukup

❌ ** JANGAN gunakan ketika:**
    - Query jelas explicit(e.g., "download bokep gratis") → Langsung block aja
        - Tab All(text results) → Pakai text analysis
            - Perlu speed maksimal → Thumbnail analysis lambat

---

## 🔍 Cara Kerja Detail

### Phase 1: Scraping Thumbnails

#### 1.1.Wait for Page Load

    ```javascript
async function waitForThumbnails() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const images = document.querySelectorAll('img[src], img[data-src]');
      
      // Google Images biasanya load 20-50 images
      if (images.length >= 20) {
        clearInterval(checkInterval);
        // Wait sedikit lagi untuk ensure semua loaded
        setTimeout(resolve, 1000);
      }
    }, 200); // Check every 200ms
    
    // Timeout setelah 5 detik
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 5000);
  });
}
```

    ** Best Practice:**
        - ⏱️ Minimum wait: 1 detik(biar images mulai load)
            - ⏱️ Maximum wait: 5 detik(timeout jika koneksi lambat)
                - ✅ Check jumlah images: Min 20 images untuk analysis valid

#### 1.2.Scrape Image Elements

    ```javascript
function scrapeThumbnails() {
  const thumbnails = [];
  
  // Google Images selectors (bisa berbeda per search engine)
  const selectors = [
    'img.rg_i',           // Google Images main selector
    'img[data-src]',      // Lazy-loaded images
    'img.mimg',           // Bing Images
    'img[src*="media"]',  // Generic media images
    'div.isv-r img'       // Google Images container
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach(img => {
      // Extract all useful data
      const thumbnail = {
        element: img,
        src: img.src || img.dataset.src || '',
        alt: img.alt || '',
        title: img.title || '',
        width: img.width,
        height: img.height,
        
        // Get parent link if exists
        parentLink: img.closest('a')?.href || '',
        
        // Get surrounding text
        parentText: img.closest('div')?.textContent || ''
      };
      
      thumbnails.push(thumbnail);
    });
  });
  
  // Remove duplicates (same src)
  const unique = thumbnails.filter((thumb, index, self) =>
    index === self.findIndex(t => t.src === thumb.src)
  );
  
  return unique;
}
```

    ** Data yang Dikumpulkan:**
        - ✅ `src`: URL gambar
            - ✅ `alt`: Alt text(description)
                - ✅ `title`: Title attribute
                    - ✅ `parentLink`: Link ke source page
                        - ✅ `parentText`: Surrounding text
                            - ✅ `width/height`: Dimensions

### Phase 2: Pattern Analysis

#### 2.1.URL Pattern Detection

    ```javascript
const URL_PATTERNS = {
  // Tier 1: HIGHLY Suspicious (Auto-mark)
  tier1: [
    /pornhub\.com/i,
    /xvideos\.com/i,
    /xnxx\.com/i,
    /xxx/i,
    /porn(?!ography\s+prevention)/i,  // "porn" tapi bukan "pornography prevention"
    /adult.*(?:site|content|video|image)/i,
    /sex.*(?:video|image|pic)/i
  ],
  
  // Tier 2: Suspicious (Requires context)
  tier2: [
    /nude(?!.*(?:art|painting|sculpture|museum|renaissance|classical))/i,
    /naked(?!.*(?:mole|rat|eye|truth))/i,  // Naked mole rat, naked eye, naked truth = OK
    /nsfw/i,
    /explicit/i,
    /leaked/i,
    /scandal/i,
    /\b18\+/i,
    /\badult\b/i
  ],
  
  // Tier 3: Contextual (Check with other signals)
  tier3: [
    /sexy/i,
    /hot/i,
    /bikini/i,
    /lingerie/i,
    /provocative/i
  ]
};

function analyzeURL(url, alt, title) {
  const fullText = `${ url } ${ alt } ${ title } `.toLowerCase();
  let score = 0;
  let flags = [];
  
  // Check Tier 1 (Highly Suspicious)
  for (const pattern of URL_PATTERNS.tier1) {
    if (pattern.test(fullText)) {
      score += 30;  // High score
      flags.push('tier1_pattern');
      break;  // One match is enough
    }
  }
  
  // Check Tier 2 (Suspicious)
  for (const pattern of URL_PATTERNS.tier2) {
    if (pattern.test(fullText)) {
      score += 15;
      flags.push('tier2_pattern');
    }
  }
  
  // Check Tier 3 (Contextual)
  for (const pattern of URL_PATTERNS.tier3) {
    if (pattern.test(fullText)) {
      score += 5;
      flags.push('tier3_pattern');
    }
  }
  
  return { score, flags };
}
```

    ** Scoring System:**
        - 🔴 Tier 1: +30(auto suspicious)
            - 🟠 Tier 2: +15(suspicious with context)
- 🟡 Tier 3: +5(mild concern)

#### 2.2.Domain Analysis

    ```javascript
const DOMAIN_CLASSIFICATION = {
  // Trusted domains (Reduce suspicion)
  trusted: [
    'wikipedia.org',
    'britannica.com',
    'museum',
    'gallery',
    '.edu',
    '.gov',
    'smithsonian',
    'louvre',
    'metmuseum',
    'getty',
    'nga.gov'
  ],
  
  // Adult domains (Highly suspicious)
  adult: [
    'pornhub', 'xvideos', 'xnxx', 'redtube', 'youporn',
    'xhamster', 'spankbang', 'tube8', 'porn',
    'xxx', 'nsfw', 'adult', 'sex'
  ],
  
  // Image hosting (Neutral, check content)
  imageHost: [
    'imgur', 'flickr', 'photobucket', 'tinypic',
    'imageshack', 'postimg'
  ],
  
  // Social media (Neutral)
  social: [
    'pinterest', 'instagram', 'tumblr', 'reddit',
    'twitter', 'facebook'
  ]
};

function analyzeDomain(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    // Check trusted
    for (const domain of DOMAIN_CLASSIFICATION.trusted) {
      if (hostname.includes(domain)) {
        return { category: 'trusted', scoreModifier: -20 };
      }
    }
    
    // Check adult
    for (const domain of DOMAIN_CLASSIFICATION.adult) {
      if (hostname.includes(domain)) {
        return { category: 'adult', scoreModifier: +50 };
      }
    }
    
    // Check image hosting
    for (const domain of DOMAIN_CLASSIFICATION.imageHost) {
      if (hostname.includes(domain)) {
        return { category: 'imageHost', scoreModifier: 0 };
      }
    }
    
    // Check social
    for (const domain of DOMAIN_CLASSIFICATION.social) {
      if (hostname.includes(domain)) {
        return { category: 'social', scoreModifier: 0 };
      }
    }
    
    return { category: 'unknown', scoreModifier: 0 };
  } catch (e) {
    return { category: 'error', scoreModifier: 0 };
  }
}
```

#### 2.3.Educational Context Detection

    ```javascript
const EDUCATIONAL_INDICATORS = [
  // Art context
  /\b(art|painting|sculpture|drawing|sketch|artwork)\b/i,
  /\b(museum|gallery|exhibition|collection)\b/i,
  /\b(renaissance|classical|baroque|impressionist)\b/i,
  /\b(artist|painter|sculptor)\b/i,
  
  // Academic context
  /\b(study|research|academic|scientific|educational)\b/i,
  /\b(university|college|school|education)\b/i,
  /\b(thesis|paper|journal|article)\b/i,
  
  // Medical context
  /\b(medical|anatomy|health|clinical|diagnostic)\b/i,
  /\b(doctor|physician|hospital|clinic)\b/i,
  
  // Cultural context
  /\b(culture|tradition|history|historical)\b/i,
  /\b(anthropology|ethnography|indigenous)\b/i,
  
  // News context
  /\b(news|report|journalism|documentary)\b/i,
  
  // Book/Literature
  /\b(book|literature|novel|publication)\b/i
];

function detectEducationalContext(text) {
  let educationalScore = 0;
  let indicators = [];
  
  text = text.toLowerCase();
  
  for (const pattern of EDUCATIONAL_INDICATORS) {
    if (pattern.test(text)) {
      educationalScore += 5;
      indicators.push(pattern.source);
    }
  }
  
  return {
    isEducational: educationalScore >= 10,  // Min 2 indicators
    score: educationalScore,
    indicators: indicators
  };
}
```

### Phase 3: Scoring & Decision

    ```javascript
function analyzeSingleThumbnail(thumbnail) {
  const { src, alt, title, parentLink, parentText } = thumbnail;
  
  let totalScore = 0;
  let details = {
    urlScore: 0,
    domainScore: 0,
    educationalScore: 0,
    flags: []
  };
  
  // 1. Analyze URL patterns
  const urlAnalysis = analyzeURL(src, alt, title);
  totalScore += urlAnalysis.score;
  details.urlScore = urlAnalysis.score;
  details.flags.push(...urlAnalysis.flags);
  
  // 2. Analyze domain
  const domainAnalysis = analyzeDomain(parentLink || src);
  totalScore += domainAnalysis.scoreModifier;
  details.domainScore = domainAnalysis.scoreModifier;
  details.flags.push(domainAnalysis.category);
  
  // 3. Check educational context
  const fullText = `${ alt } ${ title } ${ parentText } `;
  const eduContext = detectEducationalContext(fullText);
  if (eduContext.isEducational) {
    totalScore -= eduContext.score;  // Reduce suspicion
    details.educationalScore = -eduContext.score;
    details.flags.push('educational');
  }
  
  // 4. Final decision for this thumbnail
  const isSuspicious = totalScore > 10;  // Threshold per thumbnail
  
  return {
    thumbnail: thumbnail,
    score: totalScore,
    suspicious: isSuspicious,
    details: details
  };
}

function analyzeAllThumbnails(thumbnails) {
  const results = thumbnails.map(thumb => 
    analyzeSingleThumbnail(thumb)
  );
  
  // Count suspicious
  const suspiciousCount = results.filter(r => r.suspicious).length;
  const suspiciousRatio = suspiciousCount / Math.max(thumbnails.length, 1);
  
  // Calculate average score
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const averageScore = totalScore / Math.max(thumbnails.length, 1);
  
  return {
    totalThumbnails: thumbnails.length,
    suspiciousCount: suspiciousCount,
    suspiciousRatio: suspiciousRatio,
    averageScore: averageScore,
    results: results
  };
}
```

---

## 💻 Implementation Code

### Complete Implementation

    ```javascript
// ============================================
// THUMBNAIL ANALYSIS - COMPLETE IMPLEMENTATION
// ============================================

class ThumbnailAnalyzer {
  constructor(config = {}) {
    this.config = {
      minThumbnails: 10,              // Minimum images untuk analysis
      maxWaitTime: 5000,              // Max wait untuk loading (ms)
      suspiciousThreshold: 0.30,      // 30% suspicious → block
      thumbnailScoreThreshold: 10,    // Score per thumbnail
      ...config
    };
  }
  
  // Main function
  async analyze() {
    console.log('[Thumbnail] Starting analysis...');
    
    // Step 1: Wait for thumbnails to load
    await this.waitForThumbnails();
    
    // Step 2: Scrape thumbnails
    const thumbnails = this.scrapeThumbnails();
    console.log('[Thumbnail] Found', thumbnails.length, 'images');
    
    if (thumbnails.length < this.config.minThumbnails) {
      console.warn('[Thumbnail] Not enough images for reliable analysis');
      return {
        reliable: false,
        reason: 'Insufficient thumbnails',
        thumbnailCount: thumbnails.length
      };
    }
    
    // Step 3: Analyze each thumbnail
    const analysis = this.analyzeAllThumbnails(thumbnails);
    
    // Step 4: Make decision
    const decision = this.makeDecision(analysis);
    
    console.log('[Thumbnail] Analysis complete:', decision);
    
    return decision;
  }
  
  // Wait for thumbnails to load
  async waitForThumbnails() {
    return new Promise((resolve) => {
      let elapsed = 0;
      const checkInterval = 200;
      
      const interval = setInterval(() => {
        const images = document.querySelectorAll('img[src], img[data-src]');
        elapsed += checkInterval;
        
        if (images.length >= this.config.minThumbnails || 
            elapsed >= this.config.maxWaitTime) {
          clearInterval(interval);
          setTimeout(resolve, 500);  // Extra 500ms buffer
        }
      }, checkInterval);
    });
  }
  
  // Scrape thumbnail elements
  scrapeThumbnails() {
    const selectors = [
      'img.rg_i',              // Google Images
      'img[data-src]',         // Lazy load
      'img.mimg',              // Bing
      'div.isv-r img',         // Google container
      'img[src*="image"]',     // Generic
      'a.iusc img'             // Google Images link
    ];
    
    const thumbnails = [];
    const seenSrcs = new Set();
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(img => {
        const src = img.src || img.dataset.src || '';
        
        // Skip if already seen or no src
        if (!src || seenSrcs.has(src)) return;
        seenSrcs.add(src);
        
        thumbnails.push({
          element: img,
          src: src,
          alt: img.alt || '',
          title: img.title || '',
          parentLink: img.closest('a')?.href || '',
          parentText: this.getParentText(img)
        });
      });
    });
    
    return thumbnails;
  }
  
  // Get surrounding text
  getParentText(element) {
    const parent = element.closest('div, article, section');
    if (!parent) return '';
    
    // Get text but limit length
    const text = parent.textContent || '';
    return text.substring(0, 500);  // Max 500 chars
  }
  
  // Analyze all thumbnails
  analyzeAllThumbnails(thumbnails) {
    const results = thumbnails.map(thumb => 
      this.analyzeSingleThumbnail(thumb)
    );
    
    const suspiciousCount = results.filter(r => r.suspicious).length;
    const suspiciousRatio = suspiciousCount / thumbnails.length;
    
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const averageScore = totalScore / thumbnails.length;
    
    // Get top suspicious for logging
    const topSuspicious = results
      .filter(r => r.suspicious)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    return {
      totalThumbnails: thumbnails.length,
      suspiciousCount: suspiciousCount,
      suspiciousRatio: suspiciousRatio,
      averageScore: averageScore,
      results: results,
      topSuspicious: topSuspicious
    };
  }
  
  // Analyze single thumbnail
  analyzeSingleThumbnail(thumbnail) {
    let score = 0;
    const details = { flags: [] };
    
    const fullText = `${ thumbnail.src } ${ thumbnail.alt } ${ thumbnail.title } `.toLowerCase();
    
    // 1. URL Pattern Check
    const urlScore = this.checkURLPatterns(fullText);
    score += urlScore;
    details.urlScore = urlScore;
    
    // 2. Domain Check
    const domainScore = this.checkDomain(thumbnail.parentLink || thumbnail.src);
    score += domainScore;
    details.domainScore = domainScore;
    
    // 3. Educational Context
    const eduScore = this.checkEducationalContext(
      thumbnail.alt + ' ' + thumbnail.title + ' ' + thumbnail.parentText
    );
    score -= eduScore;  // Reduce suspicion
    details.educationalScore = -eduScore;
    
    const isSuspicious = score > this.config.thumbnailScoreThreshold;
    
    return {
      thumbnail: thumbnail,
      score: score,
      suspicious: isSuspicious,
      details: details
    };
  }
  
  // Check URL patterns
  checkURLPatterns(text) {
    let score = 0;
    
    // Tier 1: Highly suspicious
    const tier1 = [
      /pornhub|xvideos|xnxx|xxx(?!l)/i,
      /\bporn(?!ography\s+prevention)/i,
      /adult.*(?:video|image|content)/i
    ];
    
    for (const pattern of tier1) {
      if (pattern.test(text)) {
        score += 30;
        break;
      }
    }
    
    // Tier 2: Suspicious
    const tier2 = [
      /nude(?!.*(?:art|museum|painting))/i,
      /nsfw|explicit|leaked/i,
      /\b18\+/i
    ];
    
    for (const pattern of tier2) {
      if (pattern.test(text)) {
        score += 15;
      }
    }
    
    // Tier 3: Mild
    const tier3 = [
      /sexy|hot(?!dog|sauce)/i,
      /bikini|lingerie/i
    ];
    
    for (const pattern of tier3) {
      if (pattern.test(text)) {
        score += 5;
      }
    }
    
    return score;
  }
  
  // Check domain
  checkDomain(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      
      // Adult domains
      const adultDomains = ['pornhub', 'xvideos', 'xnxx', 'xxx', 'porn', 'adult', 'sex'];
      for (const domain of adultDomains) {
        if (hostname.includes(domain)) return 50;
      }
      
      // Trusted domains
      const trusted = ['wikipedia', 'britannica', 'museum', 'edu', 'gov'];
      for (const domain of trusted) {
        if (hostname.includes(domain)) return -20;
      }
      
      return 0;
    } catch (e) {
      return 0;
    }
  }
  
  // Check educational context
  checkEducationalContext(text) {
    let score = 0;
    text = text.toLowerCase();
    
    const indicators = [
      /\b(art|painting|sculpture|museum|gallery)\b/i,
      /\b(educational|academic|study|research)\b/i,
      /\b(medical|anatomy|health|clinical)\b/i,
      /\b(history|historical|culture|cultural)\b/i
    ];
    
    for (const pattern of indicators) {
      if (pattern.test(text)) {
        score += 5;
      }
    }
    
    return score;
  }
  
  // Make final decision
  makeDecision(analysis) {
    const { suspiciousRatio, averageScore, suspiciousCount, totalThumbnails } = analysis;
    
    let shouldBlock = false;
    let reason = '';
    let confidence = 'low';
    
    // Rule 1: High percentage of suspicious images
    if (suspiciousRatio >= this.config.suspiciousThreshold) {
      shouldBlock = true;
      reason = `${ suspiciousCount }/${totalThumbnails} images (${(suspiciousRatio * 100).toFixed(0)}%) are suspicious`;
confidence = 'high';
    }
    // Rule 2: Very high average score
    else if (averageScore > 15) {
    shouldBlock = true;
    reason = `High average suspicion score: ${averageScore.toFixed(1)}`;
    confidence = 'medium';
}
// Rule 3: Allow
else {
    shouldBlock = false;
    reason = `Content appears safe (${(suspiciousRatio * 100).toFixed(0)}% suspicious)`;
    confidence = 'high';
}

return {
    block: shouldBlock,
    reason: reason,
    confidence: confidence,
    suspiciousRatio: suspiciousRatio,
    suspiciousCount: suspiciousCount,
    totalThumbnails: totalThumbnails,
    averageScore: averageScore,
    topSuspicious: analysis.topSuspicious.map(r => ({
        src: r.thumbnail.src.substring(0, 100),
        score: r.score
    }))
};
  }
}

// ============================================
// USAGE
// ============================================

// Inisialisasi
const analyzer = new ThumbnailAnalyzer({
    minThumbnails: 15,
    maxWaitTime: 5000,
    suspiciousThreshold: 0.30,
    thumbnailScoreThreshold: 10
});

// Run analysis
const result = await analyzer.analyze();

if (result.block) {
    console.log('BLOCK:', result.reason);
    showBlockedOverlay(result);
} else {
    console.log('ALLOW:', result.reason);
}
```

---

## ⚙️ Configuration & Tuning

### Threshold Configuration

```javascript
const THUMBNAIL_CONFIG = {
    // STRICT MODE (Untuk anak/remaja)
    strict: {
        suspiciousThreshold: 0.20,      // 20% suspicious → block
        thumbnailScoreThreshold: 8,     // Score 8+ per image = suspicious
        minThumbnails: 10
    },

    // BALANCED MODE (Default)
    balanced: {
        suspiciousThreshold: 0.30,      // 30% suspicious → block
        thumbnailScoreThreshold: 10,    // Score 10+ per image = suspicious
        minThumbnails: 15
    },

    // LENIENT MODE (Untuk research/educational)
    lenient: {
        suspiciousThreshold: 0.50,      // 50% suspicious → block
        thumbnailScoreThreshold: 15,    // Score 15+ per image = suspicious
        minThumbnails: 20
    }
};

// Select mode
const mode = 'balanced';
const analyzer = new ThumbnailAnalyzer(THUMBNAIL_CONFIG[mode]);
```

### Pattern Tuning

```javascript
// Tambah pattern spesifik untuk bahasa/region
const INDONESIAN_PATTERNS = {
    tier1: [
        /bokep|ngentot|memek/i,
        /jav.*(?:sub|indo)/i,
        /abg.*(?:smp|sma)/i
    ],
    tier2: [
        /bugil|telanjang|mesum/i,
        /colmek|crot|desah/i
    ],
    tier3: [
        /seksi|panas|hot/i
    ]
};

// Merge dengan global patterns
const ALL_PATTERNS = {
    tier1: [...URL_PATTERNS.tier1, ...INDONESIAN_PATTERNS.tier1],
    tier2: [...URL_PATTERNS.tier2, ...INDONESIAN_PATTERNS.tier2],
    tier3: [...URL_PATTERNS.tier3, ...INDONESIAN_PATTERNS.tier3]
};
```

### Domain Whitelist/Blacklist

```javascript
// Custom domain lists
const CUSTOM_DOMAINS = {
    // Tambah trusted domains lokal
    trustedExtra: [
        'kemendikbud.go.id',
        'ui.ac.id',
        'itb.ac.id',
        'ugm.ac.id'
    ],

    // Tambah adult domains lokal
    adultExtra: [
        'bokep', 'indo', 'jav',
        'colmek', 'ngentot'
        // ... domain-domain local
    ]
};
```

---

## 🧪 Testing Guide

### Test Cases

```javascript
const TEST_CASES = [
    {
        name: 'Educational Art',
        query: 'nude renaissance art',
        mockThumbnails: [
            {
                src: 'wikipedia.org/venus.jpg',
                alt: 'The Birth of Venus by Botticelli',
                title: 'Renaissance painting',
                parentLink: 'wikipedia.org/wiki/The_Birth_of_Venus'
            },
            {
                src: 'metmuseum.org/nude_sculpture.jpg',
                alt: 'Classical Greek sculpture',
                title: 'Museum collection',
                parentLink: 'metmuseum.org/collection/greek-art'
            }
            // ... 20 more educational images
        ],
        expectedResult: {
            block: false,
            suspiciousRatio: '<10%'
        }
    },

    {
        name: 'Explicit Content',
        query: 'nude leaked photos',
        mockThumbnails: [
            {
                src: 'xxx-site.com/leaked123.jpg',
                alt: 'Hot nude photos leaked',
                title: 'Celebrity scandal',
                parentLink: 'xxx-site.com/gallery'
            },
            {
                src: 'adult-content.net/nude.jpg',
                alt: 'Explicit images 18+',
                title: 'Adult content',
                parentLink: 'adult-content.net'
            }
            // ... 20 more explicit images
        ],
        expectedResult: {
            block: true,
            suspiciousRatio: '>70%'
        }
    },

    {
        name: 'Mixed Content',
        query: 'nude bahasa',
        mockThumbnails: [
            // 15 educational images
            ...generateEducationalImages(15),
            // 5 questionable images
            ...generateQuestionableImages(5)
        ],
        expectedResult: {
            block: false,  // 25% suspicious
            suspiciousRatio: '25%'
        }
    }
];

// Run tests
async function runTests() {
    for (const testCase of TEST_CASES) {
        console.log(`\nTesting: ${testCase.name}`);

        const analyzer = new ThumbnailAnalyzer();

        // Mock the scraping function
        analyzer.scrapeThumbnails = () => testCase.mockThumbnails;
        analyzer.waitForThumbnails = async () => { };

        const result = await analyzer.analyze();

        console.log('Result:', result);
        console.log('Expected:', testCase.expectedResult);

        const passed = result.block === testCase.expectedResult.block;
        console.log(passed ? '✅ PASS' : '❌ FAIL');
    }
}
```

### Manual Testing Checklist

```
□ Test 1: Educational Query
Query: "nude in classical art"
Tab: Images
Expected: ALLOW(art context)
  
□ Test 2: Explicit Query
Query: "nude leaked scandal"
Tab: Images
Expected: BLOCK(explicit context)
  
□ Test 3: Borderline Query
Query: "nude bahasa"
Tab: Images
Expected: Depends on results(analyze thumbnails)
  
□ Test 4: Medical Query
Query: "nude medical anatomy"
Tab: Images
Expected: ALLOW(medical context)
  
□ Test 5: Safe Search Off
Query: "nude art" + safe=off
Tab: Images
Expected: BLOCK if > 30 % suspicious
    ```

---

## 🚀 Optimization

### Performance Optimization

```javascript
// 1. Limit number of thumbnails analyzed
const MAX_THUMBNAILS = 50;  // Analyze first 50 only

thumbnails = thumbnails.slice(0, MAX_THUMBNAILS);

// 2. Parallel processing
async function analyzeAllThumbnails(thumbnails) {
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < thumbnails.length; i += batchSize) {
        const batch = thumbnails.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(thumb => this.analyzeSingleThumbnail(thumb))
        );
        results.push(...batchResults);
    }

    return results;
}

// 3. Early exit if clearly suspicious
if (suspiciousCount > totalThumbnails * 0.5) {
    // Already >50% suspicious, no need to continue
    return { block: true, reason: 'Majority suspicious' };
}

// 4. Cache analysis results
const analysisCache = new Map();

function getCacheKey(thumbnail) {
    return `${thumbnail.src}_${thumbnail.alt}`;
}

if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey);
}
```

### Memory Optimization

```javascript
// Don't store full thumbnail elements
function scrapeThumbnails() {
    return Array.from(images).map(img => ({
        src: img.src,
        alt: img.alt,
        // Don't store: element, parentText (large)
    }));
}

// Clear cache periodically
setInterval(() => {
    if (analysisCache.size > 1000) {
        analysisCache.clear();
    }
}, 60000);  // Every minute
```

---

## 🔧 Troubleshooting

### Problem 1: Too Many False Positives

**Symptoms:** Educational content getting blocked

**Solutions:**
```javascript
// 1. Lower threshold
suspiciousThreshold: 0.40,  // from 0.30

// 2. Increase educational score
if (pattern.test(text)) {
    score += 10;  // from 5
}

// 3. Add more educational patterns
const MORE_EDU_PATTERNS = [
    /\b(tutorial|guide|lesson|course)\b/i,
    /\b(textbook|reference|encyclopedia)\b/i
];
```

### Problem 2: Too Many False Negatives

**Symptoms:** Explicit content getting through

**Solutions:**
```javascript
// 1. Raise threshold (more strict)
suspiciousThreshold: 0.20,  // from 0.30

// 2. Add more suspicious patterns
const MORE_SUSPICIOUS = [
    /\b(18\+|nsfw|explicit)\b/i,
    /\b(leaked|scandal|celebrity)\b/i
];

// 3. Lower per-thumbnail threshold
thumbnailScoreThreshold: 8,  // from 10
    ```

### Problem 3: Slow Performance

**Symptoms:** Analysis takes >5 seconds

**Solutions:**
```javascript
// 1. Reduce max thumbnails
const MAX_THUMBNAILS = 30;  // from 50

// 2. Reduce wait time
maxWaitTime: 3000,  // from 5000

// 3. Early exit
if (suspiciousCount > 15) {
    // Already enough evidence
    return { block: true };
}
```

### Problem 4: Not Enough Thumbnails

**Symptoms:** "Insufficient thumbnails" error

**Solutions:**
```javascript
// 1. Lower minimum requirement
minThumbnails: 5,  // from 10

    // 2. Increase wait time
    maxWaitTime: 7000,  // from 5000

// 3. Fallback to query analysis
if (thumbnails.length < minThumbnails) {
    console.warn('Using fallback query analysis');
    return analyzeQuery(query);  // Fallback to Strategy 2
}
```

---

## 📊 Logging & Monitoring

### Detailed Logging

```javascript
function logAnalysis(analysis, decision) {
    const log = {
        timestamp: new Date().toISOString(),
        query: currentQuery,
        totalThumbnails: analysis.totalThumbnails,
        suspiciousCount: analysis.suspiciousCount,
        suspiciousRatio: (analysis.suspiciousRatio * 100).toFixed(1) + '%',
        decision: decision.block ? 'BLOCK' : 'ALLOW',
        reason: decision.reason,
        topSuspicious: analysis.topSuspicious.map(r => ({
            src: r.thumbnail.src.substring(0, 80),
            score: r.score,
            flags: r.details.flags
        }))
    };

    console.log('[Thumbnail Analysis]', log);

    // Save to storage untuk review
    chrome.storage.local.get(['thumbnailLogs'], (result) => {
        const logs = result.thumbnailLogs || [];
        logs.push(log);

        // Keep last 50 logs
        if (logs.length > 50) logs.shift();

        chrome.storage.local.set({ thumbnailLogs: logs });
    });
}
```

### Dashboard untuk Review

```html
    < !--logs - viewer.html-- >
<div id="thumbnail-logs">
  <h2>Thumbnail Analysis Logs</h2>
  <table>
    <tr>
      <th>Time</th>
      <th>Query</th>
      <th>Thumbnails</th>
      <th>Suspicious</th>
      <th>Decision</th>
      <th>Reason</th>
    </tr>
    <!-- Populated by JS -->
  </table>
</div>

<script>
chrome.storage.local.get(['thumbnailLogs'], (result) => {
  const logs = result.thumbnailLogs || [];
  // Display in table
});
</script>
```

---

## ✅ Best Practices

### DO ✅

1. **Combine dengan Strategi lain**
   - Strategi 1 (Direct Block) untuk obvious cases
   - Strategi 3 (Thumbnail) untuk borderline cases

2. **Adjust threshold per use case**
   - Anak: 20% threshold (strict)
   - Dewasa: 30% threshold (balanced)
   - Research: 50% threshold (lenient)

3. **Monitor dan improve**
   - Log false positives
   - Update patterns regularly
   - Review top suspicious images

4. **Optimize performance**
   - Limit thumbnails analyzed
   - Cache results
   - Early exit when possible

### DON'T ❌

1. **Jangan analyze terlalu banyak images**
   - Max 50 thumbnails (performance)

2. **Jangan rely hanya pada thumbnail analysis**
   - Combine dengan query + domain analysis

3. **Jangan set threshold terlalu rendah**
   - <20% = too many false positives

4. **Jangan lupa fallback**
   - Jika scraping gagal, fallback ke strategi lain

---

## 📝 Summary

**Thumbnail Analysis** adalah strategi paling akurat tapi paling lambat. Best practices:

✅ Use sebagai **final verification** setelah Strategi 1 & 2
✅ Threshold default: **30% suspicious**
✅ Analyze max: **50 thumbnails**
✅ Timeout: **5 seconds**
✅ Always **log results** untuk improvement
✅ Combine dengan **educational context detection**

**Recommended Flow:**
```
Query dengan trigger keyword
    ↓
Strategi 1: Direct block ? → BLOCK
    ↓ No
Strategi 2: Adaptive scan → Score too high ? → BLOCK
    ↓ No
Strategi 3: Thumbnail analysis → > 30 % suspicious ? → BLOCK
    ↓ No
ALLOW
    ```

---

Semua clear? Ada yang mau ditambahkan atau diperjelas? 🚀@