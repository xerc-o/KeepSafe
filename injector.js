(function () {
    const XHR = XMLHttpRequest.prototype;
    const send = XHR.send;
    const open = XHR.open;

    XHR.open = function (method, url) {
        this._url = url;
        return open.apply(this, arguments);
    };

    XHR.send = function () {
        this.addEventListener('load', function () {
            window.postMessage({
                type: 'AJAX_DETECTED',
                method: 'XHR',
                url: this._url,
                status: this.status
            }, '*');
        });
        return send.apply(this, arguments);
    };

    const originalFetch = window.fetch;
    window.fetch = function () {
        return originalFetch.apply(this, arguments).then(response => {
            window.postMessage({
                type: 'AJAX_DETECTED',
                method: 'FETCH',
                url: response.url,
                status: response.status
            }, '*');
            return response;
        });
    };

    console.log('[LinkVerifier] AJAX Monitoring Active');
})();
