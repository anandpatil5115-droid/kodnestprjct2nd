/**
 * Job Notification Tracker - Application Core
 * Features: Rendering, Filtering, Modal Management, Persistence
 */

// --- State Management ---
let savedJobIds = JSON.parse(localStorage.getItem('savedJobIds')) || [];

function saveJob(jobId) {
    if (!savedJobIds.includes(jobId)) {
        savedJobIds.push(jobId);
        localStorage.setItem('savedJobIds', JSON.stringify(savedJobIds));
        handleRouteChange(); // Refresh view
    }
}

function unsaveJob(jobId) {
    savedJobIds = savedJobIds.filter(id => id !== jobId);
    localStorage.setItem('savedJobIds', JSON.stringify(savedJobIds));
    handleRouteChange(); // Refresh view
}

// --- Rendering Helpers ---

function renderJobCard(job, isSavedView = false) {
    const isSaved = savedJobIds.includes(job.id);
    const sourceClass = `kn-source--${job.source.toLowerCase()}`;

    return `
        <div class="kn-job-card">
            <div class="kn-job-header">
                <span class="kn-company">${job.company}</span>
                <span class="kn-source-badge ${sourceClass}">${job.source}</span>
            </div>
            <h3 class="kn-job-title">${job.title}</h3>
            <div class="kn-job-meta">
                <div class="kn-meta-item">📍 ${job.location} (${job.mode})</div>
                <div class="kn-meta-item">💼 ${job.experience}</div>
                <div class="kn-meta-item">💰 ${job.salaryRange}</div>
                <div class="kn-meta-item">🕒 ${job.postedDaysAgo} days ago</div>
            </div>
            <div class="kn-job-footer">
                <button class="kn-button kn-button--secondary" onclick="viewJob(${job.id})">View</button>
                ${isSaved
            ? `<button class="kn-button kn-button--secondary" onclick="unsaveJob(${job.id})" style="color: var(--color-accent)">Unsave</button>`
            : `<button class="kn-button kn-button--secondary" onclick="saveJob(${job.id})">Save</button>`
        }
                <a href="${job.applyUrl}" target="_blank" class="kn-button kn-button--primary">Apply</a>
            </div>
        </div>
    `;
}

function renderFilterBar() {
    return `
        <div class="kn-filter-bar">
            <div class="kn-filter-group" style="flex: 2">
                <label class="kn-label">Search Jobs</label>
                <input type="text" class="kn-input" id="search-input" placeholder="Keyword, Role, Company..." oninput="applyFilters()">
            </div>
            <div class="kn-filter-group">
                <label class="kn-label">Location</label>
                <select class="kn-select" id="location-filter" onchange="applyFilters()">
                    <option value="">All Locations</option>
                    <option>Bangalore</option>
                    <option>Mumbai</option>
                    <option>Chennai</option>
                    <option>Hyderabad</option>
                    <option>Pune</option>
                    <option>Remote</option>
                </select>
            </div>
            <div class="kn-filter-group">
                <label class="kn-label">Mode</label>
                <select class="kn-select" id="mode-filter" onchange="applyFilters()">
                    <option value="">Any Mode</option>
                    <option>Remote</option>
                    <option>Hybrid</option>
                    <option>Onsite</option>
                </select>
            </div>
            <div class="kn-filter-group">
                <label class="kn-label">Exp</label>
                <select class="kn-select" id="exp-filter" onchange="applyFilters()">
                    <option value="">All Exp</option>
                    <option>Fresher</option>
                    <option>0-1</option>
                    <option>1-3</option>
                    <option>3+ yrs</option>
                </select>
            </div>
        </div>
    `;
}

// --- Action Handlers ---

function viewJob(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    const content = `
        <div class="kn-company" style="font-size: 16px;">${job.company}</div>
        <h2 class="kn-job-title" style="font-size: 32px; margin-top: 8px;">${job.title}</h2>
        <div class="kn-tag-list">
            ${job.skills.map(skill => `<span class="kn-tag">${skill}</span>`).join('')}
        </div>
        <div class="kn-job-meta" style="margin-top: 24px; padding: 16px; background: #f9f9f9;">
            <div class="kn-meta-item">📍 ${job.location} (${job.mode})</div>
            <div class="kn-meta-item">💼 ${job.experience} Exp</div>
            <div class="kn-meta-item">💰 ${job.salaryRange}</div>
        </div>
        <div class="kn-mt-24">
            <h4 style="margin-bottom: 12px;">About the role</h4>
            <p style="color: #444; line-height: 1.8;">${job.description}</p>
        </div>
        <div class="kn-mt-40">
            <a href="${job.applyUrl}" target="_blank" class="kn-button kn-button--primary" style="width: 100%;">Apply Now</a>
        </div>
    `;
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('job-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('job-modal').style.display = 'none';
}

function applyFilters() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || "";
    const locFilter = document.getElementById('location-filter')?.value || "";
    const modeFilter = document.getElementById('mode-filter')?.value || "";
    const expFilter = document.getElementById('exp-filter')?.value || "";

    const filtered = allJobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchTerm) || job.company.toLowerCase().includes(searchTerm);
        const matchesLoc = !locFilter || job.location === locFilter;
        const matchesMode = !modeFilter || job.mode === modeFilter;
        const matchesExp = !expFilter || (expFilter === "3+ yrs" ? parseInt(job.experience) >= 3 : job.experience === expFilter);

        return matchesSearch && matchesLoc && matchesMode && matchesExp;
    });

    const listEl = document.getElementById('job-list-container');
    if (listEl) {
        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="kn-empty-state" style="grid-column: 1 / -1">
                    <div class="kn-empty-state__icon">🔍</div>
                    <h2 class="kn-empty-state__title">No matches found.</h2>
                    <p class="kn-empty-state__subtitle">Try adjusting your filters or search keywords.</p>
                </div>
            `;
        } else {
            listEl.innerHTML = filtered.map(job => renderJobCard(job)).join('');
        }
    }
}

// --- Routing & Templates ---

const routes = {
    '/': {
        title: 'Stop Missing The Right Jobs.',
        subtext: 'Precision-matched job discovery delivered daily at 9AM.',
        progress: 'Welcome',
        step: 'Step 1 of 6',
        status: 'Initialization',
        render: () => `
            <div class="kn-hero">
                <h1 class="kn-hero__headline">Stop Missing The Right Jobs.</h1>
                <p class="kn-hero__subtext">Precision-matched job discovery delivered daily at 9AM.</p>
                <a href="#/settings" class="kn-button kn-button--primary" style="font-size: 18px; padding: 16px 40px;">Start Tracking</a>
            </div>
        `
    },
    '/dashboard': {
        title: 'Dashboard',
        subtext: 'Discover realistic job opportunities matched to the Indian tech market.',
        progress: 'Overview',
        step: 'Step 2 of 6',
        status: 'In Progress',
        render: () => `
            <div style="grid-column: 1 / -1">
                ${renderFilterBar()}
                <div class="kn-job-list" id="job-list-container">
                    ${allJobs.map(job => renderJobCard(job)).join('')}
                </div>
            </div>
        `
    },
    '/settings': {
        title: 'Job Preferences',
        subtext: 'Configure your target roles to enable precision matching.',
        progress: 'Configuration',
        step: 'Step 3 of 6',
        status: 'In Progress',
        render: () => `
            <div class="kn-workspace">
                <div class="kn-card">
                    <div class="kn-form-group">
                        <label class="kn-label">Role Keywords</label>
                        <input type="text" class="kn-input" placeholder="e.g. Frontend, React, Product Manager">
                    </div>
                    <div class="kn-form-group">
                        <label class="kn-label">Preferred Locations</label>
                        <input type="text" class="kn-input" placeholder="e.g. Bangalore, Remote, Hyderabad">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                        <div class="kn-form-group">
                            <label class="kn-label">Work Mode</label>
                            <select class="kn-select">
                                <option>Remote</option>
                                <option>Hybrid</option>
                                <option>Onsite</option>
                            </select>
                        </div>
                        <div class="kn-form-group">
                            <label class="kn-label">Experience Level</label>
                            <select class="kn-select">
                                <option>Entry Level (0-2 yrs)</option>
                                <option>Mid-Level (3-5 yrs)</option>
                                <option>Senior (6+ yrs)</option>
                            </select>
                        </div>
                    </div>
                    <div class="kn-mt-16">
                        <a href="#/dashboard" class="kn-button kn-button--primary">Save Preferences</a>
                    </div>
                </div>
            </div>
            <aside class="kn-panel">
                <div class="kn-card">
                    <h3>Why settings matter?</h3>
                    <p class="kn-mt-8" style="font-size: 14px; color: #666;">
                        Our matching engine uses these parameters to filter out noise. Precision is the key to stopping the "Missing Job" problem.
                    </p>
                </div>
            </aside>
        `
    },
    '/saved': {
        title: 'Saved Jobs',
        subtext: 'Roles you have earmarked for application.',
        progress: 'Organization',
        step: 'Step 4 of 6',
        status: 'In Progress',
        render: () => {
            const savedJobs = allJobs.filter(j => savedJobIds.includes(j.id));
            if (savedJobs.length === 0) {
                return `
                    <div class="kn-workspace" style="grid-column: 1 / -1">
                        <div class="kn-empty-state">
                            <div class="kn-empty-state__icon">🔖</div>
                            <h2 class="kn-empty-state__title">Your collection is empty.</h2>
                            <p class="kn-empty-state__subtitle">Saved jobs will appear here for quick access and tracking.</p>
                            <div class="kn-mt-40">
                                <a href="#/dashboard" class="kn-button kn-button--secondary">Explore Jobs</a>
                            </div>
                        </div>
                    </div>
                `;
            }
            return `
                <div style="grid-column: 1 / -1">
                    <div class="kn-job-list">
                        ${savedJobs.map(job => renderJobCard(job, true)).join('')}
                    </div>
                </div>
            `;
        }
    },
    '/digest': {
        title: 'Daily Digest',
        subtext: 'Your top 10 matches for today.',
        progress: 'Curation',
        step: 'Step 5 of 6',
        status: 'In Progress',
        render: () => `
            <div class="kn-workspace" style="grid-column: 1 / -1">
                <div class="kn-empty-state">
                    <div class="kn-empty-state__icon">📬</div>
                    <h2 class="kn-empty-state__title">Next digest at 9:00 AM.</h2>
                    <p class="kn-empty-state__subtitle">We curate the best matches daily. Check back tomorrow morning.</p>
                </div>
            </div>
        `
    },
    '/proof': {
        title: 'Proof of Ship',
        subtext: 'Artifact collection and final verification.',
        progress: 'Finalization',
        step: 'Step 6 of 6',
        status: 'Shipped',
        render: () => `
            <div class="kn-workspace">
                <div class="kn-card">
                    <h3>Deployment Artifacts</h3>
                    <p class="kn-mt-16 text-slate-500">
                        The "Job Notification Tracker" upgrade is now fully rendered and data-integrated.
                    </p>
                    <div class="kn-mt-24" style="height: 200px; border: 2px dashed var(--color-border); display: flex; align-items: center; justify-content: center; color: #222; font-weight: 600;">
                        Project Fully Integrated
                    </div>
                </div>
            </div>
        `
    }
};

function handleRouteChange() {
    const hash = window.location.hash.slice(1) || '/';
    const route = routes[hash] || routes['/'];

    // Update Headings and Content
    const titleEl = document.querySelector('.kn-title');
    const subtextEl = document.querySelector('.kn-subtext');
    const containerEl = document.querySelector('.kn-main');

    const headerEl = document.querySelector('.kn-header');
    if (hash === '/') {
        if (headerEl) headerEl.style.display = 'none';
        if (containerEl) containerEl.style.display = 'block';
    } else {
        if (headerEl) headerEl.style.display = 'block';
        if (containerEl) containerEl.style.display = 'grid';
        if (titleEl) titleEl.textContent = route.title;
        if (subtextEl) subtextEl.textContent = route.subtext;
    }

    if (containerEl) {
        containerEl.innerHTML = route.render();
    }

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

    const nav = document.querySelector('.kn-nav');
    if (nav) nav.classList.remove('kn-nav--open');
    window.scrollTo(0, 0);
}

function toggleMobileMenu() {
    const nav = document.querySelector('.kn-nav');
    if (nav) nav.classList.toggle('kn-nav--open');
}

// Global functions for HTML access
window.saveJob = saveJob;
window.unsaveJob = unsaveJob;
window.viewJob = viewJob;
window.closeModal = closeModal;
window.applyFilters = applyFilters;
window.toggleMobileMenu = toggleMobileMenu;

window.addEventListener('hashchange', handleRouteChange);
window.addEventListener('load', handleRouteChange);
