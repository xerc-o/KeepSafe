/**
 * STRATEGY 3: THUMBNAIL ANALYSIS
 * Real-time visual content analysis for search engine Images/Videos results.
 */

class ThumbnailAnalyzer {
    constructor(config = {}) {
        this.config = {
            minThumbnails: 10,              // Minimum images for valid analysis
            maxWaitTime: 5000,              // Max wait for loading (ms)
            suspiciousThreshold: 0.20,      // STRICT MODE: 20% suspicious images -> block
            thumbnailScoreThreshold: 8,     // STRICT MODE: Score 8+ per image = suspicious
            ...config
        };

        this.URL_PATTERNS = {
            tier1: [
                /pornhub\.com/i, /xvideos\.com/i, /xnxx\.com/i, /xxx/i,
                /\bporn(?!ography\s+prevention)/i,
                /adult.*(?:site|content|video|image)/i,
                /sex.*(?:video|image|pic)/i,
                // Indonesian Tier 1
                /bokep|ngentot|memek|jilmek|pepek|ngewe/i,
                /jav.*(?:sub|indo)/i,
                /abg.*(?:smp|sma)/i
            ],
            tier2: [
                /nude(?!.*(?:art|painting|sculpture|museum|renaissance|classical))/i,
                /naked(?!.*(?:mole|rat|eye|truth))/i,
                /nsfw/i, /explicit/i, /leaked/i, /scandal/i, /\b18\+/i, /\badult\b/i,
                // Indonesian Tier 2
                /bugil|telanjang|mesum|biadab/i,
                /colmek|crot|desah|colik/i
            ],
            tier3: [
                /sexy/i, /hot(?!dog|sauce)/i, /bikini/i, /lingerie/i, /provocative/i,
                // Indonesian Tier 3
                /seksi|panas/i
            ]
        };

        this.DOMAIN_CLASSIFICATION = {
            trusted: [
                'wikipedia.org', 'britannica.com', 'museum', 'gallery',
                '.edu', '.gov', 'smithsonian', 'louvre', 'metmuseum', 'getty', 'nga.gov'
            ],
            adult: [
                'pornhub', 'xvideos', 'xnxx', 'redtube', 'youporn',
                'xhamster', 'spankbang', 'tube8', 'porn', 'xxx', 'nsfw', 'adult', 'sex'
            ],
            imageHost: ['imgur', 'flickr', 'photobucket', 'tinypic', 'imageshack', 'postimg'],
            social: ['pinterest', 'instagram', 'tumblr', 'reddit', 'twitter', 'facebook']
        };

        this.EDUCATIONAL_INDICATORS = [
            /\b(art|painting|sculpture|drawing|sketch|artwork)\b/i,
            /\b(museum|gallery|exhibition|collection)\b/i,
            /\b(renaissance|classical|baroque|impressionist)\b/i,
            /\b(artist|painter|sculptor)\b/i,
            /\b(study|research|academic|scientific|educational)\b/i,
            /\b(university|college|school|education)\b/i,
            /\b(thesis|paper|journal|article)\b/i,
            /\b(medical|anatomy|health|clinical|diagnostic)\b/i,
            /\b(doctor|physician|hospital|clinic)\b/i,
            /\b(culture|tradition|history|historical)\b/i,
            /\b(anthropology|ethnography|indigenous)\b/i,
            /\b(news|report|journalism|documentary)\b/i,
            /\b(book|literature|novel|publication)\b/i
        ];
    }

    async analyze() {
        console.log('[ThumbnailAnalyzer] Starting analysis...');
        await this.waitForThumbnails();

        const thumbnails = this.scrapeThumbnails();
        console.log('[ThumbnailAnalyzer] Found', thumbnails.length, 'images');

        if (thumbnails.length < this.config.minThumbnails) {
            console.warn('[ThumbnailAnalyzer] Not enough images for reliable analysis');
            return { reliable: false, reason: 'Insufficient thumbnails', thumbnailCount: thumbnails.length };
        }

        const analysis = this.analyzeAllThumbnails(thumbnails);
        const decision = this.makeDecision(analysis);

        console.log('[ThumbnailAnalyzer] Analysis complete:', decision);
        return decision;
    }

    async waitForThumbnails() {
        return new Promise((resolve) => {
            let elapsed = 0;
            const checkInterval = 200;
            const interval = setInterval(() => {
                const images = document.querySelectorAll('img[src], img[data-src]');
                elapsed += checkInterval;
                if (images.length >= this.config.minThumbnails || elapsed >= this.config.maxWaitTime) {
                    clearInterval(interval);
                    setTimeout(resolve, 500);
                }
            }, checkInterval);
        });
    }

    scrapeThumbnails() {
        const selectors = [
            'img.rg_i',              // Google Images (Old UI)
            'img.YQv87',             // Google Images (New UI)
            'div.isv-r img',         // Google Images container
            'div.H8uOdb img',        // Google Images Thumbnail
            'img[data-src]',         // Lazy loaded
            'img.mimg',              // Bing
            'a.iusc img',            // Bing Link
            'img.tile--img__img',    // DuckDuckGo
            'img[src*="image"]'      // Generic fallback
        ];

        const thumbnails = [];
        const seenSrcs = new Set();

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(img => {
                let src = img.src || img.dataset.src || '';
                // Skip base64 encoded images - not useful for analysis
                if (!src || src.startsWith('data:') || seenSrcs.has(src)) return;
                seenSrcs.add(src);

                thumbnails.push({
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

    getParentText(element) {
        const parent = element.closest('div, article, section');
        return parent ? (parent.textContent || '').substring(0, 500) : '';
    }

    analyzeAllThumbnails(thumbnails) {
        const results = thumbnails.map(thumb => this.analyzeSingleThumbnail(thumb));
        const suspiciousCount = results.filter(r => r.suspicious).length;
        const totalScore = results.reduce((sum, r) => sum + r.score, 0);

        return {
            totalThumbnails: thumbnails.length,
            suspiciousCount: suspiciousCount,
            suspiciousRatio: suspiciousCount / thumbnails.length,
            averageScore: totalScore / thumbnails.length,
            results: results,
            topSuspicious: results.filter(r => r.suspicious).sort((a, b) => b.score - a.score).slice(0, 5)
        };
    }

    analyzeSingleThumbnail(thumbnail) {
        let score = 0;
        const details = { flags: [] };

        // Skip base64/CDN URLs longer than 200 chars - not useful for pattern analysis
        const urlPart = (!thumbnail.src.startsWith('data:') && thumbnail.src.length < 200) ? thumbnail.src : '';
        const fullText = `${urlPart} ${thumbnail.alt} ${thumbnail.title} ${thumbnail.parentText}`.toLowerCase();

        // 1. URL Pattern Check
        const urlScoreResult = this.checkURLPatterns(fullText);
        score += urlScoreResult.score;
        details.urlScore = urlScoreResult.score;
        details.flags.push(...urlScoreResult.flags);

        // 2. Domain Check
        const domainResult = this.checkDomain(thumbnail.parentLink || thumbnail.src);
        score += domainResult.score;
        details.domainScore = domainResult.score;
        details.flags.push(domainResult.category);

        // 3. Educational Context
        const eduResult = this.checkEducationalContext(thumbnail.alt + ' ' + thumbnail.title + ' ' + thumbnail.parentText);
        score -= eduResult.score;
        details.educationalScore = -eduResult.score;
        if (eduResult.score > 0) details.flags.push('educational');

        return {
            thumbnail,
            score,
            suspicious: score > this.config.thumbnailScoreThreshold,
            details
        };
    }

    checkURLPatterns(text) {
        let score = 0;
        let flags = [];

        for (const pattern of this.URL_PATTERNS.tier1) {
            if (pattern.test(text)) { score += 30; flags.push('tier1_pattern'); break; }
        }
        for (const pattern of this.URL_PATTERNS.tier2) {
            if (pattern.test(text)) { score += 15; flags.push('tier2_pattern'); }
        }
        for (const pattern of this.URL_PATTERNS.tier3) {
            if (pattern.test(text)) { score += 5; flags.push('tier3_pattern'); }
        }
        return { score, flags };
    }

    checkDomain(url) {
        try {
            const hostname = new URL(url).hostname.toLowerCase();
            for (const domain of this.DOMAIN_CLASSIFICATION.adult) {
                if (hostname.includes(domain)) return { category: 'adult', score: 50 };
            }
            for (const domain of this.DOMAIN_CLASSIFICATION.trusted) {
                if (hostname.includes(domain)) return { category: 'trusted', score: -20 };
            }
            return { category: 'unknown', score: 0 };
        } catch (e) { return { category: 'error', score: 0 }; }
    }

    checkEducationalContext(text) {
        let score = 0;
        const lowerText = text.toLowerCase();
        for (const pattern of this.EDUCATIONAL_INDICATORS) {
            if (pattern.test(lowerText)) score += 5;
        }
        return { score };
    }

    makeDecision(analysis) {
        let shouldBlock = false;
        let reason = '';
        let confidence = 'low';

        if (analysis.suspiciousRatio >= this.config.suspiciousThreshold) {
            shouldBlock = true;
            reason = `${analysis.suspiciousCount}/${analysis.totalThumbnails} images (${(analysis.suspiciousRatio * 100).toFixed(0)}%) appear suspicious`;
            confidence = 'high';
        } else if (analysis.averageScore > 15) {
            shouldBlock = true;
            reason = `High average suspicion score: ${analysis.averageScore.toFixed(1)}`;
            confidence = 'medium';
        } else {
            shouldBlock = false;
            reason = `Content appears safe (${(analysis.suspiciousRatio * 100).toFixed(0)}% suspicious)`;
            confidence = 'high';
        }

        return { block: shouldBlock, reason, confidence, ...analysis };
    }
}

// Global instance if needed
window.ThumbnailAnalyzer = ThumbnailAnalyzer;
