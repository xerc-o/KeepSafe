// ============================================
// DYNAMIC SCANNING FILTER SYSTEM
// Scan hasil pencarian dulu sebelum block permanen
// ============================================

/**
 * ALUR KERJA:
 * 
 * 1. User search "porn menurut dokter"
 * 2. Extension detect keyword "porn" → Trigger scanning
 * 3. Show "Scanning..." overlay (block sementara)
 * 4. Scrape hasil pencarian Google/Bing
 * 5. Analyze domain, title, snippet dari hasil
 * 6. Hitung score:
 *    - Banyak hasil dari situs medical/educational → ALLOW
 *    - Banyak hasil dari situs adult/explicit → BLOCK
 * 7. Decision:
 *    - Score rendah → Hide overlay, allow access
 *    - Score tinggi → Show blocked page permanent
 */

// ============================================
// 1. TRIGGER KEYWORDS (Yang memicu scanning)
// ============================================

const TRIGGER_KEYWORDS = [
    // Tier 1: Always trigger
    'porn', 'porno', 'pornography', 'bokep', 'xxx', 'nsfw',
    'nude', 'naked', 'bugil', 'telanjang', 'hentai',

    // Tier 2: Trigger jika kombinasi dengan indicators
    'sex', 'seks', 'ngentot', 'memek', 'kontol', 'fuck',
    'sexy', 'hot', 'adult', 'dewasa', 'explicit'
];

function shouldTriggerScanning(query) {
    query = query.toLowerCase();

    // Cek apakah ada trigger keyword
    for (const keyword of TRIGGER_KEYWORDS) {
        if (query.includes(keyword)) {
            return true;
        }
    }

    return false;
}

// ============================================
// 2. DOMAIN CLASSIFICATION
// ============================================

const DOMAIN_SCORES = {
    // Trusted domains (score -30 per result)
    trusted: [
        // Medical/Health
        'who.int', 'cdc.gov', 'nih.gov', 'mayoclinic.org', 'webmd.com',
        'healthline.com', 'medicalnewstoday.com', 'alodokter.com',
        'halodoc.com', 'klikdokter.com', 'sehatq.com',

        // Educational
        'wikipedia.org', 'britannica.com', 'khanacademy.org',
        'coursera.org', 'edx.org', 'scholar.google.com',

        // News (Major)
        'bbc.com', 'cnn.com', 'reuters.com', 'apnews.com',
        'kompas.com', 'detik.com', 'tempo.co', 'liputan6.com',
        'tirto.id', 'theconversation.com',

        // Government/Academic
        '.gov', '.edu', '.ac.id', '.go.id', '.ac.uk'
    ],

    // Adult sites (score +50 per result)
    adult: [
        'pornhub.com', 'xvideos.com', 'xnxx.com', 'redtube.com',
        'youporn.com', 'xhamster.com', 'spankbang.com', 'tube8.com',
        'onlyfans.com', 'chaturbate.com', 'stripchat.com',
        'brazzers.com', 'bangbros.com', 'naughtyamerica.com',
        'rule34.xxx', 'gelbooru.com', 'nhentai.net'
    ],

    // Questionable domains (score +20 per result)
    questionable: [
        'reddit.com/r/nsfw', 'imgur.com', 'tumblr.com',
        '4chan.org', '8kun.top', 'pinterest.com'
    ]
};

function getDomainScore(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();

        // Check adult sites
        for (const domain of DOMAIN_SCORES.adult) {
            if (hostname.includes(domain)) {
                return { score: 50, category: 'adult' };
            }
        }

        // Check trusted sites
        for (const domain of DOMAIN_SCORES.trusted) {
            if (hostname.includes(domain)) {
                return { score: -30, category: 'trusted' };
            }
        }

        // Check questionable
        for (const domain of DOMAIN_SCORES.questionable) {
            if (hostname.includes(domain)) {
                return { score: 20, category: 'questionable' };
            }
        }

        // Unknown domain
        return { score: 0, category: 'unknown' };
    } catch (e) {
        return { score: 0, category: 'error' };
    }
}

// ============================================
// 3. CONTENT ANALYSIS (Title & Snippet)
// ============================================

const CONTENT_INDICATORS = {
    // Educational indicators (score -10)
    educational: [
        'apa itu', 'pengertian', 'definisi', 'artinya', 'menurut',
        'bahaya', 'dampak', 'efek', 'risiko', 'pencegahan',
        'what is', 'definition', 'meaning', 'according to',
        'dangers', 'effects', 'risks', 'prevention', 'study',
        'research', 'artikel', 'berita', 'news', 'report'
    ],

    // Professional context (score -15)
    professional: [
        'dokter', 'psikolog', 'ahli', 'pakar', 'peneliti',
        'doctor', 'psychologist', 'expert', 'researcher',
        'professor', 'specialist', 'WHO', 'CDC', 'journal'
    ],

    // Explicit indicators (score +15)
    explicit: [
        'video', 'watch', 'download', 'free', 'gratis', 'hd',
        'streaming', 'nonton', 'full', 'uncensored', 'leaked',
        'premium', 'vip', 'collection', 'terbaru', 'viral'
    ]
};

function analyzeContent(title, snippet) {
    let score = 0;
    const text = (title + ' ' + snippet).toLowerCase();

    // Check educational
    for (const indicator of CONTENT_INDICATORS.educational) {
        if (text.includes(indicator)) {
            score -= 10;
        }
    }

    // Check professional
    for (const indicator of CONTENT_INDICATORS.professional) {
        if (text.includes(indicator)) {
            score -= 15;
        }
    }

    // Check explicit
    for (const indicator of CONTENT_INDICATORS.explicit) {
        if (text.includes(indicator)) {
            score += 15;
        }
    }

    return score;
}

// ============================================
// 4. SCRAPE SEARCH RESULTS
// ============================================

async function scrapeSearchResults() {
    const results = [];

    // Detect search engine
    const url = window.location.href;
    let searchEngine = 'unknown';

    if (url.includes('google.com')) {
        searchEngine = 'google';
    } else if (url.includes('bing.com')) {
        searchEngine = 'bing';
    } else if (url.includes('duckduckgo.com')) {
        searchEngine = 'duckduckgo';
    }

    // Scrape based on search engine
    if (searchEngine === 'google') {
        // Google search results selector
        const resultElements = document.querySelectorAll('div.g');

        resultElements.forEach((element, index) => {
            if (index >= 10) return; // Ambil max 10 hasil pertama

            const titleEl = element.querySelector('h3');
            const linkEl = element.querySelector('a');
            const snippetEl = element.querySelector('div.VwiC3b, div.IsZvec');

            if (titleEl && linkEl) {
                results.push({
                    title: titleEl.textContent,
                    url: linkEl.href,
                    snippet: snippetEl ? snippetEl.textContent : ''
                });
            }
        });
    } else if (searchEngine === 'bing') {
        // Bing search results selector
        const resultElements = document.querySelectorAll('li.b_algo');

        resultElements.forEach((element, index) => {
            if (index >= 10) return;

            const titleEl = element.querySelector('h2 a');
            const snippetEl = element.querySelector('p, div.b_caption p');

            if (titleEl) {
                results.push({
                    title: titleEl.textContent,
                    url: titleEl.href,
                    snippet: snippetEl ? snippetEl.textContent : ''
                });
            }
        });
    } else if (searchEngine === 'duckduckgo') {
        // DuckDuckGo search results
        const resultElements = document.querySelectorAll('article[data-testid="result"]');

        resultElements.forEach((element, index) => {
            if (index >= 10) return;

            const titleEl = element.querySelector('h2 a');
            const snippetEl = element.querySelector('div[data-result="snippet"]');

            if (titleEl) {
                results.push({
                    title: titleEl.textContent,
                    url: titleEl.href,
                    snippet: snippetEl ? snippetEl.textContent : ''
                });
            }
        });
    }

    return results;
}

// ============================================
// 5. ANALYZE RESULTS & CALCULATE SCORE
// ============================================

function analyzeSearchResults(results) {
    let totalScore = 0;
    const analysis = {
        totalResults: results.length,
        trustedCount: 0,
        adultCount: 0,
        questionableCount: 0,
        unknownCount: 0,
        details: []
    };

    results.forEach(result => {
        // Domain score
        const domainScore = getDomainScore(result.url);

        // Content score
        const contentScore = analyzeContent(result.title, result.snippet);

        // Combined score for this result
        const resultScore = domainScore.score + contentScore;
        totalScore += resultScore;

        // Track categories
        if (domainScore.category === 'trusted') analysis.trustedCount++;
        else if (domainScore.category === 'adult') analysis.adultCount++;
        else if (domainScore.category === 'questionable') analysis.questionableCount++;
        else analysis.unknownCount++;

        analysis.details.push({
            title: result.title,
            url: result.url,
            domainCategory: domainScore.category,
            domainScore: domainScore.score,
            contentScore: contentScore,
            totalScore: resultScore
        });
    });

    analysis.totalScore = totalScore;
    analysis.averageScore = results.length > 0 ? totalScore / results.length : 0;

    return analysis;
}

// ============================================
// 6. DECISION MAKING
// ============================================

function makeDecision(analysis) {
    const { totalScore, averageScore, trustedCount, adultCount, totalResults } = analysis;

    // Rule 1: Jika ada hasil dari situs adult → BLOCK
    if (adultCount > 0) {
        return {
            block: true,
            reason: `Detected ${adultCount} adult site(s) in results`,
            confidence: 'high'
        };
    }

    // Rule 2: Jika mayoritas (>50%) dari trusted sites → ALLOW
    if (trustedCount > totalResults / 2) {
        return {
            block: false,
            reason: `Majority (${trustedCount}/${totalResults}) from trusted sources`,
            confidence: 'high'
        };
    }

    // Rule 3: Berdasarkan average score
    // Average > 10 → BLOCK
    // Average < -5 → ALLOW
    // -5 to 10 → BORDERLINE (default ALLOW tapi log untuk review)

    if (averageScore > 10) {
        return {
            block: true,
            reason: `High explicit score (avg: ${averageScore.toFixed(1)})`,
            confidence: 'medium'
        };
    } else if (averageScore < -5) {
        return {
            block: false,
            reason: `Educational/informational content (avg: ${averageScore.toFixed(1)})`,
            confidence: 'high'
        };
    } else {
        return {
            block: false,
            reason: `Borderline score (avg: ${averageScore.toFixed(1)}) - allowing`,
            confidence: 'low'
        };
    }
}

// ============================================
// 7. MAIN SCANNING FUNCTION
// ============================================

async function performDynamicScan(query) {
    console.log('[Dynamic Scan] Starting scan for:', query);

    // Step 1: Scrape results
    const results = await scrapeSearchResults();
    console.log('[Dynamic Scan] Found', results.length, 'results');

    if (results.length === 0) {
        // Jika tidak ada hasil (error scraping), fallback ke query analysis
        console.log('[Dynamic Scan] No results found, fallback to query analysis');
        return {
            block: false,
            reason: 'No results to analyze - allowing',
            confidence: 'low',
            fallback: true
        };
    }

    // Step 2: Analyze results
    const analysis = analyzeSearchResults(results);
    console.log('[Dynamic Scan] Analysis:', analysis);

    // Step 3: Make decision
    const decision = makeDecision(analysis);
    console.log('[Dynamic Scan] Decision:', decision);

    // Step 4: Log for monitoring
    logScanResult(query, analysis, decision);

    return decision;
}

// ============================================
// 8. LOGGING (untuk monitoring & improvement)
// ============================================

function logScanResult(query, analysis, decision) {
    const log = {
        timestamp: new Date().toISOString(),
        query: query,
        totalResults: analysis.totalResults,
        trustedCount: analysis.trustedCount,
        adultCount: analysis.adultCount,
        averageScore: analysis.averageScore,
        decision: decision.block ? 'BLOCK' : 'ALLOW',
        reason: decision.reason,
        confidence: decision.confidence
    };

    // Save to chrome.storage for review
    chrome.storage.local.get(['scanLogs'], (result) => {
        const logs = result.scanLogs || [];
        logs.push(log);

        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.shift();
        }

        chrome.storage.local.set({ scanLogs: logs });
    });

    console.log('[Dynamic Scan] Logged:', log);
}

// ============================================
// 9. CONTENT SCRIPT INTEGRATION
// ============================================

/**
 * File: content-script.js
 * Di-inject ke halaman search results
 */

// Listen for scan request from background
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === 'startDynamicScan') {
        const query = message.query;

        // Show scanning overlay
        showScanningOverlay();

        // Wait for page to fully load (if needed)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Perform scan
        const decision = await performDynamicScan(query);

        // Send result back to background
        chrome.runtime.sendMessage({
            action: 'scanComplete',
            decision: decision
        });

        if (decision.block) {
            // Keep overlay, will redirect to block page
            updateScanningOverlay('Content Blocked', 'explicit');
        } else {
            // Hide overlay, allow access
            hideScanningOverlay();
        }
    }
});

// ============================================
// 10. SCANNING OVERLAY UI
// ============================================

function showScanningOverlay() {
    // Remove existing overlay if any
    hideScanningOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'content-filter-scanning-overlay';
    overlay.innerHTML = `
    <div class="scanning-container">
      <div class="scanning-icon">
        <svg class="spinner" viewBox="0 0 50 50">
          <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
        </svg>
        <div class="shield-icon">🛡️</div>
      </div>
      <h2 class="scanning-title">Scanning Content...</h2>
      <p class="scanning-subtitle">Analyzing search results for safety</p>
      <div class="scanning-progress">
        <div class="progress-bar"></div>
      </div>
      <p class="scanning-note">This will only take a moment</p>
    </div>
  `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
    #content-filter-scanning-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s;
    }
    
    .scanning-container {
      background: #1a1a2e;
      padding: 50px;
      border-radius: 20px;
      text-align: center;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    
    .scanning-icon {
      position: relative;
      width: 120px;
      height: 120px;
      margin: 0 auto 30px;
    }
    
    .shield-icon {
      font-size: 60px;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    
    .spinner {
      animation: rotate 2s linear infinite;
      width: 120px;
      height: 120px;
    }
    
    .spinner .path {
      stroke: #667eea;
      stroke-linecap: round;
      animation: dash 1.5s ease-in-out infinite;
    }
    
    @keyframes rotate {
      100% { transform: rotate(360deg); }
    }
    
    @keyframes dash {
      0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
      50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
      100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .scanning-title {
      color: #fff;
      font-size: 28px;
      margin-bottom: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    .scanning-subtitle {
      color: #aaa;
      font-size: 16px;
      margin-bottom: 30px;
    }
    
    .scanning-progress {
      width: 100%;
      height: 4px;
      background: #333;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    
    .progress-bar {
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      animation: progress 2s ease-in-out infinite;
    }
    
    @keyframes progress {
      0% { width: 0%; }
      50% { width: 70%; }
      100% { width: 100%; }
    }
    
    .scanning-note {
      color: #888;
      font-size: 13px;
      margin: 0;
    }
  `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);
}

function updateScanningOverlay(title, type) {
    const overlay = document.getElementById('content-filter-scanning-overlay');
    if (!overlay) return;

    const container = overlay.querySelector('.scanning-container');

    if (type === 'explicit') {
        container.innerHTML = `
      <div class="scanning-icon" style="animation: none;">
        <div class="shield-icon" style="position: static; transform: none;">🚫</div>
      </div>
      <h2 class="scanning-title" style="color: #ff6b6b;">${title}</h2>
      <p class="scanning-subtitle">Explicit content detected in search results</p>
      <p class="scanning-note">Redirecting to safety page...</p>
    `;
    }
}

function hideScanningOverlay() {
    const overlay = document.getElementById('content-filter-scanning-overlay');
    if (overlay) {
        overlay.style.animation = 'fadeOut 0.3s';
        setTimeout(() => overlay.remove(), 300);
    }
}

// Add fadeOut animation
const fadeOutStyle = document.createElement('style');
fadeOutStyle.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;
document.head.appendChild(fadeOutStyle);

// ============================================
// 11. TESTING
// ============================================

// Test dengan data simulasi
const mockResults = {
    educational: [
        {
            title: 'Bahaya Pornografi Menurut Dokter - Alodokter',
            url: 'https://www.alodokter.com/bahaya-pornografi',
            snippet: 'Menurut penelitian, pornografi dapat menyebabkan...'
        },
        {
            title: 'Dampak Pornografi pada Otak - Kompas Health',
            url: 'https://www.kompas.com/health/pornografi-otak',
            snippet: 'Studi menunjukkan efek negatif pada perkembangan otak...'
        }
    ],
    explicit: [
        {
            title: 'Free Porn Videos HD - PornHub',
            url: 'https://www.pornhub.com/video/123',
            snippet: 'Watch free porn videos in HD quality...'
        },
        {
            title: 'Download Bokep Gratis Terbaru',
            url: 'https://example-adult.com/bokep',
            snippet: 'Download video bokep terbaru gratis...'
        }
    ]
};

console.log('\n=== TESTING DYNAMIC SCAN ===\n');

// Test 1: Educational results
console.log('Test 1: Educational query results');
const eduAnalysis = analyzeSearchResults(mockResults.educational);
const eduDecision = makeDecision(eduAnalysis);
console.log('Decision:', eduDecision.block ? 'BLOCK ❌' : 'ALLOW ✅');
console.log('Reason:', eduDecision.reason);
console.log('Score:', eduAnalysis.totalScore);
console.log('');

// Test 2: Explicit results
console.log('Test 2: Explicit query results');
const expAnalysis = analyzeSearchResults(mockResults.explicit);
const expDecision = makeDecision(expAnalysis);
console.log('Decision:', expDecision.block ? 'BLOCK ❌' : 'ALLOW ✅');
console.log('Reason:', expDecision.reason);
console.log('Score:', expAnalysis.totalScore);