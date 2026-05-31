(function () {
    const data = window.githubActivityData;
    const root = document.querySelector('[data-github-activity]');

    if (!root || !data || !Array.isArray(data.days)) return;

    const grid = root.querySelector('[data-github-grid]');
    const total = root.querySelector('[data-github-total]');
    const tooltip = root.querySelector('[data-github-tooltip]');

    if (!grid || !total || !tooltip) return;

    const dayFormatter = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });

    function formatDay(dateString) {
        return dayFormatter.format(new Date(`${dateString}T00:00:00Z`));
    }

    function contributionLabel(count) {
        return `${count} ${count === 1 ? 'contribution' : 'contributions'}`;
    }

    function showTooltip(event, label) {
        tooltip.textContent = label;
        tooltip.classList.add('visible');
        moveTooltip(event);
    }

    function moveTooltip(event) {
        if (!tooltip.classList.contains('visible')) return;

        const bounds = root.getBoundingClientRect();
        const pointer = event.touches ? event.touches[0] : event;
        const hasPointerPosition = Number.isFinite(pointer.clientX) && Number.isFinite(pointer.clientY);
        let x;
        let y;

        if (hasPointerPosition) {
            x = pointer.clientX - bounds.left;
            y = pointer.clientY - bounds.top;
        } else {
            const targetBounds = event.target.getBoundingClientRect();
            x = targetBounds.left + targetBounds.width / 2 - bounds.left;
            y = targetBounds.top - bounds.top;
        }

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    function hideTooltip() {
        tooltip.classList.remove('visible');
    }

    function renderGrid() {
        if (!data.days.length) {
            total.textContent = 'No contribution data yet';
            return;
        }

        const firstDay = new Date(`${data.days[0].date}T00:00:00Z`).getUTCDay();
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < firstDay; i += 1) {
            const spacer = document.createElement('span');
            spacer.className = 'activity-cell activity-cell-empty';
            spacer.setAttribute('aria-hidden', 'true');
            fragment.appendChild(spacer);
        }

        data.days.forEach(day => {
            const cell = document.createElement('button');
            const count = Number(day.count) || 0;
            const label = `${formatDay(day.date)}: ${contributionLabel(count)}`;

            cell.type = 'button';
            cell.className = 'activity-cell';
            cell.dataset.level = String(day.level || 0);
            cell.setAttribute('aria-label', label);
            cell.title = label;
            cell.addEventListener('mouseenter', event => showTooltip(event, label));
            cell.addEventListener('mousemove', moveTooltip);
            cell.addEventListener('mouseleave', hideTooltip);
            cell.addEventListener('focus', event => showTooltip(event, label));
            cell.addEventListener('blur', hideTooltip);
            fragment.appendChild(cell);
        });

        grid.replaceChildren(fragment);
    }

    total.textContent = `${contributionLabel(data.totalContributions || data.totalCommits || 0)} in the last year`;
    renderGrid();
})();
