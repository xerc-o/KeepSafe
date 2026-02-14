/**
 * Shared Utilities for Link Verifier
 */

var Utils = {
    TRUSTED_DOMAINS: [
        // Global Giants & Search
        'google.com', 'google.co.id', 'youtube.com', 'facebook.com', 'instagram.com',
        'twitter.com', 'whatsapp.com', 'linkedin.com', 'microsoft.com', 'apple.com',
        'wikipedia.org', 'wikipedia.com', 'wikimedia.org', // Reference

        // Indonesian Specific
        'lynk.id', 'bca.co.id', 'klikbca.com', 'bankmandiri.co.id', 'bni.co.id', 'bri.co.id', // Banks
        'tokopedia.com', 'shopee.co.id', 'lazada.co.id', 'blibli.com', 'bukalapak.com', // E-commerce
        'gojek.com', 'grab.com', 'traveloka.com', 'tiket.com', // Top Local
        'detik.com', 'kompas.com', 'liputan6.com', 'tempo.co', // News

        // Global News & Reference
        'bbc.com', 'bbc.co.uk', 'reuters.com', 'bloomberg.com', 'nytimes.com',
        'theguardian.com', 'forbes.com', 'britannica.com', 'nationalgeographic.com',

        // International E-commerce
        'amazon.com', 'ebay.com', 'aliexpress.com', 'walmart.com', 'bestbuy.com', 'taobao.com'
    ],

    // TRIGGER KEYWORDS (For Dynamic Scanning)
    TRIGGER_KEYWORDS: [
        'porn', 'porno', 'pornography', 'bokep', 'xxx', 'nsfw',
        'nude', 'naked', 'bugil', 'telanjang', 'hentai',
        'sex', 'seks', 'ngentot', 'memek', 'kontol', 'fuck',
        'sexy', 'hot', 'adult', 'dewasa', 'explicit'
    ],

    shouldTriggerScanning: function (query) {
        if (!query) return false;
        const low = query.toLowerCase();
        return this.TRIGGER_KEYWORDS.some(kw => low.includes(kw));
    },

    isTrusted: function (domain) {
        const base = this.getBaseDomain(domain);
        return this.TRUSTED_DOMAINS.includes(base);
    },
    DOMAIN_SCORES: {
        trusted: [
            'who.int', 'cdc.gov', 'nih.gov', 'mayoclinic.org', 'webmd.com',
            'healthline.com', 'medicalnewstoday.com', 'alodokter.com',
            'halodoc.com', 'klikdokter.com', 'sehatq.com',
            'wikipedia.org', 'britannica.com', 'khanacademy.org',
            'coursera.org', 'edx.org', 'scholar.google.com',
            'bbc.com', 'cnn.com', 'reuters.com', 'apnews.com',
            'kompas.com', 'detik.com', 'tempo.co', 'liputan6.com',
            'tirto.id', 'theconversation.com'
        ],
        adult: [
            'pornhub.com', 'xvideos.com', 'xnxx.com', 'redtube.com',
            'youporn.com', 'xhamster.com', 'spankbang.com', 'tube8.com',
            'onlyfans.com', 'chaturbate.com', 'stripchat.com',
            'brazzers.com', 'bangbros.com', 'naughtyamerica.com',
            'rule34.xxx', 'gelbooru.com', 'nhentai.net'
        ],
        questionable: [
            'reddit.com/r/nsfw', 'imgur.com', 'tumblr.com',
            '4chan.org', '8kun.top', 'pinterest.com'
        ]
    },

    CONTENT_INDICATORS: {
        educational: [
            'apa itu', 'pengertian', 'definisi', 'artinya', 'menurut',
            'bahaya', 'dampak', 'efek', 'risiko', 'pencegahan',
            'what is', 'definition', 'meaning', 'according to',
            'dangers', 'effects', 'risks', 'prevention', 'study',
            'research', 'artikel', 'berita', 'news', 'report'
        ],
        professional: [
            'dokter', 'psikolog', 'ahli', 'pakar', 'peneliti',
            'doctor', 'psychologist', 'expert', 'researcher',
            'professor', 'specialist', 'WHO', 'CDC', 'journal'
        ],
        explicit: [
            'video', 'watch', 'download', 'free', 'gratis', 'hd',
            'streaming', 'nonton', 'full', 'uncensored', 'leaked',
            'premium', 'vip', 'collection', 'terbaru', 'viral',
            'porn', 'porno', 'bokep', 'xxx', 'nsfw', 'nude', 'naked',
            'bugil', 'telanjang', 'hentai', 'sex', 'seks', 'ngentot',
            'memek', 'kontol', 'fuck', 'adult', 'explicit'
        ]
    },

    getDomainScore: function (url) {
        try {
            const hostname = new URL(url).hostname.toLowerCase();
            for (const domain of this.DOMAIN_SCORES.adult) {
                if (hostname.includes(domain)) return { score: 50, category: 'adult' };
            }
            for (const domain of this.DOMAIN_SCORES.trusted) {
                if (hostname.includes(domain)) return { score: -30, category: 'trusted' };
            }
            for (const domain of this.DOMAIN_SCORES.questionable) {
                if (hostname.includes(domain)) return { score: 20, category: 'questionable' };
            }
            return { score: 0, category: 'unknown' };
        } catch (e) { return { score: 0, category: 'error' }; }
    },

    analyzeContent: function (title, snippet) {
        let score = 0;
        const text = (title + ' ' + (snippet || '')).toLowerCase();
        this.CONTENT_INDICATORS.educational.forEach(kw => { if (text.includes(kw)) score -= 10; });
        this.CONTENT_INDICATORS.professional.forEach(kw => { if (text.includes(kw)) score -= 15; });
        this.CONTENT_INDICATORS.explicit.forEach(kw => { if (text.includes(kw)) score += 15; });
        return score;
    },

    analyzeSearchResults: function (results) {
        let totalScore = 0;
        let adultCount = 0;
        let trustedCount = 0;

        const details = results.map(result => {
            const dScore = this.getDomainScore(result.url);
            const cScore = this.analyzeContent(result.title, result.snippet);
            const resScore = dScore.score + cScore;
            totalScore += resScore;
            if (dScore.category === 'adult') adultCount++;
            if (dScore.category === 'trusted') trustedCount++;
            return { resScore, category: dScore.category };
        });

        const avg = results.length > 0 ? totalScore / results.length : 0;
        return { totalScore, averageScore: avg, adultCount, trustedCount, totalResults: results.length };
    },

    makeDecision: function (analysis) {
        const { averageScore, adultCount, trustedCount, totalResults } = analysis;
        if (adultCount > 0) return { block: true, reason: `Adult content detected (${adultCount} sites)` };
        if (trustedCount > totalResults / 2) return { block: false, reason: 'Predominantly trusted sources' };

        if (averageScore > 10) return { block: true, reason: 'High explicit score' };
        if (averageScore < -5) return { block: false, reason: 'Educational content' };
        return { block: false, reason: 'Borderline - allowing' };
    },

    /**
     * Extracts the base domain from a hostname (e.g., mail.google.com -> google.com)
     * Handles common double TLDs like .co.id
     */
    getBaseDomain: function (host) {
        if (!host) return '';
        const parts = host.toLowerCase().split('.');
        if (parts.length <= 2) return host.toLowerCase();

        // Handle common double TLDs (length <= 3 for pen-ultimate if it's a known pattern)
        const pen = parts[parts.length - 2];
        if (pen.length <= 3 && parts.length >= 3) {
            return parts.slice(-3).join('.');
        }
        return parts.slice(-2).join('.');
    },

    /**
     * Checks if a domain or its parent domains are in the blacklist
     */
    checkBlacklist: function (domain, blacklistData) {
        if (!blacklistData || !blacklistData.domains) return null;

        // Direct domain match
        if (blacklistData.domains.includes(domain)) {
            return blacklistData.categories[domain] || 'danger';
        }

        // Subdomain match (e.g., test.zeus88.com)
        for (const blackDomain of blacklistData.domains) {
            if (domain.endsWith('.' + blackDomain)) {
                return blacklistData.categories[blackDomain] || 'danger';
            }
        }
        return null;
    },

    /**
     * Returns a human-readable label for a threat category
     */
    getCategoryLabel: function (category) {
        const labels = {
            'gambling': 'GAMBLING',
            'suspicious': 'SUSPICIOUS',
            'porn': 'PORN',
            'phishing': 'SUSPICIOUS', // Reclassified
            'trusted': 'TRUSTED'
        };
        return labels[category] || category.toUpperCase();
    },

    /**
     * Calculates Shannon Entropy of a string (randomness check)
     */
    calculateShannonEntropy: function (str) {
        const len = str.length;
        if (len === 0) return 0;
        const frequencies = {};
        for (let i = 0; i < len; i++) {
            const char = str[i];
            frequencies[char] = (frequencies[char] || 0) + 1;
        }
        let entropy = 0;
        for (const char in frequencies) {
            const p = frequencies[char] / len;
            entropy -= p * Math.log2(p);
        }
        return entropy;
    },

    /**
     * Runs heuristic analysis on a URL and hostname
     */
    getHeuristicScore: function (url, domain) {
        let score = 0;
        const domainParts = domain.split('.');
        const coreDomain = domainParts.length > 2 ? domainParts[domainParts.length - 2] : domainParts[0];
        const entropy = this.calculateShannonEntropy(coreDomain);

        if (entropy > 4.5) score += 20;

        const subdomainCount = domain.split('.').length - 2;
        if (subdomainCount > 3) score += 15;

        const weakKeywords = ['bola', 'toto', 'play', 'vip', 'club', 'asia', 'mpo', 'indo'];
        const strongKeywords = ['slot', 'gacor', 'maxwin', 'parlay', 'depo', 'wd', 'bet', 'casino', 'poker', 'togel', 'jackpot', 'zeus', 'pragmatic'];

        let keywordScore = 0;
        const lowerUrl = url.toLowerCase();

        // Use word boundaries for short keywords to avoid matching inside long random strings/tokens
        weakKeywords.forEach(kw => {
            const regex = kw.length <= 3 ? new RegExp(`\\b${kw}\\b`, 'i') : new RegExp(kw, 'i');
            if (regex.test(lowerUrl)) keywordScore += 5;
        });
        strongKeywords.forEach(kw => {
            const regex = kw.length <= 3 ? new RegExp(`\\b${kw}\\b`, 'i') : new RegExp(kw, 'i');
            if (regex.test(lowerUrl)) keywordScore += 15;
        });

        score += keywordScore;
        return { score, entropy };
    },

    /**
     * Safe DOM manipulation to prevent XSS
     */
    safeSetInnerHTML: function (element, html) {
        // Implementation note: For simple cases textContent is safer,
        // but for templates we use a controlled approach.
        // This helper will be used for complex UI updates.
        element.innerHTML = html; // Placeholder - will refine with sanitizer or safer construction
    },

    isGamblingText: function (t) {
        const k = ['slot', 'gacor', 'judol', 'maxwin', 'bet', 'deposit', 'wd', 'casino', 'poker', 'togel', 'link alternatif', 'dana', 'zeus'];
        // For very short strings like jp, use more specific check or boundary
        if (t.toLowerCase().includes('jp')) {
            if (/\bjp\b/i.test(t) || t.toLowerCase().includes('jackpot')) return true;
        }
        return k.some(s => {
            if (s.length <= 3) return new RegExp(`\\b${s}\\b`, 'i').test(t);
            return t.toLowerCase().includes(s);
        });
    },

    /**
     * SMART FILTER LOGIC: Scoring-based porn detection
     */
    shouldBlockPorn: function (query) {
        if (!query) return { block: false, score: 0 };
        const q = query.toLowerCase().trim();

        // 1. Educational Bypass (Priority)
        if (this.isEducationalQuery(q)) {
            return { block: false, reason: 'Educational query', score: 0 };
        }

        // 2. Wordlists
        const EXPLICIT = [
            'bokep', 'ngentot', 'memek', 'kontol', 'colmek', 'crot', 'jilmek', 'pepek', 'ngewe', 'mesum',
            'cabul', 'bugil', 'telanjang', 'toket', 'tetek', 'desah', 'perkosa', 'porn', 'porno',
            'pornography', 'xxx', 'fuck', 'dick', 'cock', 'pussy', 'boobs', 'tits', 'nude', 'naked',
            'blowjob', 'cumshot', 'masturbate', 'hentai', 'nsfw', 'nxnn', 'ngetod', 'colik', 'naked', 'blue film'
        ];
        const MODERATE = [
            'seksi', 'sensual', 'erotis', 'panas', 'dewasa', '18+', 'adegan panas', 'intim', 'sexy',
            'hot', 'adult', 'mature', 'explicit', 'lingerie', 'bikini', 'topless', 'provocative', 'semi'
        ];
        const INDICATORS = [
            'video', 'nonton', 'download', 'streaming', 'gratis', 'free', 'foto', 'gambar', 'watch',
            'pic', 'image', 'terbaru', 'viral', 'leaked', 'premium', 'hd', 'full'
        ];
        const INFO = [
            'bahaya', 'dampak', 'pencegahan', 'mengatasi', 'menghindari', 'danger', 'harm',
            'prevent', 'avoid', 'stop', 'negative', 'bahasa', 'terjemahan', 'translate',
            'maksud', 'arti', 'english'
        ];

        let score = 0;
        EXPLICIT.forEach(kw => {
            if (q.includes(kw)) score += 20;
        });
        MODERATE.forEach(kw => {
            if (q.includes(kw)) score += 10;
        });
        INDICATORS.forEach(kw => {
            if (q.includes(kw)) score += 15;
        });
        INFO.forEach(kw => {
            if (q.includes(kw)) score -= 10;
        });

        const THRESHOLD = 15;
        return {
            block: score > THRESHOLD,
            reason: score > THRESHOLD ? 'Explicit content detected' : 'Allowed',
            score: score
        };
    },

    isPornText: function (t) {
        return this.shouldBlockPorn(t).block;
    },

    /**
     * Detects if the query is educational rather than seeking content
     */
    isEducationalQuery: function (t) {
        const low = t.toLowerCase().trim();
        const patterns = [
            // Bahasa Indonesia
            /^apa itu .+\??$/i,
            /^.+ artinya( apa)?\??$/i,
            /^apa arti .+\??$/i,
            /^apa maksud .+\??$/i,
            /^.+ (bahasa|terjemahan|translate).*\??$/i,
            /^pengertian .+$/i,
            /^bahaya .+$/i,
            /^dampak .+$/i,
            /definisi/i,
            /maksud/i,
            /adalah/i,
            /sejarah/i,
            /dictionary/i,
            /kamus/i,
            /wiki/i,
            /bagaimana cara/i,

            // English
            /^what is .+\??$/i,
            /^what does .+ mean\??$/i,
            /^definition of .+$/i,
            /^dangers? of .+/i,
            /^how to (avoid|prevent|stop) .+/i,
            /^.+ (meaning|translation|translate).*\??$/i,
            /history of/i
        ];
        return patterns.some(p => p.test(low));
    },

    /**
     * Extracts search query from search engine URLs
     */
    getSearchQuery: function (url) {
        try {
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.search);
            // Common search engine query parameters
            const queryParams = ['q', 'query', 'p', 'search_query', 'wd'];
            for (const param of queryParams) {
                const val = params.get(param);
                if (val) return val;
            }
        } catch (e) { }
        return '';
    },

    isPhishingText: function (t) {
        const k = ['login', 'signin', 'auth', 'verifikasi', 'update akun', 'hadiah', 'klaim', 'menang', 'gratis', 'official'];
        return k.some(s => t.toLowerCase().includes(s));
    },

    isThreatText: function (t) {
        return this.isGamblingText(t) || this.isPornText(t) || this.isPhishingText(t);
    },

    isSameBaseDomain: function (host1, host2) {
        return this.getBaseDomain(host1) === this.getBaseDomain(host2);
    },

    /**
     * Detects if the current page is an Images or Videos tab in a search engine
     */
    isImagesTab: function (url) {
        try {
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.search);
            const host = urlObj.hostname.toLowerCase();

            // Google: tbm=isch (images), tbm=vid (videos)
            if (host.includes('google.com')) {
                const tbm = params.get('tbm');
                return tbm === 'isch' || tbm === 'vid';
            }
            // Bing: /images, /videos
            if (host.includes('bing.com')) {
                return urlObj.pathname.startsWith('/images/search') || urlObj.pathname.startsWith('/videos/search');
            }
            // DuckDuckGo: iatem=images, ia=videos
            if (host.includes('duckduckgo.com')) {
                const ia = params.get('ia');
                return ia === 'images' || ia === 'videos';
            }
        } catch (e) { }
        return false;
    }
};
