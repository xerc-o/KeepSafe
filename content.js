(async function () {
    let tooltip = null;
    let forensicModal = null;
    let isPinned = false;
    let isEnabled = true;
    let isDarkMode = false;
    let blacklistData = { domains: [], keywords: [], categories: {} };

    // Load blacklist
    try {
        const blacklistUrl = chrome.runtime.getURL('blacklist.json');
        const response = await fetch(blacklistUrl);
        blacklistData = await response.json();
    } catch (e) {
        // Silently fail or log sparingly
    }

    let themeMode = 'auto';

    // Initial load of state
    chrome.storage.local.get(['enabled', 'themeMode'], (data) => {
        isEnabled = data.enabled !== false;
        themeMode = data.themeMode || 'auto';
    });

    // Listen for changes from popup
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.enabled) {
            isEnabled = changes.enabled.newValue;
            if (!isEnabled) {
                hideTooltip();
                hideForensicModal();
            }
        }
        if (changes.themeMode) {
            themeMode = changes.themeMode.newValue;
            if (forensicModal) applyThemeToModal();
        }
    });

    // Handle messages from background/popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('[KeepSafe] Message received:', message.type);
        if (message.type === 'SHOW_FORENSIC_ANALYSIS') {
            showForensicModal(message.url, message.text);
        }
    });

    function isPageDark() {
        // 1. Force light/dark if explicitly set
        if (themeMode === 'dark') return true;
        if (themeMode === 'light') return false;

        // 2. Auto mode: Detect page theme
        try {
            // Check body background
            const bodyStyle = window.getComputedStyle(document.body);
            const htmlStyle = window.getComputedStyle(document.documentElement);

            let bg = bodyStyle.backgroundColor;
            if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
                bg = htmlStyle.backgroundColor;
            }

            const rgb = bg.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
                // Ignore pure black or silver if it might be an overlay, but usually these are clear indicators
                const r = parseInt(rgb[0]), g = parseInt(rgb[1]), b = parseInt(rgb[2]);
                const a = rgb.length > 3 ? parseFloat(rgb[3]) : 1;

                if (a > 0.1) { // If it has significant opacity
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    return brightness < 128;
                }
            }
        } catch (e) { }

        // 3. Fallback to system preference if page theme is inconclusive
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;

        return false;
    }

    // --- SCRIPT INJECTION ---
    try {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injector.js');
        (document.head || document.documentElement).appendChild(script);
        script.onload = () => script.remove();
    } catch (e) {
        console.error('[LinkVerifier] Injection failed:', e);
    }

    // --- AJAX DETECTION LISTENER ---
    let lastAjaxThreat = null;
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'AJAX_DETECTED') {
            const { url, method } = event.data;
            const blacklisted = Utils.checkBlacklist(new URL(url).hostname, blacklistData);
            if (blacklisted) {
                lastAjaxThreat = { url, type: blacklisted, time: Date.now() };
                if (tooltip && tooltip.classList.contains('visible')) {
                    if (!tooltip.innerHTML.includes('AJAX Warn')) {
                        const categoryLabel = Utils.getCategoryLabel(blacklisted);
                        tooltip.innerHTML += `<br><div style="color:#ffcc00 !important; margin-top:5px !important; border-top:1px solid rgba(255,255,255,0.2) !important; padding-top:5px !important; font-size:10px !important;">⚠️ AJAX Warn: Background request to ${categoryLabel} site detected.</div>`;
                    }
                }
            }
        }
    });

    function createTooltip() {
        if (tooltip) return;

        tooltip = document.createElement('div');
        tooltip.id = 'antigravity-link-verifier-tooltip';

        // Ensure tooltip is always appended to body (not inside modals)
        const appendTooltip = () => {
            if (document.body) {
                document.body.appendChild(tooltip);
            } else {
                setTimeout(appendTooltip, 10);
            }
        };
        appendTooltip();

        // Re-append if tooltip gets removed by page scripts
        const observer = new MutationObserver(() => {
            if (tooltip && !document.body.contains(tooltip)) {
                document.body.appendChild(tooltip);
            }
        });
        observer.observe(document.body, { childList: true, subtree: false });
    }

    // Create tooltip immediately on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createTooltip);
    } else {
        createTooltip();
    }

    function showTooltip(text, type, x, y) {
        if (!isEnabled) return;
        if (!tooltip) createTooltip();

        let icon = '';
        if (type === 'danger') icon = '<span class="icon">⚠️</span>';

        tooltip.innerHTML = `${icon}${text}`;
        tooltip.className = `visible ${type}`;

        // Apply theme based on logic
        if (isPageDark()) tooltip.classList.add('dark-mode');
        else tooltip.classList.remove('dark-mode');

        // Reset manual style overrides to let class toggles work correctly
        tooltip.style.display = '';
        tooltip.style.opacity = '';
        tooltip.style.visibility = '';

        positionTooltip(x, y);
    }

    function positionTooltip(mouseX, mouseY) {
        if (!tooltip) return;

        const offset = 25; // Increased offset to prevent overlap
        const padding = 10;

        let targetX = mouseX + offset;
        let targetY = mouseY + offset;

        // Get dimensions
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Smart boundary detection - Flip if hitting right/bottom edges
        if (targetX + tooltipRect.width > viewportWidth - padding) {
            targetX = mouseX - tooltipRect.width - offset;
        }

        if (targetY + tooltipRect.height > viewportHeight - padding) {
            targetY = mouseY - tooltipRect.height - offset;
        }

        // Final safety check for left/top boundaries
        targetX = Math.max(padding, targetX);
        targetY = Math.max(padding, targetY);

        tooltip.style.left = `${targetX}px`;
        tooltip.style.top = `${targetY}px`;
    }

    function hideTooltip() {
        if (tooltip) {
            tooltip.className = '';
        }
    }

    // --- FORENSIC MODAL ---
    function createForensicModal() {
        if (forensicModal) return;

        forensicModal = document.createElement('div');
        forensicModal.id = 'keep-safe-forensic-modal';
        forensicModal.className = 'keep-safe-glass';

        forensicModal.innerHTML = `
            <div class="ks-modal-header">
                <span class="ks-modal-title">Link Details</span>
                <div class="ks-modal-controls" style="display: flex; align-items: center; gap: 8px;">
                    <button id="ks-pin-btn" title="Pin window" style="padding: 4px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: inherit;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 2h14a1 1 0 011 1v19.293L12 18.586l-8 2.707V3a1 1 0 011-1z"/>
                        </svg>
                    </button>
                    <button id="ks-close-btn" title="Close" style="padding: 4px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: inherit;">✕</button>
                </div>
            </div>
            <div id="ks-modal-body">
                <div class="ks-loading">Analyzing forensic data...</div>
            </div>
        `;

        document.body.appendChild(forensicModal);

        // Events
        forensicModal.querySelector('#ks-close-btn').onclick = hideForensicModal;
        forensicModal.querySelector('#ks-pin-btn').onclick = togglePin;

        // Enable Dragging
        initDraggable(forensicModal, forensicModal.querySelector('.ks-modal-header'));

        // Outside click to close if not pinned
        document.addEventListener('mousedown', (e) => {
            if (forensicModal && !isPinned && !forensicModal.contains(e.target)) {
                hideForensicModal();
            }
        });
    }

    function initDraggable(element, handle) {
        let offsetX = 0, offsetY = 0;

        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();

            // Disable transitions during dragging
            element.classList.add('ks-dragging');

            // Get current absolute position
            const rect = element.getBoundingClientRect();

            // If it's still centered via CSS, switch to pixels immediately
            if (!element.style.top || element.style.top === '50%') {
                element.style.top = rect.top + "px";
                element.style.left = rect.left + "px";
                element.style.transform = 'none';
                element.style.margin = '0';
                void element.offsetWidth; // Reflow
            }

            // Calculate where we clicked relative to the element's top-left
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
            handle.style.cursor = 'grabbing';
        }

        function elementDrag(e) {
            e.preventDefault();

            // Calculate new position based on current mouse position minus initial click offset
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            // Containment
            const padding = 10;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            newLeft = Math.max(padding, Math.min(newLeft, viewportWidth - element.offsetWidth - padding));
            newTop = Math.max(padding, Math.min(newTop, viewportHeight - element.offsetHeight - padding));

            element.style.left = newLeft + "px";
            element.style.top = newTop + "px";
            element.style.transform = 'none'; // Ensure no transform fights with us
        }

        function closeDragElement() {
            element.classList.remove('ks-dragging');
            document.onmouseup = null;
            document.onmousemove = null;
            handle.style.cursor = 'move';
        }
    }

    function togglePin() {
        isPinned = !isPinned;
        const btn = forensicModal.querySelector('#ks-pin-btn');
        if (isPinned) {
            btn.classList.add('active');
            btn.style.opacity = '1';
        } else {
            btn.classList.remove('active');
            btn.style.opacity = '0.5';
        }
    }

    function applyThemeToModal() {
        if (!forensicModal) return;
        if (isPageDark()) {
            forensicModal.classList.add('dark-mode');
        } else {
            forensicModal.classList.remove('dark-mode');
        }
    }

    async function showForensicModal(url, text) {
        console.log('[KeepSafe] showForensicModal triggered for:', url);
        if (!isEnabled) {
            console.log('[KeepSafe] Extension disabled, not showing modal');
            return;
        }
        if (!forensicModal) createForensicModal();

        applyThemeToModal();
        forensicModal.classList.add('visible');

        const body = forensicModal.querySelector('#ks-modal-body');
        body.innerHTML = '<div class="ks-loading">Analyzing forensic data...</div>';

        // Perform analysis logic (ported from analysis.js)
        const reportData = await generateForensicReport(url, text);
        body.innerHTML = reportData.html;

        // Add Event Listeners for buttons
        const whoisBtn = forensicModal.querySelector('#ks-whois-btn');
        const safeBtn = forensicModal.querySelector('#ks-safe-btn');

        if (whoisBtn) whoisBtn.onclick = () => window.open(`https://who.is/whois/${reportData.hostname}`, '_blank');
        if (safeBtn) safeBtn.onclick = () => window.open(`https://transparencyreport.google.com/safe-browsing/search?url=${encodeURIComponent(url)}`, '_blank');
    }

    async function generateForensicReport(url, linkText) {
        const analysis = await performFullAnalysis(url, linkText);

        return {
            hostname: analysis.hostname,
            html: `
                <div class="ks-report-card">
                    <div class="ks-risk-header">
                        <span class="ks-badge ks-badge-${analysis.state}">${Utils.getCategoryLabel(analysis.state)}</span>
                        <div class="ks-url-display">${url}</div>
                    </div>
                    <div class="ks-details-list">
                        ${analysis.details.map(d => `<div class="ks-detail-item ks-text-${d.type}">${d.text}</div>`).join('')}
                    </div>
                    <div class="ks-technical">
                        <div><strong>Hostname:</strong> ${analysis.hostname}</div>
                        <div><strong>TLD:</strong> .${analysis.tld}</div>
                        <div><strong>Entropy:</strong> ${analysis.entropy.toFixed(2)}</div>
                        <div><strong>Score:</strong> ${analysis.score}</div>
                    </div>
                    <div class="ks-modal-actions">
                        <button id="ks-whois-btn" class="ks-action-btn">Whois</button>
                        <button id="ks-safe-btn" class="ks-action-btn">Safe Check</button>
                    </div>
                </div>
            `
        };
    }

    /**
     * UNIFIED ANALYSIS ENGINE
     * Shared by tooltip and forensic modal - single source of truth for threat assessment
     */
    async function performFullAnalysis(url, linkText) {
        let score = 0;
        let details = [];
        let state = 'neutral';

        let urlObj;
        try { urlObj = new URL(url); } catch (e) { 
            return { 
                state: 'neutral', 
                details: [{ text: 'Invalid URL', type: 'danger' }], 
                hostname: 'N/A', 
                tld: 'N/A', 
                entropy: 0, 
                score: 0 
            }; 
        }

        const hostname = urlObj.hostname.toLowerCase();
        const tld = hostname.split('.').pop().toLowerCase();
        const pageSourceDomain = window.location.hostname.toLowerCase();

        // 1. Check Trust Type (Consolidated - reuse getTrustType)
        const trustType = Utils.getTrustType(hostname);
        if (trustType || hostname.endsWith('.go.id') || hostname.endsWith('.gov')) {
            const trustLabel = Utils.getTrustLabel(trustType) || 
                              (hostname.endsWith('.go.id') || hostname.endsWith('.gov') ? 'Official Government Domain' : 'Trusted');
            return { 
                state: 'safe', 
                details: [{ text: trustLabel, type: 'success' }], 
                hostname, 
                tld, 
                entropy: 0, 
                score: 0 
            };
        }

        // 2. Direct IP Address Check
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
            score += 30;
            details.push({ text: 'Direct IP Address detected (Unusual for legitimate sites)', type: 'danger' });
        }

        // 3. Phishing / Deceptive UI Detection
        if (linkText) {
            const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})(\/[^\s]*)?$/i;
            const trimmedText = linkText.trim();
            if (urlPattern.test(trimmedText)) {
                try {
                    const textUrlInfo = new URL(trimmedText.startsWith('http') ? trimmedText : `http://${trimmedText}`);
                    if (Utils.getBaseDomain(textUrlInfo.hostname) !== Utils.getBaseDomain(hostname)) {
                        score += 150;
                        state = 'suspicious';
                        details.push({ text: `[SUSPICIOUS] Deceptive Link UI: Says ${textUrlInfo.hostname} but leads to ${hostname}`, type: 'danger' });
                    }
                } catch (e) { }
            }
        }

        // 4. Blacklist Check
        const blacklisted = Utils.checkBlacklist(hostname, blacklistData);
        if (blacklisted) {
            score += 150;
            state = blacklisted;
            details.push({ text: `Verified Threat: ${Utils.getCategoryLabel(blacklisted)}`, type: 'danger' });
        }

        // 5. Heuristic Analysis
        const heuristic = Utils.getHeuristicScore(url, hostname);
        score += heuristic.score;
        if (heuristic.score > 20) {
            details.push({ text: `Anomalous pattern detected (Pattern Score: ${heuristic.score})`, type: 'danger' });
        }

        // 6. Cross-Domain Context Risk
        if (pageIsThreat && !Utils.isSameBaseDomain(hostname, pageSourceDomain)) {
            score += 10;
            details.push({ text: 'High Risk Context: Link from threat page to external domain', type: 'warning' });
        }

        // 7. Final State Mapping
        if (state === 'neutral') {
            if (score >= 20) state = 'danger';
            else if (score >= 8) state = 'suspicious';

            // Refine threat category based on content patterns
            if (state !== 'neutral' && state !== 'safe') {
                if (Utils.isGamblingText(url) || Utils.isGamblingText(linkText || '')) state = 'gambling';
                else if (Utils.isPornText(url) || Utils.isPornText(linkText || '')) state = 'porn';
                else if (Utils.isPhishingText(url) || Utils.isPhishingText(linkText || '')) state = 'suspicious';
            }
        }

        if (details.length === 0) {
            details.push({ text: 'No immediate threats detected.', type: 'neutral' });
        }

        return {
            state,
            details,
            hostname,
            tld,
            entropy: heuristic.entropy,
            score
        };
    }

    function hideForensicModal() {
        if (forensicModal) {
            forensicModal.classList.remove('visible');
            isPinned = false;

            // Delay the position reset so it doesn't "snap" while fading out
            // Matches the 0.2s transition in style.css
            setTimeout(() => {
                if (forensicModal && !forensicModal.classList.contains('visible')) {
                    forensicModal.style.top = '';
                    forensicModal.style.left = '';
                    forensicModal.style.transform = '';
                }
            }, 250);
        }
    }

    // --- BLOCKING OVERLAY ---
    function injectBlockingOverlay(reason, details) {
        if (document.getElementById('ks-block-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'ks-block-overlay';
        overlay.className = 'ks-block-overlay';

        // Determine trust type (Trusted Domain / Verified Platform) from details or reason when possible
        let trustType = null;
        let trustLabel = null;
        try {
            const candidate = (typeof details === 'string' && /\S+\.\S+/.test(details) && !details.includes(' ')) ? details :
                (typeof reason === 'string' && /\S+\.\S+/.test(reason) && !reason.includes(' ')) ? reason : null;
            if (candidate) {
                trustType = Utils.getTrustType(candidate);
                trustLabel = Utils.getTrustLabel(trustType);
            }
        } catch (e) { /* ignore */ }

        overlay.innerHTML = `
            <div class="ks-block-content" style="
                background: linear-gradient(145deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98));
                padding: 32px 24px;
                border-radius: 24px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.9), 0 0 40px rgba(239, 68, 68, 0.1);
                backdrop-filter: blur(40px) saturate(200%);
                -webkit-backdrop-filter: blur(40px) saturate(200%);
                width: 95%;
                max-width: 580px;
                margin: auto;
                text-align: center;
                animation: ks-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            ">
                <style>
                    @keyframes ks-fade-up {
                        from { opacity: 0; transform: translateY(30px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .ks-block-title {
                        font-family: 'Outfit', 'Inter', sans-serif;
                        font-size: 28px;
                        font-weight: 800;
                        margin: 16px 0 8px;
                        background: linear-gradient(135deg, #ff8a8a 0%, #ef4444 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        letter-spacing: -0.5px;
                        line-height: 1.1;
                    }
                    .ks-block-message {
                        font-size: 15px;
                        color: rgba(226, 232, 240, 0.9);
                        margin-bottom: 20px;
                        line-height: 1.5;
                        font-weight: 400;
                    }
                    .ks-trigger-box {
                        background: rgba(0, 0, 0, 0.4);
                        padding: 16px;
                        border-radius: 12px;
                        margin-bottom: 24px;
                        text-align: left;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                    }
                    .ks-reminder-box {
                        margin-bottom: 32px;
                        padding: 20px;
                        border-radius: 16px;
                        background: linear-gradient(135deg, rgba(246, 173, 85, 0.08), rgba(246, 173, 85, 0.03));
                        border: 1px solid rgba(246, 173, 85, 0.2);
                        text-align: left;
                    }
                    .ks-btn-primary {
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        color: white !important;
                        border: none;
                        padding: 16px 32px;
                        border-radius: 14px;
                        font-weight: 700;
                        font-size: 18px;
                        cursor: pointer;
                        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                        box-shadow: 0 10px 20px -5px rgba(239, 68, 68, 0.5);
                        width: 100%;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .ks-btn-primary:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 15px 30px -5px rgba(239, 68, 68, 0.6);
                        filter: brightness(1.1);
                    }
                </style>

                <div style="width: 100px; height: 100px; margin: 0 auto 24px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(99, 102, 241, 0.03)); border-radius: 28px; display: flex; align-items: center; justify-content: center; border: 2px solid rgba(59, 130, 246, 0.12);">
                    <svg width="70" height="70" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Forbidden icon">
                        <rect x="4" y="4" width="56" height="56" rx="10" fill="#ffffff" opacity="0.95"/>
                        <circle cx="32" cy="32" r="18" fill="none" stroke="#dc2626" stroke-width="6" />
                        <line x1="20" y1="20" x2="44" y2="44" stroke="#dc2626" stroke-width="6" stroke-linecap="round"/>
                    </svg>
                </div>
                
                <h1 class="ks-block-title">Content Blocked</h1>
                
                ${trustLabel ? `<div style="display:flex;justify-content:center;margin:8px 0 12px;"><span style="background:linear-gradient(135deg,#10b981,#059669); color:white; padding:6px 12px; border-radius:999px; font-weight:700; font-size:13px; box-shadow:0 6px 18px rgba(5,150,105,0.12);">${trustLabel}</span></div>` : ''}

                <p class="ks-block-message">
                    KeepSafe has protected you from <span style="color: #fca5a5; font-weight: 700; border-bottom: 2px solid rgba(239, 68, 68, 0.3); padding-bottom: 2px;">${reason}</span> content.
                </p>

                <div class="ks-trigger-box">
                    <div style="color: rgba(148, 163, 184, 0.8); font-size: 12px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">Trigger Analysis</div>
                    <div style="color: #f8fafc; font-size: 14px; font-family: 'JetBrains Mono', monospace; overflow-wrap: break-word;">${details}</div>
                </div>

                <div class="ks-reminder-box">
                    <div style="color: #fbd38d; font-style: italic; font-size: 14px; line-height: 1.7; font-weight: 500;">
                        "Love yourself, become someone you're proud to be."
                    </div>
                </div>

                <div class="ks-block-actions" style="margin-top: 8px;">
                    <button id="ks-go-back" class="ks-btn-primary">
                        Go Back Safely
                    </button>
                </div>
            </div>
        `;

        // Prevent interaction with the rest of the page
        document.documentElement.style.overflow = 'hidden';
        document.body.appendChild(overlay);

        // Fade in
        setTimeout(() => overlay.classList.add('visible'), 10);

        document.getElementById('ks-go-back').onclick = () => {
            window.location.href = 'https://www.google.com';
        };

        observer.observe(document.body, { childList: true });
    }

    // --- DYNAMIC SCANNING SYSTEM ---
    async function triggerDynamicScan(query) {
        if (document.getElementById('ks-scanning-overlay')) return;

        try {
            // Slight delay to allow search engine AJAX to settle and render results
            await new Promise(r => setTimeout(r, 800));

            showScanningOverlay();

            if (Utils.isImagesTab(window.location.href)) {
                updateScanningOverlay('Analyzing Visual Safety...', 'visual');
                const analyzer = new ThumbnailAnalyzer();
                const result = await analyzer.analyze();

                if (result.block) {
                    updateScanningOverlay('Content Blocked', 'explicit');
                    chrome.runtime.sendMessage({ action: 'scanComplete', decision: result });
                    setTimeout(() => {
                        injectBlockingOverlay('Forbidden (Visual Analysis)', result.reason);
                        hideScanningOverlay();
                    }, 1000);
                    return;
                } else {
                    chrome.runtime.sendMessage({ action: 'scanComplete', decision: result });
                    hideScanningOverlay();
                    return;
                }
            }

            // Robust wait for results (up to 3 seconds)
            let results = [];
            for (let i = 0; i < 6; i++) {
                await new Promise(r => setTimeout(r, 500));
                results = scrapeSearchResults();
                if (results.length > 3) break;
            }

            if (results.length === 0) {
                console.log('[LinkVerifier] No results found to scan, falling back to static query analysis');
                const staticCheck = Utils.shouldBlockPorn(query);
                if (staticCheck.block) {
                    updateScanningOverlay('Content Blocked', 'explicit');
                    setTimeout(() => {
                        injectBlockingOverlay('Forbidden', staticCheck.reason);
                        hideScanningOverlay();
                    }, 1000);
                } else {
                    hideScanningOverlay();
                }
                return;
            }

            const analysis = Utils.analyzeSearchResults(results);
            // Incorporate query's own score as a baseline for high-risk terms
            const queryBaseline = Utils.shouldBlockPorn(query);
            if (queryBaseline.block && queryBaseline.score >= 20) {
                analysis.adultCount += 1; // Force block for explicit queries
            }

            const decision = Utils.makeDecision(analysis);

            if (decision.block) {
                updateScanningOverlay('Content Blocked', 'explicit');
                // Notify background for stats
                chrome.runtime.sendMessage({ action: 'scanComplete', decision: decision });

                setTimeout(() => {
                    injectBlockingOverlay('Forbidden (Dynamic Scan)', decision.reason);
                    hideScanningOverlay();
                }, 1000);
            } else {
                chrome.runtime.sendMessage({ action: 'scanComplete', decision: decision });
                hideScanningOverlay();
            }
        } catch (error) {
            console.error('[LinkVerifier] Fatal error during dynamic scan:', error);
            hideScanningOverlay();
        }
    }

    // Listener for triggers from background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'startDynamicScan') {
            // If already blocked, don't re-scan
            if (document.getElementById('ks-block-overlay')) return;
            triggerDynamicScan(message.query);
        }
    });

    // Client-side URL change monitoring for extra reliability on AJAX tabs
    let lastUrl = window.location.href;
    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            scanPageContext(); // Re-evaluate context on URL change
        }
    }, 1000);

    function scrapeSearchResults() {
        const results = [];
        const url = window.location.href;

        if (url.includes('google.com')) {
            document.querySelectorAll('div.g').forEach((el, i) => {
                if (i >= 8) return;
                const titleEl = el.querySelector('h3');
                const linkEl = el.querySelector('a');
                const snippetEl = el.querySelector('div.VwiC3b, div.IsZvec');
                if (titleEl && linkEl) {
                    results.push({
                        title: titleEl.textContent,
                        url: linkEl.href,
                        snippet: snippetEl ? snippetEl.textContent : ''
                    });
                }
            });
        } else if (url.includes('bing.com')) {
            document.querySelectorAll('li.b_algo').forEach((el, i) => {
                if (i >= 8) return;
                const titleEl = el.querySelector('h2 a');
                const snippetEl = el.querySelector('p, div.b_caption p');
                if (titleEl) {
                    results.push({ title: titleEl.textContent, url: titleEl.href, snippet: snippetEl ? snippetEl.textContent : '' });
                }
            });
        } else if (url.includes('duckduckgo.com')) {
            document.querySelectorAll('article[data-testid="result"]').forEach((el, i) => {
                if (i >= 8) return;
                const titleEl = el.querySelector('h2 a');
                const snippetEl = el.querySelector('div[data-result="snippet"]');
                if (titleEl) {
                    results.push({ title: titleEl.textContent, url: titleEl.href, snippet: snippetEl ? snippetEl.textContent : '' });
                }
            });
        }
        return results;
    }

    function showScanningOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'ks-scanning-overlay';
        overlay.className = 'ks-scanning-overlay';
        overlay.innerHTML = `
            <style>
                .ks-scanning-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(15, 23, 42, 0.98); z-index: 2147483647;
                    display: flex; align-items: center; justify-content: center;
                    font-family: 'Outfit', 'Inter', sans-serif; animation: ks-fade-in 0.3s;
                }
                .ks-scan-box {
                    background: #1e293b; padding: 48px; border-radius: 24px;
                    text-align: center; max-width: 450px; border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                .ks-spinner { width: 80px; height: 80px; margin: 0 auto 24px; position: relative; }
                .ks-spinner-ring {
                    width: 100%; height: 100%; border: 4px solid rgba(99, 102, 241, 0.1);
                    border-top: 4px solid #6366f1; border-radius: 50%;
                    animation: ks-spin 1s linear infinite;
                }
                .ks-shield { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 32px; }
                .ks-scan-title { color: white; font-size: 24px; font-weight: 700; margin-bottom: 8px; }
                .ks-scan-text { color: #94a3b8; font-size: 16px; margin-bottom: 24px; }
                .ks-scan-progress { width: 100%; height: 4px; background: #334155; border-radius: 2px; overflow: hidden; }
                .ks-scan-bar { width: 40%; height: 100%; background: #6366f1; border-radius: 2px; animation: ks-progress 2s infinite ease-in-out; }
                @keyframes ks-spin { to { transform: rotate(360deg); } }
                @keyframes ks-fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes ks-progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
            </style>
            <div class="ks-scan-box">
                <div class="ks-spinner">
                    <div class="ks-spinner-ring"></div>
                    <div class="ks-shield">🛡️</div>
                </div>
                <div class="ks-scan-title">Analyzing Safety...</div>
                <div class="ks-scan-text">Our Smart Filter is verifying search results across global indexes.</div>
                <div class="ks-scan-progress"><div class="ks-scan-bar"></div></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function updateScanningOverlay(title, type) {
        const titleEl = document.querySelector('.ks-scan-title');
        const textEl = document.querySelector('.ks-scan-text');
        const ringEl = document.querySelector('.ks-spinner-ring');
        const shieldEl = document.querySelector('.ks-shield');

        if (titleEl) titleEl.innerText = title;
        if (type === 'explicit') {
            if (titleEl) titleEl.style.color = '#ef4444';
            if (textEl) textEl.innerText = 'Highly explicit content detected. Access restricted.';
            if (ringEl) ringEl.style.borderTopColor = '#ef4444';
            if (shieldEl) shieldEl.innerText = '🚫';
        } else if (type === 'visual') {
            if (textEl) textEl.innerText = 'Our AI is analyzing visual patterns in image thumbnails...';
        }
    }

    function hideScanningOverlay() {
        const overlay = document.getElementById('ks-scanning-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
    }

    // --- GLOBAL CONTEXT AWARENESS ---
    let pageIsThreat = false;
    function scanPageContext() {
        if (!isEnabled) return;

        const url = window.location.href;
        const domain = window.location.hostname.toLowerCase();
        const title = (document.title || '').toLowerCase();
        const h1 = (document.querySelector('h1')?.innerText || '').toLowerCase();
        const metaDesc = (document.querySelector('meta[name="description"]')?.getAttribute('content') || '').toLowerCase();

        // 1. Check Search Queries (Critical for Images tab and Search Results)
        const searchQuery = Utils.getSearchQuery(url);
        if (searchQuery) {
            // Check for Dynamic Scan Trigger
            if (Utils.shouldTriggerScanning(searchQuery)) {
                triggerDynamicScan(searchQuery);
                return;
            }

            const pornCheck = Utils.shouldBlockPorn(searchQuery);
            if (pornCheck.block) {
                console.log('[LinkVerifier] Pornographic search query detected:', searchQuery, 'Score:', pornCheck.score);
                injectBlockingOverlay('Forbidden', `Search Query: "${searchQuery}"`);
                return;
            }
        }

        // 2. Check for Specific Search Engine Image Tabs
        const isImageSearch = url.includes('tbm=isch') || url.includes('type=image') || url.includes('/images');
        if (isImageSearch) {
            const titleCheck = Utils.shouldBlockPorn(title);
            const queryCheck = searchQuery ? Utils.shouldBlockPorn(searchQuery) : { block: false };

            if (titleCheck.block || queryCheck.block) {
                console.log('[LinkVerifier] Pornographic image search detected');
                injectBlockingOverlay('Forbidden Images', `Filtered search on ${domain}`);
                return;
            }
        }

        // 3. Check Known Blacklist
        const blacklisted = Utils.checkBlacklist(domain, blacklistData);
        if (blacklisted === 'porn') {
            injectBlockingOverlay('Forbidden', domain);
            return;
        }

        // 4. Heuristic Content Check
        const threatKeywords = ['slot', 'gacor', 'maxwin', 'togel', 'jackpot', 'rtp', 'jp', 'casino', 'bola88', 'slot88', 'sbobet'];
        const trustKeywords = ['school', 'academy', 'edu', 'founder', 'faculty', 'kinder', 'preschool', 'learning'];

        const hasThreatTheme = threatKeywords.some(kw => title.includes(kw) || h1.includes(kw) || metaDesc.includes(kw));
        const isTrustDomain = trustKeywords.some(kw => domain.includes(kw));
        const isDirectThreatDomain = Utils.isGamblingText(domain) || Utils.isPornText(domain);

        if ((isTrustDomain && hasThreatTheme) || isDirectThreatDomain) {
            pageIsThreat = true;
            const domainCheck = Utils.shouldBlockPorn(domain);
            const titleCheck = Utils.shouldBlockPorn(title);

            if (domainCheck.block || titleCheck.block) {
                injectBlockingOverlay('Forbidden', domainCheck.block ? domain : title);
            }
        }
    }
    scanPageContext();

    function getTargetInfo(element) {
        const tagName = element.tagName;
        const role = element.getAttribute('role');
        const text = element.innerText.trim();
        const className = typeof element.className === 'string' ? element.className : '';
        const id = element.id || '';

        // 0. FORM HIJACKING CHECK
        const parentForm = element.closest('form');
        if (tagName === 'A' && parentForm && element.hasAttribute('onclick') && element.getAttribute('onclick').includes('submit')) {
            const formAction = parentForm.getAttribute('action') || '';
            const href = element.getAttribute('href') || '';

            if (href.startsWith('http') && formAction && !formAction.startsWith(href)) {
                return {
                    href: 'javascript:void(0)',
                    text,
                    type: 'script',
                    raw: `[DANGER] Form Hijacking: Link says ${href} but submits to ${formAction}`
                };
            }
        }

        // 1. Check for <a> or <area>
        if (tagName === 'A' || tagName === 'AREA') {
            const href = element.href;
            if (href && href.startsWith('javascript:')) {
                return { href: 'javascript:void(0)', text, type: 'script', raw: href };
            }
            return { href, text, type: 'link' };
        }

        // 2. Check for buttons or inputs
        const isButton = tagName === 'BUTTON' || (tagName === 'INPUT' && (element.type === 'submit' || element.type === 'button'));
        if (isButton) {
            const action = element.formAction || (element.form && element.form.action);
            if (action && action !== 'javascript:void(0)' && !action.startsWith('#')) {
                return { href: action, text, type: 'link' };
            }
            return { href: 'javascript:void(0)', text, type: 'script', raw: 'Button Action/JS' };
        }

        // 3. Check for event handlers
        const eventAttrs = ['onclick', 'onmousedown', 'onmouseup', 'onmouseenter', 'onmouseleave'];
        for (const attr of eventAttrs) {
            if (element.hasAttribute(attr)) {
                return { href: 'javascript:void(0)', text, type: 'script', raw: element.getAttribute(attr) };
            }
        }

        // 4. Check for interactive patterns
        const interactiveKeywords = ['btn', 'button', 'clickable', 'pressable', 'nav-item', 'balloon', 'widget', 'rating', 'scroll', 'top', 'floating', 'icon', 'social', 'share', 'toggle'];
        const lowClassName = className.toLowerCase();
        const lowId = id.toLowerCase();
        const hasInteractivePattern = interactiveKeywords.some(kw => lowClassName.includes(kw) || lowId.includes(kw));

        if (role === 'button' || hasInteractivePattern) {
            return { href: 'javascript:void(0)', text, type: 'script', raw: `Interactive Pattern (${id || className})` };
        }

        // 5. Text-based heuristic
        const buttonLabels = ['rating', 'klik', 'click', 'login', 'daftar', 'submit', 'search', 'cari'];
        if (text && text.length < 30 && buttonLabels.some(label => text.toLowerCase().includes(label))) {
            return { href: 'javascript:void(0)', text, type: 'script', raw: 'Text-Heuristic Match' };
        }

        return null;
    }

    async function analyzeLink(info) {
        const analysis = await performFullAnalysis(info.href || info.raw || '', info.text || '');

        let message = analysis.details[0].text;

        // If it's a simple neutral link, just show the URL
        if (analysis.state === 'neutral' && info.href) {
            message = info.href;
        } else if (analysis.state !== 'neutral' && analysis.state !== 'safe') {
            // For threats, show the category label if the first detail isn't already explicit
            const label = Utils.getCategoryLabel(analysis.state);
            if (!message.includes(label)) {
                message = `[${label}] ${message}`;
            }
        }

        return { message, state: analysis.state };
    }

    // --- EVENT LISTENERS ---
    document.addEventListener('mouseover', async (e) => {
        try {
            if (!isEnabled) return;
            const target = e.target.closest('a, button, [onclick], area, [role="button"]');
            if (!target) {
                hideTooltip();
                return;
            }

            const info = getTargetInfo(target);
            if (info) {
                const analysis = await analyzeLink(info);

                // Final safety check to ensure user is still hovering this target
                if (e.target.closest('a, button, [onclick], area, [role="button"]') !== target) return;

                // Mark the element with threat level for click blocking
                target.setAttribute('data-verifier-threat', analysis.state);

                let message = analysis.message;
                if (analysis.state === 'porn') {
                    message = `🔒 [BLOCKED] ${message}`;
                }

                showTooltip(message, analysis.state, e.clientX, e.clientY);
            }
        } catch (err) {
            console.error('[LinkVerifier] Mouseover error:', err);
        }
    }, true);

    // --- PROTECTIVE BLOCKING ---
    function handleBlocking(e) {
        if (!isEnabled) return;
        const target = e.target.closest('a, button, [onclick], area, [role="button"]');
        if (target) {
            const threat = target.getAttribute('data-verifier-threat');
            if (threat === 'porn') {
                console.log('[LinkVerifier] Blocking interaction with PORN link');
                e.preventDefault();
                e.stopPropagation();

                // Flash the tooltip to notify user
                if (tooltip) {
                    tooltip.classList.add('danger');
                    setTimeout(() => {
                        if (tooltip) tooltip.classList.remove('danger');
                    }, 500);
                }
                return false;
            }
        }
    }

    document.addEventListener('click', handleBlocking, true);
    document.addEventListener('contextmenu', handleBlocking, true);
    document.addEventListener('dragstart', handleBlocking, true); // Prevent dragging porn links
    document.addEventListener('mousedown', (e) => {
        if (e.button === 2) handleBlocking(e); // Right click
    }, true);

    document.addEventListener('mousemove', (e) => {
        if (isEnabled && tooltip && tooltip.classList.contains('visible')) {
            positionTooltip(e.clientX, e.clientY);
        }
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('a, button, [onclick], area, [role="button"]');
        if (target) {
            hideTooltip();
        }
    });

    document.addEventListener('contextmenu', (e) => {
        const target = e.target.closest('a');
        if (target) {
            chrome.runtime.sendMessage({
                type: 'CONTEXT_MENU_TARGET',
                text: target.innerText.trim(),
                href: target.href
            });
        }
    });

})();
