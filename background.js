let lastLinkInfo = { text: '', url: '' };

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CONTEXT_MENU_TARGET') {
        lastLinkInfo = { text: message.text, url: message.href };
    }

    if (message.action === 'scanComplete') {
        const decision = message.decision;
        if (decision.block) {
            // Option 1: Full redirect (requested by concept)
            // chrome.tabs.update(sender.tab.id, { url: chrome.runtime.getURL('blocked.html') + '?reason=' + encodeURIComponent(decision.reason) });

            // Option 2: Increment counter and let content.js show the premium overlay (current implementation)
            incrementBlockedCounter();
        }
    }
});

function incrementBlockedCounter() {
    chrome.storage.local.get(['blockedToday', 'blockedTotal'], (result) => {
        chrome.storage.local.set({
            blockedToday: (result.blockedToday || 0) + 1,
            blockedTotal: (result.blockedTotal || 0) + 1
        });
    });
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "verify-link-risk",
        title: "Verify Link Risk",
        contexts: ["link"]
    });
});

// Consolidated navigation handler
const handleNavigation = (details) => {
    const url = details.url;
    if (url.includes('google.com/search') || url.includes('bing.com/search') || url.includes('duckduckgo.com')) {
        const query = Utils.getSearchQuery(url);

        // Trigger scan if:
        // 1. Query has trigger keywords
        // 2. OR it's an images/videos tab (Strategy 3 requirement)
        if (Utils.shouldTriggerScanning(query) || Utils.isImagesTab(url)) {
            chrome.tabs.sendMessage(details.tabId, {
                action: 'startDynamicScan',
                query: query
            });
        }
    }
};

// Listen for initial loads
chrome.webNavigation.onCompleted.addListener(handleNavigation, {
    url: [{ hostContains: 'google.com' }, { hostContains: 'bing.com' }, { hostContains: 'duckduckgo.com' }]
});

// Listen for AJAX tab switches (History API)
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation, {
    url: [{ hostContains: 'google.com' }, { hostContains: 'bing.com' }, { hostContains: 'duckduckgo.com' }]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log('[KeepSafe] Context menu clicked:', info.menuItemId);
    if (info.menuItemId === "verify-link-risk" && info.linkUrl) {
        const normalize = (u) => u.replace(/\/$/, '');
        const linkText = (lastLinkInfo.url && normalize(lastLinkInfo.url) === normalize(info.linkUrl)) ? lastLinkInfo.text : '';

        if (tab && tab.id) {
            console.log('[KeepSafe] Sending message to tab:', tab.id);
            chrome.tabs.sendMessage(tab.id, {
                type: 'SHOW_FORENSIC_ANALYSIS',
                url: info.linkUrl,
                text: linkText
            });
        }
    }
});
