/**
 * Job Notification Tracker - Routing Core
 * Philosophy: No-install, intentional navigation
 */

const routes = {
    '/': {
        title: 'Welcome',
        subtext: 'This section will be built in the next step.',
        progress: 'Initialization',
        step: 'Step 1 of 6',
        status: 'Not Started'
    },
    '/dashboard': {
        title: 'Dashboard',
        subtext: 'This section will be built in the next step.',
        progress: 'Overview',
        step: 'Step 2 of 6',
        status: 'In Progress'
    },
    '/saved': {
        title: 'Saved Jobs',
        subtext: 'This section will be built in the next step.',
        progress: 'Organization',
        step: 'Step 3 of 6',
        status: 'In Progress'
    },
    '/digest': {
        title: 'Daily Digest',
        subtext: 'This section will be built in the next step.',
        progress: 'Curation',
        step: 'Step 4 of 6',
        status: 'In Progress'
    },
    '/settings': {
        title: 'Preferences',
        subtext: 'This section will be built in the next step.',
        progress: 'Configuration',
        step: 'Step 5 of 6',
        status: 'In Progress'
    },
    '/proof': {
        title: 'Proof of Ship',
        subtext: 'This section will be built in the next step.',
        progress: 'Finalization',
        step: 'Step 6 of 6',
        status: 'Shipped'
    }
};

function handleRouteChange() {
    const hash = window.location.hash.slice(1) || '/';
    const route = routes[hash] || routes['/'];

    // Update Headings
    const titleEl = document.querySelector('.kn-title');
    const subtextEl = document.querySelector('.kn-subtext');
    if (titleEl) titleEl.textContent = route.title;
    if (subtextEl) subtextEl.textContent = route.subtext;

    // Update Top Bar
    const progressEl = document.querySelector('.kn-progress');
    const statusEl = document.querySelector('.kn-badge');

    if (progressEl) {
        progressEl.innerHTML = `
            <span>${route.progress}</span>
            <span>/</span>
            <span>${route.step}</span>
        `;
    }

    if (statusEl) {
        statusEl.textContent = route.status;
        statusEl.className = 'kn-badge';
        if (route.status === 'Shipped') {
            statusEl.classList.add('kn-badge--shipped');
        }
    }

    // Update Navigation Active State
    document.querySelectorAll('.kn-nav-link').forEach(link => {
        const linkHash = link.getAttribute('href').slice(1);
        if (linkHash === hash) {
            link.classList.add('kn-nav-link--active');
        } else {
            link.classList.remove('kn-nav-link--active');
        }
    });

    // Close Mobile Menu if open
    const nav = document.querySelector('.kn-nav');
    if (nav) nav.classList.remove('kn-nav--open');
}

function toggleMobileMenu() {
    const nav = document.querySelector('.kn-nav');
    if (nav) nav.classList.toggle('kn-nav--open');
}

// Event Listeners
window.addEventListener('hashchange', handleRouteChange);
window.addEventListener('load', handleRouteChange);

// Export for use in HTML
window.toggleMobileMenu = toggleMobileMenu;
