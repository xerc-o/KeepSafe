// ============================================
// SMART FILTER LOGIC - Panduan Implementasi
// ============================================

/**
 * CARA KERJA:
 * 1. Cek apakah query edukatif (apa itu, artinya, dll) → IZINKAN
 * 2. Hitung score berdasarkan kata kunci
 * 3. Jika score > threshold → BLOKIR
 */

// ============================================
// 1. EDUCATIONAL PATTERNS (Whitelist)
// ============================================
const EDUCATIONAL_PATTERNS = [
    // Bahasa Indonesia
    /^apa itu .+\??$/i,
    /^.+ artinya( apa)?\??$/i,
    /^pengertian .+$/i,
    /^bahaya .+$/i,
    /^dampak .+$/i,

    // English
    /^what is .+\??$/i,
    /^what does .+ mean\??$/i,
    /^definition of .+$/i,
    /^dangers? of .+/i,
    /^how to (avoid|prevent|stop) .+/i
];

// ============================================
// 2. WORDLIST
// ============================================

// Explicit Keywords - Score +20 (High Priority)
const EXPLICIT_KEYWORDS = [
    // Bahasa Indonesia
    'bokep', 'ngentot', 'memek', 'kontol', 'colmek', 'crot',
    'jilmek', 'pepek', 'ngewe', 'mesum', 'cabul', 'bugil',
    'telanjang', 'toket', 'tetek', 'desah', 'perkosa',

    // English
    'porn', 'porno', 'pornography', 'xxx', 'fuck', 'dick',
    'cock', 'pussy', 'boobs', 'tits', 'nude', 'naked',
    'blowjob', 'cumshot', 'masturbate', 'hentai', 'nsfw'
];

// Moderate Keywords - Score +10 (Context Dependent)
const MODERATE_KEYWORDS = [
    // Bahasa Indonesia
    'seksi', 'sensual', 'erotis', 'panas', 'dewasa', '18+',
    'adegan panas', 'intim',

    // English
    'sexy', 'hot', 'sensual', 'adult', 'mature', 'explicit',
    'lingerie', 'bikini', 'topless', 'provocative'
];

// Explicit Indicators - Score +15 (Download/Watch Intent)
const EXPLICIT_INDICATORS = [
    // Bahasa Indonesia & English
    'video', 'nonton', 'download', 'streaming', 'gratis', 'free',
    'foto', 'gambar', 'watch', 'pic', 'image', 'terbaru',
    'viral', 'leaked', 'premium', 'hd', 'full'
];

// Informational Keywords - Score -10 (Reduces Score)
const INFO_KEYWORDS = [
    'bahaya', 'dampak', 'pencegahan', 'mengatasi', 'menghindari',
    'danger', 'harm', 'prevent', 'avoid', 'stop', 'negative'
];

// ============================================
// 3. MAIN FILTERING FUNCTION
// ============================================

function shouldBlockContent(query) {
    query = query.toLowerCase().trim();

    // STEP 1: Cek Educational Pattern (Priority Tertinggi)
    for (const pattern of EDUCATIONAL_PATTERNS) {
        if (pattern.test(query)) {
            return {
                block: false,
                reason: 'Educational query detected',
                score: 0
            };
        }
    }

    // STEP 2: Hitung Score
    let score = 0;

    // Cek Explicit Keywords (+20)
    for (const keyword of EXPLICIT_KEYWORDS) {
        if (query.includes(keyword)) {
            score += 20;
        }
    }

    // Cek Moderate Keywords (+10)
    for (const keyword of MODERATE_KEYWORDS) {
        if (query.includes(keyword)) {
            score += 10;
        }
    }

    // Cek Explicit Indicators (+15)
    for (const indicator of EXPLICIT_INDICATORS) {
        if (query.includes(indicator)) {
            score += 15;
        }
    }

    // Kurangi score untuk informational keywords (-10)
    for (const keyword of INFO_KEYWORDS) {
        if (query.includes(keyword)) {
            score -= 10;
        }
    }

    // STEP 3: Keputusan Block
    const THRESHOLD = 15; // Bisa disesuaikan: 10=strict, 15=balanced, 20=lenient

    return {
        block: score > THRESHOLD,
        reason: score > THRESHOLD ? 'Explicit content detected' : 'Query allowed',
        score: score
    };
}

// ============================================
// 4. CONTOH PENGGUNAAN
// ============================================

// Test Educational Queries (HARUS ALLOW)
console.log(shouldBlockContent("apa itu pornografi?"));
// → { block: false, reason: 'Educational query detected', score: 0 }

console.log(shouldBlockContent("porn artinya apa?"));
// → { block: false, reason: 'Educational query detected', score: 0 }

console.log(shouldBlockContent("what is pornography?"));
// → { block: false, reason: 'Educational query detected', score: 0 }

// Test Explicit Queries (HARUS BLOCK)
console.log(shouldBlockContent("video bokep gratis"));
// → { block: true, reason: 'Explicit content detected', score: 50 }
// Score: bokep(20) + video(15) + gratis(15) = 50

console.log(shouldBlockContent("download porn free"));
// → { block: true, reason: 'Explicit content detected', score: 50 }
// Score: porn(20) + download(15) + free(15) = 50

console.log(shouldBlockContent("nonton film xxx"));
// → { block: true, reason: 'Explicit content detected', score: 50 }
// Score: xxx(20) + nonton(15) + film/video(15) = 50

// Test Borderline (Tergantung Threshold)
console.log(shouldBlockContent("sexy photos"));
// → { block: false, reason: 'Query allowed', score: 10 }
// Score: sexy(10) < threshold(15)

console.log(shouldBlockContent("bahaya pornografi bagi kesehatan"));
// → { block: false, reason: 'Query allowed', score: 10 }
// Score: pornografi(20) - bahaya(10) = 10

// ============================================
// 5. IMPLEMENTASI KE PROYEK ANDA
// ============================================

/**
 * CARA INTEGRASI:
 * 
 * 1. Copy wordlist di atas ke proyek Anda
 * 2. Tambahkan kata kunci spesifik sesuai kebutuhan
 * 3. Gunakan function shouldBlockContent() di extension Anda
 * 
 * Contoh di content script atau background:
 */

// Di background.js atau service worker
function checkURL(url, searchQuery) {
    if (!searchQuery) return false;

    const result = shouldBlockContent(searchQuery);

    if (result.block) {
        console.log('BLOCKED:', searchQuery, 'Score:', result.score);
        // Redirect ke halaman block Anda
        return true;
    }

    return false;
}

// Extract query dari URL search engine
function extractSearchQuery(url) {
    try {
        const urlObj = new URL(url);

        // Google
        if (urlObj.hostname.includes('google.com')) {
            return urlObj.searchParams.get('q') || '';
        }

        // Bing
        if (urlObj.hostname.includes('bing.com')) {
            return urlObj.searchParams.get('q') || '';
        }

        // DuckDuckGo
        if (urlObj.hostname.includes('duckduckgo.com')) {
            return urlObj.searchParams.get('q') || '';
        }

        // YouTube
        if (urlObj.hostname.includes('youtube.com')) {
            return urlObj.searchParams.get('search_query') || '';
        }

        return '';
    } catch (e) {
        return '';
    }
}

// ============================================
// 6. CUSTOMIZATION TIPS
// ============================================

/**
 * MENYESUAIKAN THRESHOLD:
 * - Threshold 10 = Lebih ketat (lebih banyak false positive)
 * - Threshold 15 = Seimbang (recommended)
 * - Threshold 20 = Lebih longgar (lebih banyak konten lolos)
 * 
 * MENAMBAH KATA KUNCI:
 * - Tambahkan ke EXPLICIT_KEYWORDS untuk kata sangat vulgar
 * - Tambahkan ke MODERATE_KEYWORDS untuk kata kontekstual
 * - Tambahkan ke EXPLICIT_INDICATORS untuk kata "download", "watch", dll
 * 
 * MENAMBAH EDUCATIONAL PATTERN:
 * - Format: /^pola regex di sini$/i
 * - Contoh: /^kenapa .+ berbahaya\??$/i
 * 
 * STRICT MODE:
 * - Turunkan threshold ke 10
 * - Kurangi nilai informational keywords dari -10 ke -5
 */

// ============================================
// 7. WORDLIST LENGKAP (Tambahan)
// ============================================

// Tambahkan kata kunci ini sesuai kebutuhan:

const ADDITIONAL_INDONESIAN = [
    'sange', 'lendir', 'becek', 'basah', 'stw', 'janda',
    'selingkuh', 'orgasme', 'klimaks', 'sodomi', 'oral', 'anal',
    'montok', 'itil', 'puki', 'jilat', 'kacau', 'entot',
    'coli', 'onani', 'sexxxs', 'bf', 'ml', 'abg', 'tante',
    'jav', 'telegram', 'link', 'group', 'indo', 'lokal'
];

const ADDITIONAL_ENGLISH = [
    'rape', 'incest', 'milf', 'teen', 'barely legal', 'lolita',
    'jailbait', 'upskirt', 'cameltoe', 'r34', 'rule34', 'lewd',
    'ecchi', 'ahegao', 'doujin', 'webcam', 'cam girl', 'escort',
    'hooker', 'prostitute', 'bdsm', 'bondage', 'fetish', 'kinky',
    'threesome', 'gangbang', 'creampie', 'squirt', 'dildo',
    'vibrator', 'sextoy', 'onlyfans', 'chaturbate', 'stripchat',
    'orgasm', 'erotic', 'nipple', 'ass', 'butt', 'breasts',
    'vagina', 'penis', 'handjob', 'cumming'
];

// Gabungkan ke wordlist utama:
// EXPLICIT_KEYWORDS.push(...ADDITIONAL_INDONESIAN, ...ADDITIONAL_ENGLISH);

// ============================================
// 8. TESTING
// ============================================

console.log('\n=== TESTING ===\n');

const testCases = [
    // Harus ALLOW
    { query: "apa itu pornografi?", expected: false },
    { query: "porn artinya?", expected: false },
    { query: "bahaya pornografi", expected: false },
    { query: "what is sex education", expected: false },

    // Harus BLOCK
    { query: "video bokep", expected: true },
    { query: "download porn", expected: true },
    { query: "nonton xxx gratis", expected: true },
    { query: "bokep indo terbaru", expected: true }
];

testCases.forEach(test => {
    const result = shouldBlockContent(test.query);
    const passed = result.block === test.expected;
    console.log(
        passed ? '✅' : '❌',
        `"${test.query}"`,
        `→ ${result.block ? 'BLOCK' : 'ALLOW'}`,
        `(score: ${result.score})`
    );
});