(function () {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (motionQuery.matches) return;

    window.addEventListener('pageshow', () => {
        document.body.classList.remove('is-leaving');
    });

    document.querySelectorAll('.nav-link, .entry').forEach(link => {
        link.addEventListener('click', event => {
            const href = link.getAttribute('href');

            if (!href || href.startsWith('#') || link.target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
            }

            const destination = new URL(href, window.location.href);

            if (destination.origin !== window.location.origin || destination.href === window.location.href) {
                return;
            }

            event.preventDefault();
            document.body.classList.add('is-leaving');

            window.setTimeout(() => {
                window.location.href = destination.href;
            }, 240);
        });
    });
})();
