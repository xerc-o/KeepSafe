document.addEventListener('DOMContentLoaded', async () => {
    const enabledToggle = document.getElementById('enabled-toggle');
    const themeModeSelect = document.getElementById('theme-mode-select');

    // Load current state
    const data = await chrome.storage.local.get(['enabled', 'themeMode']);

    // Default values
    enabledToggle.checked = data.enabled !== false;
    themeModeSelect.value = data.themeMode || 'auto';

    // Apply theme to popup
    function applyTheme(mode) {
        if (mode === 'dark') {
            document.body.classList.add('dark-mode');
        } else if (mode === 'light') {
            document.body.classList.remove('dark-mode');
        } else {
            // Simple auto detection for popup based on system
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
    }
    applyTheme(themeModeSelect.value);

    // Save state on change
    enabledToggle.addEventListener('change', () => {
        chrome.storage.local.set({ enabled: enabledToggle.checked });
    });

    themeModeSelect.addEventListener('change', () => {
        chrome.storage.local.set({ themeMode: themeModeSelect.value });
        applyTheme(themeModeSelect.value);
    });
});
