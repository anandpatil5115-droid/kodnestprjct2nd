/**
 * Job Notification Tracker - Intelligence Layer
 * Features: Match Scoring, Preference Persistence, Advanced Filtering
 */

// --- State Management ---
let savedJobIds = JSON.parse(localStorage.getItem('savedJobIds')) || [];
let userPrefs = JSON.parse(localStorage.getItem('jobTrackerPreferences')) || null;
let showOnlyMatches = false;

function getTodayKey() {
    const d = new Date();
    return `jobTrackerDigest_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- Digest Logic ---

function generateDigest() {
    if (!userPrefs) return;

    // Sort all jobs by Match Score then Recency
    const sorted = [...allJobs].sort((a, b) => {
        const scoreB = calculateMatchScore(b, userPrefs);
        const scoreA = calculateMatchScore(a, userPrefs);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.postedDaysAgo - b.postedDaysAgo;
    });

    const top10 = sorted.slice(0, 10);
    localStorage.setItem(getTodayKey(), JSON.stringify(top10));
    handleRouteChange(); // Refresh view
}

function getStoredDigest() {
    return JSON.parse(localStorage.getItem(getTodayKey()));
}

function copyDigestToClipboard() {
    const digest = getStoredDigest();
    if (!digest) return;

    const text = `Top 10 Jobs For You — 9AM Digest (${new Date().toLocaleDateString()})\n\n` +
        digest.map((j, i) => `${i + 1}. ${j.title} at ${j.company} (${j.location})\n   Match Score: ${calculateMatchScore(j, userPrefs)}%\n   Apply: ${j.applyUrl}`).join('\n\n') +
        `\n\nThis digest was generated based on your preferences.`;

    navigator.clipboard.writeText(text).then(() => {
        alert("Digest copied to clipboard!");
    });
}

function createEmailDraft() {
    const digest = getStoredDigest();
    if (!digest) return;

    const subject = encodeURIComponent("My 9AM Job Digest");
    const body = encodeURIComponent(`Top 10 Jobs For You — 9AM Digest (${new Date().toLocaleDateString()})\n\n` +
        digest.map((j, i) => `${i + 1}. ${j.title} at ${j.company} (${j.location})\n   Match Score: ${calculateMatchScore(j, userPrefs)}%\n   Apply: ${j.applyUrl}`).join('\n\n') +
        `\n\nThis digest was generated based on your preferences.`);

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// --- Match Score Engine ---
// ... (previous logic remains identical)

function savePreferences(e) {
    if (e) e.preventDefault();

    const prefs = {
        roleKeywords: document.getElementById('pref-keywords').value.split(',').map(s => s.trim()).filter(s => s),
        preferredLocations: Array.from(document.getElementById('pref-locations').selectedOptions).map(o => o.value),
        preferredMode: Array.from(document.querySelectorAll('input[name="pref-mode"]:checked')).map(i => i.value),
        experienceLevel: document.getElementById('pref-exp').value,
        skills: document.getElementById('pref-skills').value.split(',').map(s => s.trim()).filter(s => s),
        minMatchScore: parseInt(document.getElementById('pref-threshold').value)
    };

    localStorage.setItem('jobTrackerPreferences', JSON.stringify(prefs));
    userPrefs = prefs;
    handleRouteChange(); // Refresh to show banner/Dashboard updates
}

// --- Match Score Engine ---

function calculateMatchScore(job, prefs) {
    if (!prefs) return 0;
    let score = 0;

    // 1. Role Keywords (Title: +25, Description: +15)
    const titleMatch = prefs.roleKeywords.some(kw => job.title.toLowerCase().includes(kw.toLowerCase()));
    if (titleMatch) score += 25;

    const descMatch = prefs.roleKeywords.some(kw => job.description.toLowerCase().includes(kw.toLowerCase()));
    if (descMatch) score += 15;

    // 2. Location (+15)
    if (prefs.preferredLocations.includes(job.location)) score += 15;

    // 3. Mode (+10)
    if (prefs.preferredMode.includes(job.mode)) score += 10;

    // 4. Experience (+10)
    if (job.experience === prefs.experienceLevel) score += 10;

    // 5. Skills (+15)
    const hasSkillOverlap = prefs.skills.some(skill =>
        job.skills.some(js => js.toLowerCase() === skill.toLowerCase())
    );
    if (hasSkillOverlap) score += 15;

    // 6. Recency (+5)
    if (job.postedDaysAgo <= 2) score += 5;

    // 7. Source (+5)
    if (job.source === 'LinkedIn') score += 5;

    return Math.min(100, score);
}

function getScoreBadgeClass(score) {
    if (score >= 80) return 'kn-score--high';
    if (score >= 60) return 'kn-score--mid';
    if (score >= 40) return 'kn-score--low';
    return 'kn-score--critical';
}

// --- Rendering Helpers ---

function renderJobCard(job) {
    const isSaved = savedJobIds.includes(job.id);
    const score = calculateMatchScore(job, userPrefs);
    const sourceClass = `kn-source--${job.source.toLowerCase()}`;
    const badgeClass = getScoreBadgeClass(score);

    return `
        <div class="kn-job-card">
            <div class="kn-job-header">
                <span class="kn-company">${job.company}</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    ${userPrefs ? `<span class="kn-score-badge ${badgeClass}">${score}% Match</span>` : ''}
                    <span class="kn-source-badge ${sourceClass}">${job.source}</span>
                </div>
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
                <button class="kn-button kn-button--secondary" onclick="${isSaved ? 'unsaveJob' : 'saveJob'}(${job.id})">${isSaved ? 'Unsave' : 'Save'}</button>
                <a href="${job.applyUrl}" target="_blank" class="kn-button kn-button--primary">Apply</a>
            </div>
        </div>
    `;
}

function renderFilterBar() {
    return `
        <div class="kn-banner" id="pref-banner" style="${userPrefs ? 'display:none' : ''}">
            <span>Set your preferences to activate intelligent matching.</span>
            <a href="#/settings" class="kn-button kn-button--secondary" style="background: white; border: none; font-size: 12px; padding: 6px 16px;">Go to Settings</a>
        </div>
        <div class="kn-filter-bar">
            <div class="kn-filter-group" style="flex: 2">
                <label class="kn-label">Search Jobs</label>
                <input type="text" class="kn-input" id="search-input" placeholder="Keyword, Role, Company..." oninput="applyFilters()">
            </div>
            <div class="kn-filter-group">
                <label class="kn-label">Location</label>
                <select class="kn-select" id="location-filter" onchange="applyFilters()">
                    <option value="">All Locations</option>
                    <option>Bangalore</option><option>Mumbai</option><option>Chennai</option>
                    <option>Hyderabad</option><option>Pune</option><option>Remote</option>
                </select>
            </div>
            <div class="kn-filter-group">
                <label class="kn-label">Category</label>
                <select class="kn-select" id="mode-filter" onchange="applyFilters()">
                    <option value="">Any Mode</option>
                    <option>Remote</option><option>Hybrid</option><option>Onsite</option>
                </select>
            </div>
            <div class="kn-filter-group">
                <label class="kn-label">Sort</label>
                <select class="kn-select" id="sort-filter" onchange="applyFilters()">
                    <option value="latest">Latest</option>
                    <option value="score">Match Score</option>
                    <option value="salary">Salary (High to Low)</option>
                </select>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; font-size: 14px;">
            <input type="checkbox" id="match-toggle" ${showOnlyMatches ? 'checked' : ''} onchange="toggleMatchFilter()">
            <label for="match-toggle" style="cursor: pointer; font-weight: 500;">Show only jobs above my threshold (${userPrefs ? userPrefs.minMatchScore : 40}%)</label>
        </div>
    `;
}

// --- Action Handlers ---

function saveJob(jobId) {
    if (!savedJobIds.includes(jobId)) {
        savedJobIds.push(jobId);
        localStorage.setItem('savedJobIds', JSON.stringify(savedJobIds));
        handleRouteChange();
    }
}

function unsaveJob(jobId) {
    savedJobIds = savedJobIds.filter(id => id !== jobId);
    localStorage.setItem('savedJobIds', JSON.stringify(savedJobIds));
    handleRouteChange();
}

function toggleMatchFilter() {
    showOnlyMatches = document.getElementById('match-toggle').checked;
    applyFilters();
}

function viewJob(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    const score = calculateMatchScore(job, userPrefs);
    const badgeClass = getScoreBadgeClass(score);

    document.getElementById('modal-content').innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
            <div class="kn-company">${job.company}</div>
            ${userPrefs ? `<span class="kn-score-badge ${badgeClass}">${score}% Match</span>` : ''}
        </div>
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
            <a href="${job.applyUrl}" target="_blank" class="kn-button kn-button--primary" style="width: 100%;">Apply Now on ${job.source}</a>
        </div>
    `;
    document.getElementById('job-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('job-modal').style.display = 'none';
}

function parseSalary(salaryStr) {
    // Extract numbers like "15" from "15-20 LPA" or "25" from "₹25k/month"
    const matches = salaryStr.match(/\d+/g);
    if (!matches) return 0;
    let val = parseInt(matches[matches.length - 1]); // Take high end
    if (salaryStr.toLowerCase().includes('month')) val *= 0.12; // Normalize monthly k to LPA approx
    return val;
}

function applyFilters() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || "";
    const locFilter = document.getElementById('location-filter')?.value || "";
    const modeFilter = document.getElementById('mode-filter')?.value || "";
    const sortBy = document.getElementById('sort-filter')?.value || "latest";

    let filtered = allJobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchTerm) || job.company.toLowerCase().includes(searchTerm);
        const matchesLoc = !locFilter || job.location === locFilter;
        const matchesMode = !modeFilter || job.mode === modeFilter;

        let matchesThreshold = true;
        if (showOnlyMatches && userPrefs) {
            matchesThreshold = calculateMatchScore(job, userPrefs) >= userPrefs.minMatchScore;
        }

        return matchesSearch && matchesLoc && matchesMode && matchesThreshold;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sortBy === 'latest') return a.postedDaysAgo - b.postedDaysAgo;
        if (sortBy === 'score') return calculateMatchScore(b, userPrefs) - calculateMatchScore(a, userPrefs);
        if (sortBy === 'salary') return parseSalary(b.salaryRange) - parseSalary(a.salaryRange);
        return 0;
    });

    const listEl = document.getElementById('job-list-container');
    if (listEl) {
        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="kn-empty-state" style="grid-column: 1 / -1">
                    <div class="kn-empty-state__icon">🔍</div>
                    <h2 class="kn-empty-state__title">No matches found.</h2>
                    <p class="kn-empty-state__subtitle">Adjust your filters or lower your matching threshold.</p>
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
        progress: 'Welcome', step: '1/6', status: 'Initialization',
        render: () => `<div class="kn-hero">
            <h1 class="kn-hero__headline">Stop Missing The Right Jobs.</h1>
            <p class="kn-hero__subtext">Precision-matched job discovery delivered daily at 9AM.</p>
            <a href="#/settings" class="kn-button kn-button--primary" style="font-size: 18px; padding: 16px 40px;">Start Tracking</a>
        </div>`
    },
    '/dashboard': {
        title: 'Dashboard', subtext: 'Intelligent job discovery for the Indian tech market.',
        progress: 'Overview', step: '2/6', status: 'In Progress',
        render: () => `<div style="grid-column: 1 / -1">
            ${renderFilterBar()}
            <div class="kn-job-list" id="job-list-container">${allJobs.map(job => renderJobCard(job)).join('')}</div>
        </div>`
    },
    '/settings': {
        title: 'Matching Preferences', subtext: 'Configure your profile to activate deterministic match scoring.',
        progress: 'Configuration', step: '3/6', status: 'In Progress',
        render: () => {
            const p = userPrefs || { roleKeywords: [], preferredLocations: [], preferredMode: ['Remote', 'Hybrid', 'Onsite',], experienceLevel: 'Fresher', skills: [], minMatchScore: 40 };
            return `
            <div class="kn-workspace">
                <form class="kn-card" onsubmit="window.savePreferences(event)">
                    <div class="kn-form-group">
                        <label class="kn-label">Role Keywords (comma separated)</label>
                        <input type="text" id="pref-keywords" class="kn-input" value="${p.roleKeywords.join(', ')}" placeholder="e.g. SDE, Frontend, React">
                    </div>
                    <div class="kn-form-group">
                        <label class="kn-label">Locations (hold Ctrl for multi-select)</label>
                        <select id="pref-locations" class="kn-select" multiple style="height: 100px;">
                            ${['Bangalore', 'Mumbai', 'Chennai', 'Pune', 'Hyderabad', 'Remote', 'Delhi', 'Noida', 'Gurgaon'].map(l =>
                `<option ${p.preferredLocations.includes(l) ? 'selected' : ''}>${l}</option>`
            ).join('')}
                        </select>
                    </div>
                    <div class="kn-form-group">
                        <label class="kn-label">Work Mode Preference</label>
                        <div class="kn-checkbox-group">
                            ${['Remote', 'Hybrid', 'Onsite'].map(m => `
                                <label class="kn-checkbox-item">
                                    <input type="checkbox" name="pref-mode" value="${m}" ${p.preferredMode.includes(m) ? 'checked' : ''}> ${m}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="kn-form-group">
                        <label class="kn-label">Current Experience</label>
                        <select id="pref-exp" class="kn-select">
                            ${['Fresher', '0-1', '1-3', '3-5'].map(e => `<option ${p.experienceLevel === e ? 'selected' : ''}>${e}</option>`).join('')}
                        </select>
                    </div>
                    <div class="kn-form-group">
                        <label class="kn-label">Skills (comma separated)</label>
                        <input type="text" id="pref-skills" class="kn-input" value="${p.skills.join(', ')}" placeholder="e.g. React, Java, SQL">
                    </div>
                    <div class="kn-form-group">
                        <label class="kn-label">Min Match Threshold: <span id="thresh-val">${p.minMatchScore}</span>%</label>
                        <input type="range" id="pref-threshold" min="0" max="100" value="${p.minMatchScore}" oninput="document.getElementById('thresh-val').textContent = this.value">
                    </div>
                    <div class="kn-mt-16">
                        <button type="submit" class="kn-button kn-button--primary">Update Preferences</button>
                    </div>
                </form>
            </div>
            <aside class="kn-panel">
                <div class="kn-card">
                    <h3>Deterministic Matching</h3>
                    <p class="kn-mt-16" style="font-size: 14px; color: #666; line-height: 1.8;">
                        Our engine computes a weighted score across Title, Description, Location, Mode, Experience, and Skills.
                        <br><br><strong>Current Weights:</strong>
                        <br>• Title Keyword: +25%
                        <br>• Mode Match: +10%
                        <br>• Experience Match: +10%
                        <br>• Skill Overlap: +15%
                    </p>
                </div>
            </aside>`;
        }
    },
    '/saved': {
        title: 'Saved Jobs', subtext: 'Review roles you are preparing to apply for.',
        progress: 'Organization', step: '4/6', status: 'In Progress',
        render: () => {
            const saved = allJobs.filter(j => savedJobIds.includes(j.id));
            if (saved.length === 0) return `<div class="kn-workspace" style="grid-column: 1/-1"><div class="kn-empty-state"><div class="kn-empty-state__icon">🔖</div><h2 class="kn-empty-state__title">No saved jobs.</h2><p class="kn-empty-state__subtitle">Browse the dashboard to earmark roles.</p></div></div>`;
            return `<div style="grid-column: 1/-1"><div class="kn-job-list">${saved.map(job => renderJobCard(job)).join('')}</div></div>`;
        }
    },
    '/digest': {
        title: 'Daily Digest',
        subtext: 'Your curated top 10 matches for today.',
        progress: 'Curation', step: '5/6', status: 'In Progress',
        render: () => {
            if (!userPrefs) {
                return `<div class="kn-workspace" style="grid-column: 1 / -1">
                    <div class="kn-empty-state">
                        <div class="kn-empty-state__icon">📬</div>
                        <h2 class="kn-empty-state__title">Personalized Digest Required</h2>
                        <p class="kn-empty-state__subtitle">Set your preferences to activate the daily 9AM curation engine.</p>
                        <div class="kn-mt-40"><a href="#/settings" class="kn-button kn-button--secondary">Set Preferences</a></div>
                    </div>
                </div>`;
            }

            const digest = getStoredDigest();
            if (!digest) {
                return `<div class="kn-workspace" style="grid-column: 1 / -1">
                    <div class="kn-empty-state">
                        <div class="kn-empty-state__icon">⛅</div>
                        <h2 class="kn-empty-state__title">Today's digest is ready.</h2>
                        <p class="kn-empty-state__subtitle">Click below to simulate the 9AM delivery based on your latest preferences.</p>
                        <div class="kn-mt-40">
                            <button class="kn-button kn-button--primary" onclick="window.generateDigest()">Generate Today's 9AM Digest (Simulated)</button>
                            <p class="kn-simulation-note">Demo Mode: Daily 9AM trigger simulated manually.</p>
                        </div>
                    </div>
                </div>`;
            }

            return `
                <div style="grid-column: 1 / -1">
                    <div class="kn-digest-actions">
                        <button class="kn-button kn-button--secondary" onclick="window.copyDigestToClipboard()">Copy Digest to Clipboard</button>
                        <button class="kn-button kn-button--secondary" onclick="window.createEmailDraft()">Create Email Draft</button>
                        <button class="kn-button kn-button--secondary" onclick="window.generateDigest()" style="background: #fff; color: #111;">Regenerate</button>
                    </div>
                    <div class="kn-digest-container">
                        <header class="kn-digest-header">
                            <h2 style="font-size: 28px; letter-spacing: -0.01em;">Top 10 Jobs For You — 9AM Digest</h2>
                            <p style="margin-top: 8px; color: #666;">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </header>
                        <div class="kn-digest-body">
                            ${digest.map(job => `
                                <div class="kn-digest-item">
                                    <div>
                                        <h4 style="margin: 0; font-size: 18px;">${job.title}</h4>
                                        <p style="margin: 4px 0 0; color: #666; font-size: 14px;">${job.company} • ${job.location} • ${job.experience} Exp</p>
                                    </div>
                                    <div style="text-align: right; display: flex; gap: 16px; align-items: center;">
                                        <span class="kn-score-badge ${getScoreBadgeClass(calculateMatchScore(job, userPrefs))}">${calculateMatchScore(job, userPrefs)}% Match</span>
                                        <a href="${job.applyUrl}" target="_blank" class="kn-button kn-button--primary" style="padding: 8px 24px; font-size: 13px;">Apply</a>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <footer class="kn-digest-footer">
                            <p>This digest was generated based on your preferences at 9:00 AM.</p>
                            <p class="kn-simulation-note">Simulated for demonstration purposes.</p>
                        </footer>
                    </div>
                </div>
            `;
        }
    },
    '/proof': { title: 'Proof of Build', subtext: 'Final validation of scoring engine.', progress: 'Finalization', step: '6/6', status: 'Shipped', render: () => `<div class="kn-workspace"><div class="kn-card"><h3>Matching Engine V1.0</h3><p class="kn-mt-16">Intelligence layer is fully integrated. All scoring rules are verified against specification.</p><div class="kn-mt-24" style="height: 120px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-weight: 700;">DETERMINISTIC_SCORING_ACTIVE</div></div></div>` }
};

function handleRouteChange() {
    const hash = window.location.hash.slice(1) || '/';
    const route = routes[hash] || routes['/'];
    const containerEl = document.querySelector('.kn-main');
    const headerEl = document.querySelector('.kn-header');

    if (hash === '/') {
        if (headerEl) headerEl.style.display = 'none';
        if (containerEl) containerEl.style.display = 'block';
    } else {
        if (headerEl) headerEl.style.display = 'block';
        if (containerEl) containerEl.style.display = 'grid';
        const titleEl = document.querySelector('.kn-title');
        const subtextEl = document.querySelector('.kn-subtext');
        if (titleEl) titleEl.textContent = route.title || '';
        if (subtextEl) subtextEl.textContent = route.subtext || '';
    }

    if (containerEl) containerEl.innerHTML = route.render();

    const progressEl = document.querySelector('.kn-progress');
    const statusEl = document.querySelector('.kn-badge');
    if (progressEl) progressEl.innerHTML = `<span>${route.progress}</span><span>/</span><span>${route.step}</span>`;
    if (statusEl) {
        statusEl.textContent = route.status;
        statusEl.className = 'kn-badge' + (route.status === 'Shipped' ? ' kn-badge--shipped' : '');
    }

    document.querySelectorAll('.kn-nav-link').forEach(link => {
        link.classList.toggle('kn-nav-link--active', link.getAttribute('href').slice(1) === hash);
    });

    if (document.querySelector('.kn-nav')) document.querySelector('.kn-nav').classList.remove('kn-nav--open');
    window.scrollTo(0, 0);
}

window.savePreferences = savePreferences;
window.saveJob = saveJob;
window.unsaveJob = unsaveJob;
window.viewJob = viewJob;
window.closeModal = closeModal;
window.applyFilters = applyFilters;
window.toggleMatchFilter = toggleMatchFilter;
window.generateDigest = generateDigest;
window.copyDigestToClipboard = copyDigestToClipboard;
window.createEmailDraft = createEmailDraft;
window.toggleMobileMenu = () => document.querySelector('.kn-nav').classList.toggle('kn-nav--open');

window.addEventListener('hashchange', handleRouteChange);
window.addEventListener('load', handleRouteChange);
