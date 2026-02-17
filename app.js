/**
 * Job Notification Tracker - Intelligence Layer
 * Features: Match Scoring, Preference Persistence, Advanced Filtering
 */

// --- State Management ---
let savedJobIds = JSON.parse(localStorage.getItem('savedJobIds')) || [];
let userPrefs = JSON.parse(localStorage.getItem('jobTrackerPreferences')) || null;
let jobStatuses = JSON.parse(localStorage.getItem('jobTrackerStatus')) || {};
let statusHistory = JSON.parse(localStorage.getItem('jobTrackerStatusHistory')) || [];
let testChecklist = JSON.parse(localStorage.getItem('jobTrackerTestChecklist')) || {};
let projectLinks = JSON.parse(localStorage.getItem('jobTrackerProjectLinks')) || { lovable: '', github: '', deploy: '' };
let showOnlyMatches = false;

const testItems = [
    { id: 'prefs', label: 'Preferences persist after refresh', hint: 'Change settings, refresh, and confirm they remain.' },
    { id: 'score', label: 'Match score calculates correctly', hint: 'Verify score changes based on keyword matches.' },
    { id: 'toggle', label: ' "Show only matches" toggle works', hint: 'Toggle on/off and see low-score jobs hide/show.' },
    { id: 'save', label: 'Save job persists after refresh', hint: 'Save a job, refresh, and check the "Saved" tab.' },
    { id: 'apply', label: 'Apply opens in new tab', hint: 'Click apply and confirm it doesnt close the app.' },
    { id: 'status-persist', label: 'Status update persists after refresh', hint: 'Change status to Applied, refresh, and verify.' },
    { id: 'status-filter', label: 'Status filter works correctly', hint: 'Filter by "Applied" and confirm results.' },
    { id: 'digest-logic', label: 'Digest generates top 10 by score', hint: 'Generate digest and check if they are the best matches.' },
    { id: 'digest-persist', label: 'Digest persists for the day', hint: 'Generate, refresh, and confirm it doesnt disappear.' },
    { id: 'errors', label: 'No console errors on main pages', hint: 'Check Developer Tools Console for any red text.' }
];

function toggleTestItem(id) {
    testChecklist[id] = !testChecklist[id];
    localStorage.setItem('jobTrackerTestChecklist', JSON.stringify(testChecklist));
    handleRouteChange(); // Refresh view
}

function resetTests() {
    testChecklist = {};
    localStorage.removeItem('jobTrackerTestChecklist');
    handleRouteChange();
}

function getPassCount() {
    return Object.values(testChecklist).filter(Boolean).length;
}

function isShipUnlocked() {
    return getPassCount() === 10;
}

function validateUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
}

function areLinksValid() {
    return validateUrl(projectLinks.lovable) &&
        validateUrl(projectLinks.github) &&
        validateUrl(projectLinks.deploy);
}

function isProjectFullyShipped() {
    return isShipUnlocked() && areLinksValid();
}

function getProjectStatus() {
    if (getPassCount() === 0 && !projectLinks.lovable) return 'Not Started';
    if (isProjectFullyShipped()) return 'Shipped';
    return 'In Progress';
}

function updateLink(key, value) {
    projectLinks[key] = value;
    localStorage.setItem('jobTrackerProjectLinks', JSON.stringify(projectLinks));
    handleRouteChange();
}

function copyFinalSubmission() {
    const text = `Job Notification Tracker — Final Submission\n\nLovable Project:\n${projectLinks.lovable}\n\nGitHub Repository:\n${projectLinks.github}\n\nLive Deployment:\n${projectLinks.deploy}\n\nCore Features:\n- Intelligent match scoring\n- Daily digest simulation\n- Status tracking\n- Test checklist enforced`;
    navigator.clipboard.writeText(text).then(() => showToast("Submission copied to clipboard"));
}

function getTodayKey() {
    const d = new Date();
    return `jobTrackerDigest_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- Status Logic ---

function updateJobStatus(jobId, status) {
    jobStatuses[jobId] = status;
    localStorage.setItem('jobTrackerStatus', JSON.stringify(jobStatuses));

    // Add to history
    const job = allJobs.find(j => j.id === jobId);
    statusHistory.unshift({
        title: job.title,
        company: job.company,
        status: status,
        date: new Date().toLocaleString('en-IN')
    });
    // Keep last 20 history items
    if (statusHistory.length > 20) statusHistory.pop();
    localStorage.setItem('jobTrackerStatusHistory', JSON.stringify(statusHistory));

    showToast(`Status updated: ${status}`);
    handleRouteChange();
}

function showToast(message) {
    let container = document.getElementById('kn-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'kn-toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'kn-toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
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
    const currentStatus = jobStatuses[job.id] || 'Not Applied';
    const statusClass = `kn-status--${currentStatus.toLowerCase().replace(' ', '-')}`;

    return `
        <div class="kn-job-card">
            <div class="kn-job-header">
                <span class="kn-company">${job.company}</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="kn-status-badge ${statusClass}">${currentStatus}</span>
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
            <div style="margin-top: 16px; border-top: 1px solid #eee; padding-top: 16px;">
                <label class="kn-label" style="font-size: 11px;">Update Status</label>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    ${['Not Applied', 'Applied', 'Rejected', 'Selected'].map(s => `
                        <button class="kn-button" 
                                style="font-size: 10px; padding: 6px 8px; flex: 1; ${currentStatus === s ? 'background: #111; color: #fff;' : 'background: #f5f5f5;'}" 
                                onclick="window.updateJobStatus(${job.id}, '${s}')">
                            ${s}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="kn-job-footer" style="margin-top: 24px;">
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
                <label class="kn-label">Status</label>
                <select class="kn-select" id="status-filter" onchange="applyFilters()">
                    <option value="">All Status</option>
                    <option>Not Applied</option><option>Applied</option><option>Rejected</option><option>Selected</option>
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
    const statusFilter = document.getElementById('status-filter')?.value || "";
    const modeFilter = document.getElementById('mode-filter')?.value || "";
    const sortBy = document.getElementById('sort-filter')?.value || "latest";

    let filtered = allJobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchTerm) || job.company.toLowerCase().includes(searchTerm);
        const matchesLoc = !locFilter || job.location === locFilter;
        const matchesStatus = !statusFilter || (jobStatuses[job.id] || 'Not Applied') === statusFilter;
        const matchesMode = !modeFilter || job.mode === modeFilter;

        let matchesThreshold = true;
        if (showOnlyMatches && userPrefs) {
            matchesThreshold = calculateMatchScore(job, userPrefs) >= userPrefs.minMatchScore;
        }

        return matchesSearch && matchesLoc && matchesStatus && matchesMode && matchesThreshold;
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
        explanation: 'The dashboard serves as your mission control for job discovery. Use the filter bar to refine your search or activate matching via settings.',
        prompt: 'Filter for "Remote" jobs in "Bangalore" and sort by "Match Score".',
        render: () => `<div style="grid-column: 1 / -1">
            ${renderFilterBar()}
            <div class="kn-job-list" id="job-list-container">${allJobs.map(job => renderJobCard(job)).join('')}</div>
        </div>`
    },
    '/settings': {
        title: 'Matching Preferences', subtext: 'Configure your profile to activate deterministic match scoring.',
        progress: 'Configuration', step: '3/6', status: 'In Progress',
        explanation: 'Configure your target roles and skills. These values directly influence the weighted scoring engine used across the platform.',
        prompt: 'Update experience to "1-3 years" and add "React" and "Node.js" to skills.',
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
        explanation: 'Your saved jobs are persisted locally. Use this space to track roles before you move them to the "Applied" status.',
        prompt: 'Review your saved list and update the status of at least one job to "Applied".',
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
        explanation: 'The digest simulates a daily 9 AM delivery of the best jobs matching your specific profile criteria.',
        prompt: 'Generate the daily digest and copy the summary to your clipboard for external tracking.',
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
                        
                        ${statusHistory.length > 0 ? `
                        <div style="background: #fff; padding: 40px; border-top: 2px solid #eee;">
                            <h3 style="margin-bottom: 24px;">Recent Status Updates</h3>
                            <div class="kn-job-list" style="grid-template-columns: 1fr;">
                                ${statusHistory.slice(0, 5).map(h => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f5f5f5;">
                                        <div>
                                            <div style="font-weight: 500;">${h.title}</div>
                                            <div style="font-size: 12px; color: #888;">${h.company} • ${h.date}</div>
                                        </div>
                                        <span class="kn-status-badge kn-status--${h.status.toLowerCase().replace(' ', '-')}" style="height: fit-content;">${h.status}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <footer class="kn-digest-footer">
                            <p>This digest was generated based on your preferences at 9:00 AM.</p>
                            <p class="kn-simulation-note">Simulated for demonstration purposes.</p>
                        </footer>
                    </div>
                </div>
            `;
        }
    },
    '/test': {
        title: 'Built-In Test Checklist',
        subtext: 'Verify all core features before final software shipment.',
        progress: 'Verification', step: '7/8', status: 'Testing',
        render: () => {
            const passed = getPassCount();
            return `
            <div class="kn-workspace" style="grid-column: 1 / -1">
                <div class="kn-test-summary">
                    <div class="kn-test-score">Tests Passed: ${passed} / 10</div>
                    ${passed < 10 ? `<div class="kn-ship-warning">⚠️ Resolve all issues before shipping.</div>` : `<div class="kn-ship-warning" style="color: #2E7D32;">✅ All systems verified. Ship-Lock released.</div>`}
                    <div class="kn-mt-24">
                        <button class="kn-button kn-button--secondary" onclick="window.resetTests()">Reset Test Status</button>
                    </div>
                </div>
                <div class="kn-checklist-group">
                    ${testItems.map(item => `
                        <div class="kn-checklist-item" onclick="window.toggleTestItem('${item.id}')">
                            <input type="checkbox" ${testChecklist[item.id] ? 'checked' : ''} onchange="return false">
                            <div class="kn-checklist-label">
                                <strong>${item.label}</strong>
                                <div class="kn-test-tooltip">${item.hint}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="kn-mt-40" style="text-align: center;">
                    <a href="#/proof" class="kn-button ${isShipUnlocked() ? 'kn-button--primary' : 'kn-button--secondary'}" ${!isShipUnlocked() ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>Proceed to Proof (07)</a>
                </div>
            </div>`;
        }
    },
    '/jt/07-test': { alias: '/test' },
    '/proof': {
        title: 'Proof of Build',
        subtext: 'Verify milestones and provide artifact collection.',
        progress: 'Finalization', step: '8/8', status: getProjectStatus(),
        render: () => {
            if (!isShipUnlocked()) {
                window.location.hash = '#/test';
                return '';
            }
            const milestones = [
                { id: 1, label: 'Hero Layout & Navigation', checked: true },
                { id: 2, label: 'Indian Tech Job Dataset (60 Jobs)', checked: true },
                { id: 3, label: 'Deterministic Scoring Engine', checked: true },
                { id: 4, label: 'Filter Bar (AND Logic)', checked: true },
                { id: 5, label: 'Job Details & Save Logic', checked: true },
                { id: 6, label: 'Daily 9AM Digest Engine', checked: true },
                { id: 7, label: 'Application Status Tracking', checked: true },
                { id: 8, label: 'Ship-Lock Built-In Testing', checked: true }
            ];
            return `
            <div class="kn-workspace" style="grid-column: 1 / -1">
                <div class="kn-card">
                    <h3>Project 1 — Job Notification Tracker</h3>
                    <div class="kn-summary-list kn-mt-24">
                        ${milestones.map(m => `
                            <div class="kn-summary-item">
                                <span>${m.id}. ${m.label}</span>
                                <span class="kn-summary-status ${m.checked ? 'kn-summary--completed' : 'kn-summary--pending'}">${m.checked ? 'Completed' : 'Pending'}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="kn-artifact-form">
                        <h3>Artifact Collection</h3>
                        <div class="kn-form-group">
                            <label class="kn-label">Lovable Project Link</label>
                            <input type="url" class="kn-input" value="${projectLinks.lovable}" onchange="window.updateLink('lovable', this.value)" placeholder="https://lovable.dev/projects/...">
                        </div>
                        <div class="kn-form-group">
                            <label class="kn-label">GitHub Repository Link</label>
                            <input type="url" class="kn-input" value="${projectLinks.github}" onchange="window.updateLink('github', this.value)" placeholder="https://github.com/...">
                        </div>
                        <div class="kn-form-group">
                            <label class="kn-label">Live Deployment URL</label>
                            <input type="url" class="kn-input" value="${projectLinks.deploy}" onchange="window.updateLink('deploy', this.value)" placeholder="https://...vercel.app">
                        </div>
                        
                        <div class="kn-mt-40">
                            <button class="kn-button ${areLinksValid() ? 'kn-button--primary' : 'kn-button--secondary'}" onclick="window.copyFinalSubmission()" ${!areLinksValid() ? 'disabled' : ''}>Copy Final Submission</button>
                            ${isProjectFullyShipped() ? `<a href="#/ship" class="kn-button kn-button--primary" style="margin-left: 12px;">Final Shipment</a>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
        }
    },
    '/jt/proof': { alias: '/proof' },
    '/ship': {
        title: 'Project Shipped',
        subtext: 'Official completion of the Job Notification Tracker.',
        progress: 'Complete', step: '8/8', status: 'Shipped',
        render: () => {
            if (!isProjectFullyShipped()) {
                window.location.hash = '#/proof';
                return '';
            }
            return `
            <div class="kn-workspace" style="grid-column: 1 / -1">
                <div class="kn-shipped-message">
                    <h2 style="font-size: 32px; font-family: var(--font-serif);">Project 1 Shipped Successfully.</h2>
                    <p style="margin-top: 16px; color: #666;">All milestones cleared. Artifacts verified. Intelligence matching active.</p>
                    <div class="kn-shipped-code">SHIPMENT_ID: PROJECT_01_SUCCESS_2026</div>
                    <div class="kn-mt-40">
                        <a href="#/dashboard" class="kn-button kn-button--primary">Back to Dashboard</a>
                    </div>
                </div>
            </div>`;
        }
    },
    '/jt/08-ship': { alias: '/ship' }
};

function handleRouteChange() {
    const hash = window.location.hash.slice(1) || '/';

    // SHIP LOCK REDIRECT
    if ((hash === '/ship' || hash === '/jt/08-ship') && !isProjectFullyShipped()) {
        window.location.hash = '#/proof';
        return;
    }
    if ((hash === '/proof' || hash === '/jt/proof') && !isShipUnlocked()) {
        window.location.hash = '#/test';
        return;
    }

    // Safe route resolution including aliases
    let activeRoute = routes[hash];
    if (activeRoute && activeRoute.alias) {
        activeRoute = routes[activeRoute.alias];
    }
    if (!activeRoute) {
        activeRoute = routes['/'];
    }

    const workspaceEl = document.getElementById('primary-workspace');
    const panelEl = document.getElementById('secondary-panel');
    const headerEl = document.querySelector('.kn-header');

    if (hash === '/') {
        if (headerEl) headerEl.style.display = 'none';
        if (workspaceEl) workspaceEl.innerHTML = activeRoute.render ? activeRoute.render() : '';
        if (panelEl) panelEl.style.display = 'none';
    } else {
        if (headerEl) headerEl.style.display = 'block';
        if (workspaceEl) workspaceEl.parentElement.style.display = 'grid';
        if (panelEl) panelEl.style.display = 'block';

        const titleEl = document.querySelector('.kn-title');
        const subtextEl = document.querySelector('.kn-subtext');
        if (titleEl) titleEl.textContent = activeRoute.title || '';
        if (subtextEl) subtextEl.textContent = activeRoute.subtext || '';

        // Render Primary Workspace
        if (workspaceEl) workspaceEl.innerHTML = activeRoute.render ? activeRoute.render() : '';

        // Render Standard Secondary Panel
        if (panelEl) {
            panelEl.innerHTML = `
                <div class="kn-card">
                    <h3>Step ${activeRoute.step || 'Info'}</h3>
                    <p class="kn-mt-16" style="font-size: 14px; color: #666; line-height: 1.6;">
                        ${activeRoute.explanation || 'Follow the primary workspace instructions to complete this milestone.'}
                    </p>
                    <div class="kn-mt-24">
                        <label class="kn-label">Action Prompt</label>
                        <div style="background: #f9f9f3; padding: 12px; border: 1px solid #e0ddd5; font-family: monospace; font-size: 12px; margin-bottom: 16px;">
                            ${activeRoute.prompt || 'No prompt for this step.'}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <button class="kn-button kn-button--secondary" style="font-size: 11px; padding: 10px;" onclick="navigator.clipboard.writeText('${activeRoute.prompt || ''}').then(() => showToast('Prompt copied'))">Copy Prompt</button>
                            <button class="kn-button kn-button--primary" style="font-size: 11px; padding: 10px;">Build in Lovable</button>
                            <button class="kn-button kn-button--secondary" style="font-size: 11px; padding: 10px;" onclick="showToast('Verified')">It Worked</button>
                            <button class="kn-button kn-button--secondary" style="font-size: 11px; padding: 10px; color: var(--color-accent);" onclick="showToast('Error logged')">Error</button>
                        </div>
                        <button class="kn-button kn-button--secondary" style="width: 100%; margin-top: 8px; font-size: 11px; padding: 10px;">Add Screenshot</button>
                    </div>
                </div>
            `;
        }
    }

    const progressEl = document.querySelector('.kn-progress');
    const statusEl = document.querySelector('.kn-badge');
    if (progressEl) progressEl.innerHTML = `<span>${activeRoute.progress}</span><span>/</span><span>${activeRoute.step}</span>`;
    if (statusEl) {
        statusEl.textContent = activeRoute.status;
        statusEl.className = 'kn-badge' + (activeRoute.status === 'Shipped' ? ' kn-badge--shipped' : '');
    }

    // Update global project status badge
    const globalStatusBadge = document.querySelector('.kn-badge--project-status');
    if (globalStatusBadge) {
        const ps = getProjectStatus();
        globalStatusBadge.textContent = ps;
        globalStatusBadge.className = 'kn-badge kn-badge--project-status' + (ps === 'Shipped' ? ' kn-badge--shipped' : '');
    }

    document.querySelectorAll('.kn-nav-link').forEach(link => {
        const linkHref = link.getAttribute('href').slice(1);
        link.classList.toggle('kn-nav-link--active', linkHref === hash || (routes[linkHref] && routes[linkHref].alias === hash));

        // Ship lock visualization
        if (linkHref === '/ship' || linkHref === '/proof' || linkHref === '/jt/08-ship' || linkHref === '/jt/proof') {
            const locked = (linkHref.includes('ship') && !isProjectFullyShipped()) || (linkHref.includes('proof') && !isShipUnlocked());
            link.classList.toggle('kn-nav-link--locked', locked);
        }
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
window.updateJobStatus = updateJobStatus;
window.toggleTestItem = toggleTestItem;
window.resetTests = resetTests;
window.updateLink = updateLink;
window.copyFinalSubmission = copyFinalSubmission;
window.toggleMobileMenu = () => document.querySelector('.kn-nav').classList.toggle('kn-nav--open');

window.addEventListener('hashchange', handleRouteChange);
window.addEventListener('load', handleRouteChange);
