document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get('url');
    const text = params.get('text');

    // Load Theme Preference and apply
    const settings = await chrome.storage.local.get(['themeMode']);
    const themeMode = settings.themeMode || 'auto';

    if (themeMode === 'dark') {
        document.body.classList.add('dark-mode');
    } else if (themeMode === 'light') {
        document.body.classList.remove('dark-mode');
    } else {
        // Simple fallback for analysis window
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
        }
    }

    if (!url) {
        document.getElementById('loading').textContent = 'Error: No URL provided.';
        return;
    }

    const urlEl = document.getElementById('target-url');
    urlEl.textContent = url;

    // Add Copy Button
    const copyBtn = document.createElement('button');
    copyBtn.innerText = '📋 Copy Link';
    copyBtn.className = 'copy-btn';
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(url);
        copyBtn.innerText = '✅ Copied!';
        setTimeout(() => copyBtn.innerText = '📋 Copy Link', 2000);
    };
    urlEl.parentElement.appendChild(copyBtn);

    // Load Blacklist Data
    let blacklistData = { domains: [], keywords: [], categories: {} };
    try {
        const blacklistUrl = chrome.runtime.getURL('blacklist.json');
        const response = await fetch(blacklistUrl);
        blacklistData = await response.json();
    } catch (e) {
        console.error("Failed to load blacklist", e);
    }

    performAnalysis(url, text, blacklistData);
});

function performAnalysis(url, linkText, blacklistData) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('report').style.display = 'block';

    const ul = document.getElementById('forensic-list');
    let riskScore = 0;
    let riskLevel = 'Safe';
    let riskClass = 'risk-safe';
    let isPorn = false;

    // 1. URL Parsing
    let urlObj;
    try {
        urlObj = new URL(url);
    } catch (e) {
        addDetail(ul, 'Invalid URL format', 'danger');
        setRisk('Invalid', 'risk-danger');
        return;
    }

    const hostname = urlObj.hostname;
    const targetTLD = hostname.split('.').pop().toLowerCase();
    document.getElementById('domain-host').textContent = hostname;
    document.getElementById('domain-proto').textContent = urlObj.protocol;

    // 0. Deceptive UI Check (Phishing) - SYNC WITH content.js
    if (linkText) {
        // Tight regex matches only plain URLs/domains (no spaces)
        const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})(\/[^\s]*)?$/i;
        if (urlPattern.test(linkText.trim())) {
            try {
                const trimmedText = linkText.trim();
                const textUrlInfo = trimmedText.startsWith('http') ? new URL(trimmedText) : new URL(`http://${trimmedText}`);

                // SYNC WHITELIST
                const isTrustedTarget = Utils.isTrusted(hostname);

                if (!isTrustedTarget && Utils.getBaseDomain(textUrlInfo.hostname) !== Utils.getBaseDomain(hostname)) {
                    riskScore += 150; // High score for deceptive UI
                    addDetail(ul, `[SUSPICIOUS] Deceptive Link UI: Text claims to be ${textUrlInfo.hostname} but leads to ${hostname}`, 'danger');
                }
            } catch (e) { }
        }
    }

    // Trusted Domain / Verified Platform Check
    const trustType = Utils.getTrustType(hostname);
    if (trustType === 'trusted-domain') {
        riskScore -= 200; // Strong negative score
        addDetail(ul, 'Trusted Domain detected', 'safe');
    } else if (trustType === 'verified-platform') {
        // Large platforms are generally safe but we reduce score less strongly
        riskScore -= 100;
        addDetail(ul, 'Verified Platform detected', 'safe');
    } else if (hostname.endsWith('.go.id') || hostname.endsWith('.gov')) {
        riskScore -= 200;
        addDetail(ul, 'Official Government Domain detected', 'safe');
    }

    // IP Address Check
    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);
    document.getElementById('is-ip').textContent = isIp ? 'YES (Suspicious)' : 'No';
    if (isIp) {
        riskScore += 25;
        addDetail(ul, 'Hostname is a raw IP Address', 'danger');
    }

    // 2. Blacklist Check
    const blacklistedCategory = Utils.checkBlacklist(hostname, blacklistData);
    if (blacklistedCategory) {
        riskScore += 150;
        const categoryLabel = Utils.getCategoryLabel(blacklistedCategory);
        addDetail(ul, `Domain found in Blacklist: ${categoryLabel}`, 'danger');
        if (blacklistedCategory === 'porn') isPorn = true;
    }

    for (const kw of blacklistData.keywords) {
        if (url.toLowerCase().includes(kw)) {
            riskScore += 50;
            addDetail(ul, `URL contains blacklisted keyword: "${kw}"`, 'danger');
        }
    }

    // 3. Heuristic Analysis
    const heuristic = Utils.getHeuristicScore(url, hostname);
    riskScore += heuristic.score;

    document.getElementById('advanced-forensics').style.display = 'block';
    document.getElementById('subdomain-entropy').innerText = heuristic.entropy > 0 ? heuristic.entropy.toFixed(2) : 'N/A';

    // TLD Risk
    const highRiskTLDs = ['asia', 'top', 'xyz', 'pw', 'icu', 'vip', 'bid', 'club', 'online', 'site'];
    if (highRiskTLDs.includes(targetTLD)) {
        riskScore += 15;
        document.getElementById('tld-risk').innerText = 'HIGH (Untrusted TLD)';
        document.getElementById('tld-risk').style.color = '#fc8181';
        addDetail(ul, `High Risk TLD detected: .${targetTLD}`, 'danger');
    }

    // 4. Brand Spoofing
    const officialBrands = {
        'sinarmas': 'banksinarmas.com',
        'klikbca': 'klikbca.com',
        'bca': 'bca.co.id',
        'mandiri': 'bankmandiri.co.id',
        'bri': 'bri.co.id',
        'bni': 'bni.co.id',
        'google': 'google.com',
        'facebook': 'facebook.com',
        'instagram': 'instagram.com',
        'shopee': 'shopee.co.id',
        'tokopedia': 'tokopedia.com',
        'lazada': 'lazada.co.id',
        'blibli': 'blibli.com',
        'lynk': 'lynk.id'
    };

    for (const [brand, officialDomain] of Object.entries(officialBrands)) {
        if (url.toLowerCase().includes(brand) && hostname !== officialDomain && !hostname.endsWith('.' + officialDomain)) {
            riskScore += 100;
            addDetail(ul, `Suspicious: Potential Brand Spoofing detected - ${brand}`, 'danger');
        }
    }

    // 5. Protocol Check
    if (urlObj && urlObj.protocol === 'http:') {
        riskScore += 10;
        addDetail(ul, 'Insecure Protocol (HTTP)', 'warning');
    }

    // SET FINAL RISK
    if (isPorn) {
        riskLevel = 'DANGER';
        riskClass = 'risk-danger';
        showAdviceBox("Love yourself, don't let pornography steal your peace, focus, or self-respect.");
    } else if (riskScore <= 0) {
        riskLevel = 'NEUTRAL';
        riskClass = 'risk-neutral';
        addDetail(ul, 'No obvious threats detected - Link appears neutral', 'safe');
    } else if (riskScore < 20) {
        riskLevel = 'Suspicious';
        riskClass = 'risk-suspicious';
    } else {
        riskLevel = 'DANGER';
        riskClass = 'risk-danger';
    }

    setRisk(riskLevel, riskClass);

    // Setup External Links
    document.getElementById('whois-link').href = `https://who.is/whois/${hostname}`;
    document.getElementById('google-safe-link').href = `https://transparencyreport.google.com/safe-browsing/search?url=${encodeURIComponent(url)}`;
}

function addDetail(ul, text, type) {
    const li = document.createElement('li');
    li.innerText = text;
    li.style.color = type === 'danger' ? '#fc8181' : (type === 'warning' ? '#f6ad55' : '#68d391');
    ul.appendChild(li);
}

function setRisk(level, className) {
    const el = document.getElementById('risk-level');
    el.innerText = level;
    el.className = `risk-badge ${className}`;
}

function showAdviceBox(message) {
    const section = document.getElementById('forensic-details-section');
    const existing = document.getElementById('advice-box');
    if (existing) existing.remove();

    const box = document.createElement('div');
    box.id = 'advice-box';
    box.className = 'advice-box';
    box.textContent = message;

    // Insert at the very top of the Forensic Details section
    section.insertBefore(box, section.firstChild);
}

