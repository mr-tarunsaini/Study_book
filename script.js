// --- Global Toast Notification System ---
window.showToast = function(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span style="font-weight: 500; font-size: 0.95rem;">${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3500); // Hide after 3.5 seconds
};

// --- Global Custom Confirm Modal ---
window.showConfirm = function(title, message, isDanger = false) {
    return new Promise((resolve) => {
        let overlay = document.getElementById('confirm-modal-overlay');
        
        if (!overlay) {
            const html = `
                <div class="confirm-modal-overlay" id="confirm-modal-overlay">
                    <div class="confirm-modal">
                        <i class="fas fa-question-circle confirm-icon" id="confirm-icon"></i>
                        <h3 class="confirm-title" id="confirm-title"></h3>
                        <p class="confirm-message" id="confirm-message"></p>
                        <div class="confirm-actions">
                            <button class="btn btn-outline" id="confirm-cancel-btn">Cancel</button>
                            <button class="btn btn-blue" id="confirm-ok-btn">Confirm</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
            overlay = document.getElementById('confirm-modal-overlay');
        }

        const icon = document.getElementById('confirm-icon');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        
        icon.className = isDanger ? 'fas fa-exclamation-triangle confirm-icon danger' : 'fas fa-question-circle confirm-icon';
        okBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-blue';
        okBtn.textContent = isDanger ? 'Delete' : 'Confirm';

        const close = (result) => {
            overlay.classList.remove('active');
            resolve(result);
        };
        okBtn.onclick = () => close(true);
        cancelBtn.onclick = () => close(false);
        setTimeout(() => overlay.classList.add('active'), 10);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menu-btn');
    const closeBtn = document.getElementById('close-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');

    // --- PDF.js Setup for Previews ---
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const renderPdfPreview = (canvas, url) => {
        if (!canvas || !url || typeof pdfjsLib === 'undefined') return;

        const previewContainer = canvas.parentElement;
        const loader = canvas.parentElement.querySelector('.preview-loader');
        if (previewContainer) previewContainer.classList.remove('preview-loaded');
        if (loader) {
            loader.style.display = 'flex';
            loader.classList.remove('is-error');
            loader.innerHTML = '<i class="fas fa-file-pdf"></i><span>Preparing preview...</span>';
        }

        pdfjsLib.getDocument(url).promise.then(pdfDoc => {
            return pdfDoc.getPage(1); // Get the first page
        }).then(page => {
            const containerWidth = canvas.parentElement.clientWidth;
            if (containerWidth === 0) {
                if (loader) loader.innerHTML = '<i class="fas fa-file-pdf"></i>';
                return;
            }
            
            const viewport = page.getViewport({ scale: 1 });
            const scale = containerWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale: scale });

            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;

            const renderContext = {
                canvasContext: canvas.getContext('2d'),
                viewport: scaledViewport
            };
            
            page.render(renderContext).promise.then(() => {
                if (loader) loader.style.display = 'none';
                if (previewContainer) previewContainer.classList.add('preview-loaded');
                canvas.style.display = 'block';
            });

        }).catch(error => {
            console.error('Error rendering PDF preview for:', url, error);
            if (loader) {
                loader.classList.add('is-error');
                loader.innerHTML = '<i class="fas fa-file-alt"></i><span>Preview unavailable</span>';
            }
        });
    };

    let savedDocIdsCache = null;
    let savedDocIdsCacheUid = null;
    const CONTINUE_READING_KEY = 'continue_reading_materials';
    const getLocalSavedKey = (uid) => `saved_pdfs_${uid}`;
    const getLocalSavedMap = (uid) => {
        if (!uid) return {};
        try {
            return JSON.parse(localStorage.getItem(getLocalSavedKey(uid)) || '{}');
        } catch (error) {
            return {};
        }
    };
    const setLocalSavedMap = (uid, map) => {
        if (!uid) return;
        localStorage.setItem(getLocalSavedKey(uid), JSON.stringify(map || {}));
    };
    const getLocalSavedIds = (uid) => new Set(Object.keys(getLocalSavedMap(uid)));
    const upsertLocalSaved = (uid, material) => {
        if (!uid || !material || !material.id) return;
        const savedMap = getLocalSavedMap(uid);
        savedMap[material.id] = {
            id: material.id,
            fileUrl: material.fileUrl || '',
            title: material.title || 'Study Material',
            subject: material.subject || 'General Subject',
            type: material.type || 'Notes',
            description: material.description || '',
            createdAt: material.createdAt || new Date().toISOString(),
            savedAt: new Date().toISOString()
        };
        setLocalSavedMap(uid, savedMap);
    };
    const removeLocalSaved = (uid, docId) => {
        if (!uid || !docId) return;
        const savedMap = getLocalSavedMap(uid);
        delete savedMap[docId];
        setLocalSavedMap(uid, savedMap);
    };
    const buildMaterialFromCard = (saveBtn) => {
        const card = saveBtn.closest('.document-card');
        if (!card) return null;
        const subtitle = (card.querySelector('.doc-subtitle')?.textContent || '').split('•');
        return {
            id: saveBtn.dataset.docId,
            fileUrl: card.dataset.pdfUrl || '',
            title: (card.querySelector('.doc-title')?.textContent || 'Study Material').trim(),
            subject: (subtitle[0] || 'General Subject').trim(),
            type: (subtitle[1] || 'Notes').trim(),
            createdAt: new Date().toISOString()
        };
    };
    const getContinueReadingList = () => {
        try {
            const list = JSON.parse(localStorage.getItem(CONTINUE_READING_KEY) || '[]');
            return Array.isArray(list) ? list : [];
        } catch (error) {
            return [];
        }
    };
    const saveContinueReadingItem = (material) => {
        if (!material || !material.fileUrl) return;
        const normalized = {
            id: material.id || material.fileUrl,
            fileUrl: material.fileUrl,
            title: material.title || 'Study Material',
            subject: material.subject || 'General Subject',
            type: material.type || 'Notes',
            createdAt: material.createdAt || new Date().toISOString(),
            lastOpenedAt: new Date().toISOString()
        };
        const existing = getContinueReadingList().filter(item => (item.fileUrl || '') !== normalized.fileUrl);
        const updated = [normalized, ...existing].slice(0, 20);
        localStorage.setItem(CONTINUE_READING_KEY, JSON.stringify(updated));
    };
    const buildMaterialCardHTML = (mat) => {
        const diffDays = Math.floor(Math.abs(new Date() - new Date(mat.createdAt || new Date().toISOString())) / (1000 * 60 * 60 * 24));
        const timeAgo = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
        const safeId = mat.id || mat.fileUrl || `${Date.now()}`;
        return `
            <a href="viewer.html?file=${encodeURIComponent(mat.fileUrl)}&title=${encodeURIComponent(mat.title || 'Study Material')}&doc=${encodeURIComponent(safeId)}" target="_blank" class="document-card" data-pdf-url="${mat.fileUrl}">
                <div class="doc-preview-container">
                    <canvas class="pdf-preview-canvas" style="display: none;"></canvas>
                    <div class="preview-loader"><i class="fas fa-file-pdf"></i><span>Preparing preview...</span></div>
                </div>
                <div class="doc-info">
                    <h3 class="doc-title">${mat.title || 'Study Material'}</h3>
                    <span class="doc-subtitle">${mat.subject || 'General Subject'} • ${mat.type || 'Notes'} • ${timeAgo}</span>
                    <div class="doc-actions">
                        <button type="button" class="save-pdf-btn" data-doc-id="${safeId}" title="Save PDF"><i class="far fa-bookmark"></i></button>
                    </div>
                </div>
            </a>
        `;
    };
    const hydrateMaterialCards = (grid) => {
        if (!grid) return;
        grid.querySelectorAll('.document-card[data-pdf-url]').forEach(card => {
            if (!card.dataset.previewRendered) {
                const canvas = card.querySelector('.pdf-preview-canvas');
                const url = card.dataset.pdfUrl;
                renderPdfPreview(canvas, url);
                card.dataset.previewRendered = 'true';
            }
        });
        syncSaveButtons(grid);
    };
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const ensureSaveApiReady = async (retries = 8, waitMs = 250) => {
        for (let i = 0; i < retries; i++) {
            if (typeof window.toggleSaveMaterial === 'function' && typeof window.getSavedMaterials === 'function') {
                return true;
            }
            await delay(waitMs);
        }
        return false;
    };
    const setCardSaveBtnState = (btn, isSaved) => {
        if (!btn) return;
        btn.classList.toggle('saved', !!isSaved);
        btn.innerHTML = `<i class="fa${isSaved ? 's' : 'r'} fa-bookmark"></i>`;
        btn.title = isSaved ? 'Saved' : 'Save PDF';
    };

    const getSavedDocIds = async (uid) => {
        const ready = await ensureSaveApiReady();
        if (!uid) return new Set();
        const localIds = getLocalSavedIds(uid);
        if (!ready) return localIds;
        if (savedDocIdsCache && savedDocIdsCacheUid === uid) return savedDocIdsCache;
        const savedMaterials = await window.getSavedMaterials(uid);
        const mergedIds = new Set([...savedMaterials.map(mat => mat.id), ...Array.from(localIds)]);
        savedDocIdsCache = mergedIds;
        savedDocIdsCacheUid = uid;
        return savedDocIdsCache;
    };

    const syncSaveButtons = async (scope = document) => {
        const saveBtns = scope.querySelectorAll('.save-pdf-btn[data-doc-id]');
        if (saveBtns.length === 0) return;

        const uid = localStorage.getItem('userUid');
        if (!uid) {
            saveBtns.forEach(btn => setCardSaveBtnState(btn, false));
            return;
        }

        try {
            const savedIds = await getSavedDocIds(uid);
            saveBtns.forEach(btn => setCardSaveBtnState(btn, savedIds.has(btn.dataset.docId)));
        } catch (error) {
            console.error('Failed to sync saved states:', error);
            saveBtns.forEach(btn => setCardSaveBtnState(btn, false));
        }
    };

    // Function to open sidebar
    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling bg
    }

    // Function to close sidebar
    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }

    // Event Listeners
    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Desktop Canva Sidebar Toggle
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('expanded');
            document.body.classList.toggle('sidebar-expanded');
        });
    }

    // Theme Toggle Logic
    const themeBtns = document.querySelectorAll('#theme-toggle, #theme-toggle-nav, #theme-toggle-mobile');

    function updateThemeIcons(isDark) {
        themeBtns.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                if (isDark) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                } else {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
            }
        });
    }

    // Check for saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    let isDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark.matches);

    if (isDark) {
        document.body.classList.add('dark-mode');
    }
    updateThemeIcons(isDark);

    // Listen for system theme changes
    systemPrefersDark.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            isDark = e.matches;
            document.body.classList.toggle('dark-mode', isDark);
            updateThemeIcons(isDark);
        }
    });

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeIcons(isDark);
        });
    });

    // Active Link Logic
    const navLinks = document.querySelectorAll('.nav-links a, .sidebar-link');
    const sections = document.querySelectorAll('section');
    
    // Get current page filename
    const path = window.location.pathname;
    const page = path.split("/").pop() || 'index.html';

    function setActiveLink() {
        // Logic for index.html (Scroll Spy)
        if (page === 'index.html') {
            let current = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                if (window.scrollY >= (sectionTop - 150)) {
                    const id = section.getAttribute('id');
                    if (id) {
                        current = id;
                    }
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                const href = link.getAttribute('href');
                
                if (current) {
                    if (href.includes(`#${current}`)) {
                        link.classList.add('active');
                    }
                } else {
                    if (href === 'index.html' || href === '#' || href === './') {
                        link.classList.add('active');
                    }
                }
            });
        } else {
            // Logic for other pages
            const urlParams = new URLSearchParams(window.location.search);
            const qParam = urlParams.get('q');

            navLinks.forEach(link => {
                link.classList.remove('active');
                const href = link.getAttribute('href');
                
                if (!href) return;

                if (page === 'search.html' && qParam && href.includes(`search.html?q=${qParam}`)) {
                    link.classList.add('active');
                } else if (page === 'notes.html' && href.includes('notes.html')) {
                    link.classList.add('active');
                } else if (page === 'pyqs.html' && href.includes('pyqs.html')) {
                    link.classList.add('active');
                } else if (page === 'syllabus.html' && href.includes('syllabus.html')) {
                    link.classList.add('active');
                } else if (page === 'calculator.html' && href.includes('calculator.html')) {
                    link.classList.add('active');
                } else if (page === 'about.html' && href.includes('about.html')) {
                    link.classList.add('active');
                } else if (page === 'contact.html' && href.includes('contact.html')) {
                    link.classList.add('active');
                } else if (page === 'privacy_policy.html' && href.includes('privacy_policy.html')) {
                    link.classList.add('active');
                } else if (page === 'terms_conditions.html' && href.includes('terms_conditions.html')) {
                    link.classList.add('active');
                } else if (page === 'account.html' && href.includes('login.html')) {
                    link.classList.add('active'); // Keep profile icon active on account page
                } else if (page === 'coming_soon.html' && href === 'index.html') {
                    link.classList.add('active');
                } else if (page === 'login.html' && href.includes('login.html')) {
                    link.classList.add('active');
                }
            });
        }
    }

    // Run on load
    setActiveLink();

    // Run on scroll only for index page
    if (page === 'index.html') {
        window.addEventListener('scroll', setActiveLink);
    }
    
    // Specific manual override for Viewer theme toggle binding
    const viewerThemeBtn = document.getElementById('theme-toggle-viewer');
    if (viewerThemeBtn) viewerThemeBtn.addEventListener('click', () => themeBtns[0].click());

    // --- Live Search Logic (Studocu Style) ---
    if (page === 'index.html') {
        const homeSearchInput = document.getElementById('home-search-input');
        const searchBar = document.getElementById('home-search-bar');
        const resultsDropdown = document.getElementById('live-search-results');
        
        if (homeSearchInput && resultsDropdown) {
            let allMaterials = null;

            homeSearchInput.addEventListener('input', async (e) => {
                const q = e.target.value.toLowerCase().trim();
                
                if (q.length < 2) {
                    resultsDropdown.classList.remove('active');
                    searchBar.classList.remove('active-dropdown');
                    return;
                }

                if (!allMaterials) {
                    resultsDropdown.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-light);"><i class="fas fa-spinner fa-spin"></i> Searching database...</div>';
                    resultsDropdown.classList.add('active');
                    searchBar.classList.add('active-dropdown');
                    
                    if (window.searchMaterialsFirestore) {
                        allMaterials = await window.searchMaterialsFirestore();
                    } else {
                        // Fallback if Firebase hasn't loaded fully yet
                        return;
                    }
                }

                const filtered = allMaterials.filter(mat => {
                    return (mat.title && mat.title.toLowerCase().includes(q)) || 
                           (mat.subject && mat.subject.toLowerCase().includes(q)) ||
                           (mat.description && mat.description.toLowerCase().includes(q)) ||
                           (mat.course && mat.course.toLowerCase().includes(q)) ||
                           (mat.branch && mat.branch.toLowerCase().includes(q));
                }).slice(0, 5); // Show top 5 best results

                if (filtered.length > 0) {
                    resultsDropdown.innerHTML = '';
                    filtered.forEach(mat => {
                        let iconClass = mat.type && mat.type.includes('PYQ') ? 'fa-file-circle-question' : 'fa-file-alt';
                        let iconColorStyle = mat.type && mat.type.includes('PYQ') ? 'color: var(--purple-accent); background: var(--icon-bg-purple);' : '';
                        
                        const metaParts = [];
                        if (mat.course) metaParts.push(mat.course);
                        if (mat.branch) metaParts.push(mat.branch);
                        if (mat.subject) metaParts.push(mat.subject);
                        metaParts.push(mat.type || 'Notes');

                        const itemHTML = `
                            <a href="${mat.fileUrl}" target="_blank" class="live-search-item">
                                <div class="live-search-icon" style="${iconColorStyle}"><i class="fas ${iconClass}"></i></div>
                                <div class="live-search-text">
                                    <span class="live-search-title">${mat.title}</span>
                                    <span class="live-search-subtitle">${metaParts.join(' • ')}</span>
                                </div>
                            </a>
                        `;
                        resultsDropdown.insertAdjacentHTML('beforeend', itemHTML);
                    });
                    
                    resultsDropdown.insertAdjacentHTML('beforeend', `
                        <a href="search.html?q=${encodeURIComponent(q)}" class="live-search-item view-all-link">
                            See all results for "${e.target.value}" <i class="fas fa-arrow-right"></i>
                        </a>
                    `);
                } else {
                    resultsDropdown.innerHTML = `
                        <div style="padding: 20px; text-align: center; color: var(--text-light);">
                            No results found for "<b>${e.target.value}</b>"<br>
                            <span style="font-size: 0.85rem; margin-top: 5px; display: inline-block;">Try searching by subject or topic</span>
                        </div>
                    `;
                }
            });

            // Hide dropdown when user clicks somewhere else
            document.addEventListener('click', (e) => {
                if (!searchBar.contains(e.target) && !resultsDropdown.contains(e.target)) {
                    resultsDropdown.classList.remove('active');
                    searchBar.classList.remove('active-dropdown');
                }
            });
            
            // Show dropdown again if they click back into the input with text inside
            homeSearchInput.addEventListener('focus', () => {
                if (homeSearchInput.value.trim().length >= 2) {
                    resultsDropdown.classList.add('active');
                    searchBar.classList.add('active-dropdown');
                }
            });
        }
    }

    // Tab Switching Logic for Notes Page
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                tabBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');

                // Hide all contents
                tabContents.forEach(content => content.classList.remove('active'));
                // Show target content
                const targetId = btn.getAttribute('data-tab');
                const targetContent = document.getElementById(targetId);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });

        // Check for URL parameters to switch tabs and perform search
        const urlParams = new URLSearchParams(window.location.search);
        const yearParam = urlParams.get('year');

        if (yearParam) {
            const targetTabBtn = document.querySelector(`.tab-btn[data-tab="year-${yearParam}"]`);
            if (targetTabBtn) {
                targetTabBtn.click();
            }
        }
    }

    // Subject Accordion Logic
    const subjectHeaders = document.querySelectorAll('.subject-header');
    subjectHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const card = header.parentElement;

            // Close other open cards
            document.querySelectorAll('.subject-card.active').forEach(c => {
                if (c !== card) {
                    c.classList.remove('active');
                }
            });

            card.classList.toggle('active');
        });
    });

    // AKTU Subject Data (Standard Credit Scheme for CSE/AIML)
    const aktuSubjects = {
        "sem1": [
            { name: "Engg Physics", credit: 4 },
            { name: "Engg Math-I", credit: 4 },
            { name: "Basic Electrical", credit: 3 },
            { name: "PPS", credit: 3 },
            { name: "Ecology", credit: 3 },
            { name: "Physics Lab", credit: 1 },
            { name: "Electrical Lab", credit: 1 },
            { name: "Programming Lab", credit: 1 },
            { name: "Graphics Lab", credit: 2 }
        ],
        "sem2": [
            { name: "Engg Chemistry", credit: 4 },
            { name: "Engg Math-II", credit: 4 },
            { name: "Basic Electronics", credit: 3 },
            { name: "Mechanical", credit: 3 },
            { name: "Soft Skills", credit: 3 },
            { name: "Chemistry Lab", credit: 1 },
            { name: "Electronics Lab", credit: 1 },
            { name: "English Lab", credit: 1 },
            { name: "Workshop", credit: 2 }
        ],
        "sem3": [
            { name: "Engg Maths-III", credit: 4 },
            { name: "Universal Human Value", credit: 3 },
            { name: "Data Structures", credit: 4 },
            { name: "Computer Org & Arch", credit: 4 },
            { name: "Discrete Structures", credit: 3 },
            { name: "Data Structures Lab", credit: 1 },
            { name: "COA Lab", credit: 1 },
            { name: "Web Designing Workshop", credit: 1 },
            { name: "Cyber Security", credit: 2 },
            { name: "Mini Project / Internship", credit: 2 }
        ],
        "sem4": [
            { name: "Maths-IV", credit: 4 },
            { name: "Technical Communication", credit: 3 },
            { name: "Operating Systems", credit: 4 },
            { name: "Automata Theory", credit: 4 },
            { name: "Object Orient Programming", credit: 3 },
            { name: "Operating Systems Lab", credit: 1 },
            { name: "Object Oriented Programming Lab", credit: 1 },
            { name: "Cyber Security Workshop", credit: 1 },
            { name: "Python Programming", credit: 2 }
        ],
        "sem5": [
            { name: "DBMS", credit: 4 },
            { name: "Web Technology", credit: 4 },
            { name: "Design & Analysis of Algo", credit: 4 },
            { name: "Dept. Elective-I", credit: 3 },
            { name: "Dept. Elective-II", credit: 3 },
            { name: "DBMS Lab", credit: 1 },
            { name: "Web Technology Lab", credit: 1 },
            { name: "Design & Analysis of Algo Lab", credit: 1 },
            { name: "Mini Project", credit: 2 }
        ],
        "sem6": [
            { name: "Software Engineering", credit: 4 },
            { name: "Compiler Design", credit: 4 },
            { name: "Computer Networks", credit: 4 },
            { name: "Dept. Elective-III", credit: 3 },
            { name: "Open Elective-I", credit: 3 },
            { name: "Software Engineering Lab", credit: 1 },
            { name: "Compiler Design Lab", credit: 1 },
            { name: "Computer Networks Lab", credit: 1 }
        ],
        "sem7": [
            { name: "Artificial Intelligence", credit: 3 },
            { name: "Dept. Elective-IV", credit: 3 },            
            { name: "Open Elective-II", credit: 3 },
            { name: "Artificial Intelligence Lab", credit: 1 },
            { name: "Mini Project", credit: 2 },
            { name: "Project-I", credit: 5 },
            { name: "Startup and Entrepreneurial Activity", credit: 2 }
        ],
        "sem8": [
            { name: "Open Elective-III", credit: 3 },
            { name: "Open Elective-IV", credit: 3 },
            { name: "Project-II", credit: 10 }
        ]
    };

    // --- Calculator Logic ---
    const sgpaContainer = document.getElementById('sgpa-rows');
    const semesterSelect = document.getElementById('semester-select');

    if (sgpaContainer) {
        // Semester Selection Listener
        if (semesterSelect) {
            semesterSelect.addEventListener('change', (e) => {
                renderSemesterRows(e.target.value);
            });
        }

        // Calculate SGPA
        document.getElementById('calculate-sgpa-btn').addEventListener('click', calculateSGPA);

        // Calculate YGPA
        document.getElementById('calculate-ygpa-btn').addEventListener('click', calculateYGPA);

        // Calculate CGPA
        document.getElementById('calculate-cgpa-btn').addEventListener('click', calculateCGPA);
    }

    function renderSemesterRows(semester) {
        sgpaContainer.innerHTML = ''; // Clear existing
        if (!semester || !aktuSubjects[semester]) return;

        const subjects = aktuSubjects[semester];
        subjects.forEach(sub => {
            const row = document.createElement('div');
            row.className = 'calc-row';
            row.style.gridTemplateColumns = '2fr 1fr 1fr'; // Adjust layout for name
            row.innerHTML = `
                <div class="calc-label" style="align-self: center; margin: 0; font-weight: 500; color: var(--text-dark);">${sub.name}</div>
                <input type="number" class="calc-input credit-input" value="${sub.credit}" min="0" style="text-align: center;" placeholder="Credits">
                <input type="text" class="calc-input grade-input" placeholder="Grade/Pt">
            `;
            sgpaContainer.appendChild(row);
        });
    }

    function calculateSGPA() {
        const rows = document.querySelectorAll('#sgpa-rows .calc-row');
        let totalCredits = 0;
        let totalPoints = 0;

        rows.forEach(row => {
            const credit = parseFloat(row.querySelector('.credit-input').value);
            const gradeVal = row.querySelector('.grade-input').value.trim().toUpperCase();

            if (!isNaN(credit) && gradeVal) {
                let point = 0;
                // Check if input is marks (number) or grade (string)
                if (!isNaN(gradeVal)) {
                    const marks = parseFloat(gradeVal);
                    if (marks >= 90) point = 10;
                    else if (marks >= 80) point = 9;
                    else if (marks >= 70) point = 8;
                    else if (marks >= 60) point = 7;
                    else if (marks >= 50) point = 6;
                    else if (marks >= 45) point = 5;
                    else if (marks >= 40) point = 4;
                    else point = 0;
                } else {
                    // Grade Mapping
                    switch (gradeVal) {
                        case 'O': point = 10; break;
                        case 'A+': point = 9; break;
                        case 'A': point = 8; break;
                        case 'B+': point = 7; break;
                        case 'B': point = 6; break;
                        case 'C': point = 5; break;
                        case 'P': point = 4; break;
                        case 'F': point = 0; break;
                        default: point = 0;
                    }
                }

                totalCredits += credit;
                totalPoints += (credit * point);
            }
        });

        const resultBox = document.getElementById('sgpa-result');
        if (totalCredits > 0) {
            const sgpa = (totalPoints / totalCredits).toFixed(2);
            resultBox.querySelector('span').textContent = sgpa;
            resultBox.classList.add('show');
        } else {
            window.showToast('Please enter valid credits and grades/marks.', 'error');
        }
    }

    function calculateYGPA() {
        const odd = parseFloat(document.getElementById('ygpa-odd').value);
        const even = parseFloat(document.getElementById('ygpa-even').value);
        const resultBox = document.getElementById('ygpa-result');

        if (!isNaN(odd) && !isNaN(even)) {
            const ygpa = ((odd + even) / 2).toFixed(2);
            resultBox.querySelector('span').textContent = ygpa;
            resultBox.classList.add('show');
        } else {
            window.showToast('Please enter valid SGPA for both semesters.', 'error');
        }
    }

    function calculateCGPA() {
        const inputs = document.querySelectorAll('.cgpa-input');
        let totalSgpa = 0;
        let count = 0;

        inputs.forEach(input => {
            const val = parseFloat(input.value);
            if (!isNaN(val)) {
                totalSgpa += val;
                count++;
            }
        });

        const resultBox = document.getElementById('cgpa-result');
        if (count > 0) {
            const cgpa = (totalSgpa / count).toFixed(2);
            resultBox.querySelector('span').textContent = cgpa;
            resultBox.classList.add('show');
        } else {
            window.showToast('Please enter SGPA for at least one semester.', 'error');
        }
    }

    // --- Subject Search Logic ---
    const searchInput = document.getElementById('subject-search');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    if (searchInput) {
        const filterSubjects = () => {
            const term = searchInput.value.toLowerCase().trim();
            const activeTab = document.querySelector('.tab-content.active');
            
            if (activeTab) {
                const cards = activeTab.querySelectorAll('.subject-card');
                let hasVisibleCards = false;
                cards.forEach(card => {
                    const titleEl = card.querySelector('h3');
                    const unitSpans = card.querySelectorAll('.unit-item span');

                    // Helper to escape regex characters
                    const escapeRegExp = (string) => {
                        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    };

                    // Helper to highlight text
                    const highlightText = (element, text, searchTerm) => {
                        if (!searchTerm) {
                            element.innerHTML = text;
                            return false;
                        }
                        if (text.toLowerCase().includes(searchTerm)) {
                            const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
                            element.innerHTML = text.replace(regex, '<span class="highlight-text">$1</span>');
                            return true;
                        } else {
                            element.innerHTML = text;
                            return false;
                        }
                    };

                    // Check Title
                    const originalTitle = titleEl.textContent;
                    const titleMatch = highlightText(titleEl, originalTitle, term);

                    // Check Units
                    let unitMatch = false;
                    unitSpans.forEach(span => {
                        const originalUnitText = span.textContent;
                        if (highlightText(span, originalUnitText, term)) {
                            unitMatch = true;
                        }
                    });

                    if (term === '') {
                        card.style.display = 'flex';
                        card.classList.remove('search-match-glow');
                        card.classList.remove('active');
                        hasVisibleCards = true;
                    } else if (titleMatch || unitMatch) {
                        card.style.display = 'flex';
                        card.classList.add('search-match-glow');
                        // Expand card if unit matches to show the highlight
                        if (unitMatch) {
                            card.classList.add('active');
                        }
                        hasVisibleCards = true;
                    } else {
                        card.style.display = 'none';
                        card.classList.remove('search-match-glow');
                        card.classList.remove('active');
                    }
                });

                // No Results Message
                let noResultsMsg = activeTab.querySelector('.no-results-msg');
                if (!hasVisibleCards && cards.length > 0) {
                    if (!noResultsMsg) {
                        noResultsMsg = document.createElement('div');
                        noResultsMsg.className = 'no-results-msg';
                        noResultsMsg.style.textAlign = 'center';
                        noResultsMsg.style.padding = '40px';
                        noResultsMsg.style.color = 'var(--text-light)';
                        noResultsMsg.style.width = '100%';
                        noResultsMsg.innerHTML = `<i class="fas fa-search" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i><p style="font-size: 1.2rem; margin-bottom: 5px;">No results found</p><p style="font-size: 0.9rem;">Try adjusting your search terms.</p>`;
                        activeTab.appendChild(noResultsMsg);
                    }
                    noResultsMsg.style.display = 'block';
                } else if (noResultsMsg) {
                    noResultsMsg.style.display = 'none';
                }
            }
        };

        searchInput.addEventListener('input', () => {
            filterSubjects();
            if (clearSearchBtn) {
                clearSearchBtn.style.display = searchInput.value.trim() !== '' ? 'block' : 'none';
            }
        });

        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                filterSubjects();
                clearSearchBtn.style.display = 'none';
                searchInput.focus();
            });
        }

        // Re-filter on tab switch
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(filterSubjects, 50); // Small delay to allow tab switch
            });
        });
    }

    // --- Coming Soon Redirects ---
    // Redirects 2nd, 3rd, and 4th year note links to coming_soon.html
    const placeholderYears = ['year-2', 'year-3', 'year-4'];
    placeholderYears.forEach(year => {
        const container = document.getElementById(year);
        if (container) {
            const links = container.querySelectorAll('a');
            links.forEach(link => {
                if (link.getAttribute('href') && !link.getAttribute('href').startsWith('#')) {
                    link.href = 'coming_soon.html';
                    link.removeAttribute('download');
                    link.removeAttribute('target');
                }
            });
        }
    });

    // --- Profile UI Update (Login Simulation) ---
    window.updateProfileUI = () => {
        const userName = localStorage.getItem('userName');
        if (userName) {
            const firstLetter = userName.charAt(0).toUpperCase();
            
            // Update sidebar profile link
            const profileLinks = document.querySelectorAll('.profile-link');
            profileLinks.forEach(link => {
                link.innerHTML = `<div class="user-avatar">${firstLetter}</div> <span>${userName}</span>`;
                link.href = 'account.html'; 
            });

            // Update navbar login button
            const navLoginBtns = document.querySelectorAll('.nav-btn[href="login.html"]');
            navLoginBtns.forEach(btn => {
                btn.innerHTML = `<div class="user-avatar nav-avatar" style="background-color: rgba(255,255,255,0.2);">${firstLetter}</div> <span>${userName}</span>`;
                btn.href = 'account.html';
            });
            
            // Update specialized Search Navbar profile icon specifically
            const searchNavProfile = document.getElementById('search-nav-profile');
            if (searchNavProfile) {
                searchNavProfile.innerHTML = `<div class="user-avatar nav-avatar" style="margin:0; background-color: var(--blue-accent); color: white;">${firstLetter}</div>`;
            }
        }
    };
    window.updateProfileUI();

    // Intercept local static PDF links to open in viewer.html
    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        // Match specific local static viewing links (exclude download links)
        if (link && link.href && !link.hasAttribute('download')) {
            const href = link.getAttribute('href');
            if (href && href.toLowerCase().endsWith('.pdf') && !href.startsWith('http')) {
                e.preventDefault();
                const absoluteUrl = new URL(href, window.location.href).href;
                let title = 'Study Material';
                const card = link.closest('.subject-card');
                if (card) title = (card.querySelector('h3') ? card.querySelector('h3').textContent : '') + ' - ' + (link.closest('.unit-item') ? link.closest('.unit-item').querySelector('span').textContent : '');
                window.open(`viewer.html?file=${encodeURIComponent(absoluteUrl)}&title=${encodeURIComponent(title)}`, '_blank');
            }
        }
    });

    document.body.addEventListener('click', async (e) => {
        const saveBtn = e.target.closest('.save-pdf-btn[data-doc-id]');
        if (!saveBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const uid = localStorage.getItem('userUid');
        if (!uid) {
            window.showToast('Please log in to save PDFs.', 'warning');
            setTimeout(() => window.location.href = 'login.html', 1200);
            return;
        }

        const docId = saveBtn.dataset.docId;
        if (!docId) return;
        const materialSnapshot = buildMaterialFromCard(saveBtn);

        const wasSaved = saveBtn.classList.contains('saved');
        setCardSaveBtnState(saveBtn, !wasSaved);

        try {
            const ready = await ensureSaveApiReady();
            if (!ready) throw new Error('Save API not ready');
            const result = await window.toggleSaveMaterial(docId, uid);
            setCardSaveBtnState(saveBtn, result.isSaved);
            if (!savedDocIdsCache || savedDocIdsCacheUid !== uid) {
                savedDocIdsCache = new Set();
                savedDocIdsCacheUid = uid;
            }
            if (result.isSaved) {
                savedDocIdsCache.add(docId);
                if (materialSnapshot) upsertLocalSaved(uid, materialSnapshot);
            } else {
                savedDocIdsCache.delete(docId);
                removeLocalSaved(uid, docId);
            }
            window.showToast(result.isSaved ? 'PDF saved.' : 'PDF removed from saved.', 'success');
        } catch (error) {
            const localSaved = !wasSaved;
            setCardSaveBtnState(saveBtn, localSaved);
            if (!savedDocIdsCache || savedDocIdsCacheUid !== uid) {
                savedDocIdsCache = new Set();
                savedDocIdsCacheUid = uid;
            }
            if (localSaved) {
                savedDocIdsCache.add(docId);
                if (materialSnapshot) upsertLocalSaved(uid, materialSnapshot);
            } else {
                savedDocIdsCache.delete(docId);
                removeLocalSaved(uid, docId);
            }
            window.showToast(localSaved ? 'PDF saved locally.' : 'PDF removed from local saved.', 'success');
        }
    });

    // --- Viewer Page Specific Logic ---
    if (page === 'viewer.html') {
        const infoBtn = document.getElementById('v-info-btn');
        const closeInfoBtn = document.getElementById('v-close-info-btn');
        const infoPanel = document.getElementById('v-info-panel');
        const likeBtn = document.getElementById('v-like-btn');
        const saveBtn = document.getElementById('v-save-btn');
        const likeCount = document.getElementById('v-like-count');
        const shareBtn = document.getElementById('v-share-btn');
        const viewerOverlay = document.createElement('div');

        // Parse Dynamic URL Parameters to load specific PDF
        const urlParams = new URLSearchParams(window.location.search);
        const fileUrl = urlParams.get('file') || 'https://firebasestorage.googleapis.com/v0/b/studybook-15297.firebasestorage.app/o/uploads%2Fstudy-materials%2F1774148361381_Engineering_Physics_2024-25.pdf?alt=media&token=0db344ad-b233-4c61-9bad-c84a8fd95ae2';
        const fileTitle = urlParams.get('title');
        const fileDocId = urlParams.get('doc');
        let currentViewerMaterial = null;
        if (saveBtn && fileDocId) {
            saveBtn.dataset.docId = fileDocId;
        }
        
        if (fileTitle) {
            const docTitle = document.querySelector('.v-doc-title');
            if (docTitle) { docTitle.textContent = fileTitle; docTitle.title = fileTitle; }
            document.title = `${fileTitle} - Study Book`;
        }
        // --- PDF.js Integration Engine ---
        if (fileUrl && typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            let pdfDoc = null,
                scale = 1.5,
                container = document.getElementById('pdf-render-container');
                
            if (container) {
                const renderPage = (num, canvas) => {
                    pdfDoc.getPage(num).then((page) => {
                        
                        let renderScale = scale;
                        if (window.innerWidth < 768 && scale === 1.5) {
                            const viewport = page.getViewport({scale: 1});
                            renderScale = (window.innerWidth - 60) / viewport.width;
                        }
                        
                        const viewport = page.getViewport({scale: renderScale});
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        canvas.style.minHeight = 'auto'; // Remove placeholder height once rendered

                        const ctx = canvas.getContext('2d');
                        const renderContext = { canvasContext: ctx, viewport: viewport };
                        page.render(renderContext);
                    });
                };

                let currentObserver = null;
                const setupProgressiveRendering = () => {
                    container.innerHTML = ''; // Clear previous renders
                    if (currentObserver) {
                        currentObserver.disconnect();
                    }
                    
                    currentObserver = new IntersectionObserver((entries, obs) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const canvas = entry.target;
                                const pageNum = parseInt(canvas.dataset.pageNumber, 10);
                                if (!canvas.dataset.rendered) {
                                    renderPage(pageNum, canvas);
                                    canvas.dataset.rendered = 'true';
                                }
                                obs.unobserve(canvas); // Stop observing once rendered
                            }
                        });
                    }, {
                        root: container,
                        rootMargin: '200% 0px 200% 0px', // Render a bit ahead of scroll
                        threshold: 0
                    });

                    for (let i = 1; i <= pdfDoc.numPages; i++) {
                        const canvas = document.createElement('canvas');
                        canvas.id = `pdf-canvas-${i}`;
                        canvas.dataset.pageNumber = i;
                        canvas.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                        canvas.style.maxWidth = '100%';
                        canvas.style.backgroundColor = '#ffffff'; // White placeholder
                        canvas.style.minHeight = window.innerWidth < 768 ? '400px' : '800px'; // Prevent scroll-jumping
                        container.appendChild(canvas);
                        currentObserver.observe(canvas);
                    }
                };

                document.getElementById('zoom-in-btn').addEventListener('click', () => {
                    scale += 0.25; setupProgressiveRendering();
                });
                document.getElementById('zoom-out-btn').addEventListener('click', () => {
                    if (scale <= 0.5) return;
                    scale -= 0.25; setupProgressiveRendering();
                });

                const fullscreenBtn = document.getElementById('fullscreen-btn');
                if (fullscreenBtn) {
                    fullscreenBtn.addEventListener('click', () => {
                        const viewerContainer = document.getElementById('pdf-viewer-container');
                        if (!document.fullscreenElement) {
                            viewerContainer.requestFullscreen().catch(err => {
                                console.error(`Error attempting to enable fullscreen: ${err.message}`);
                            });
                        } else {
                            document.exitFullscreen();
                        }
                    });

                    document.addEventListener('fullscreenchange', () => {
                        if (document.fullscreenElement) {
                            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                            fullscreenBtn.title = 'Exit Full Screen';
                        } else {
                            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                            fullscreenBtn.title = 'Full Screen';
                        }
                    });
                }

                // Fetch and Render PDF
                pdfjsLib.getDocument(fileUrl).promise.then((pdfDoc_) => {
                    pdfDoc = pdfDoc_;
                    document.getElementById('page-num-text').textContent = `${pdfDoc.numPages} Pages`;
                    setupProgressiveRendering();
                }).catch(error => {
                    console.error("Error loading PDF:", error);
                    document.getElementById('page-num-text').textContent = "Error loading PDF";
                });
            }
        }
        
        // Fetch Real Document Metadata & Update Info Sidebar
        const loadDocumentMetadata = async () => {
            if (!window.getMaterialByUrl) {
                setTimeout(loadDocumentMetadata, 500);
                return;
            }
            
            const mat = await window.getMaterialByUrl(fileUrl);
            if (mat) {
                currentViewerMaterial = mat;
                // Update text fields
                document.getElementById('v-doc-desc').textContent = mat.description || 'No description provided.';
                document.getElementById('v-doc-uni').textContent = mat.college || mat.university || 'N/A';
                document.getElementById('v-doc-course').textContent = mat.course || 'N/A';
                document.getElementById('v-doc-subject').textContent = mat.subject || 'N/A';
                
                // Update top bar meta tag
                const docMeta = document.querySelector('.v-doc-meta');
                if (docMeta) {
                    const metaParts = [];
                    if (mat.course) metaParts.push(mat.course);
                    if (mat.branch) metaParts.push(mat.branch);
                    
                    if (metaParts.length > 0) {
                        docMeta.textContent = metaParts.join(' • ');
                    } else {
                        docMeta.textContent = mat.type || 'Study Material';
                    }
                }
                
                const date = new Date(mat.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                document.getElementById('v-uploader-date').textContent = `Uploaded on ${date}`;
                
                // Handle Like State
                const uid = localStorage.getItem('userUid');
                const likedBy = mat.likedBy || [];
                const savedBy = mat.savedBy || [];
                if (likeBtn) {
                    likeBtn.dataset.docId = mat.id; // Store ID for click events
                    const isLiked = uid && likedBy.includes(uid);
                    likeBtn.classList.toggle('liked', isLiked);
                    likeBtn.innerHTML = `<i class="fa${isLiked ? 's' : 'r'} fa-heart"></i> <span id="v-like-count">${likedBy.length}</span>`;
                }
                    if (saveBtn) {
                        saveBtn.dataset.docId = mat.id;
                    const isSaved = uid && savedBy.includes(uid);
                    saveBtn.classList.toggle('saved', isSaved);
                    saveBtn.innerHTML = `<i class="fa${isSaved ? 's' : 'r'} fa-bookmark"></i> <span class="desktop-only">${isSaved ? 'Saved' : 'Save'}</span>`;
                    if (uid) {
                        if (!savedDocIdsCache) savedDocIdsCache = new Set();
                        if (isSaved) savedDocIdsCache.add(mat.id);
                    }
                }
                saveContinueReadingItem({
                    id: mat.id || fileDocId || fileUrl,
                    fileUrl: fileUrl,
                    title: mat.title || fileTitle || 'Study Material',
                    subject: mat.subject || 'General Subject',
                    type: mat.type || 'Notes',
                    createdAt: mat.createdAt || new Date().toISOString()
                });
                
                // Fetch Uploader User Profile
                if (mat.uploaderUid && window.getUserProfile) {
                    const uploaderProfile = await window.getUserProfile(mat.uploaderUid);
                    const uploaderName = (uploaderProfile && uploaderProfile.name) || 'Anonymous User';
                    document.getElementById('v-uploader-name').textContent = uploaderName;
                    document.getElementById('v-uploader-avatar').textContent = uploaderName.charAt(0).toUpperCase();
                    
                    const uploaderCourseUniv = document.getElementById('v-uploader-course-univ');
                    if (uploaderCourseUniv && uploaderProfile) {
                        const parts = [];
                        if (uploaderProfile.course) parts.push(uploaderProfile.course);
                        if (uploaderProfile.college) parts.push(uploaderProfile.college);
                        uploaderCourseUniv.textContent = parts.join(' • ');
                    }

                    // Fallback to update document course/university from uploader profile if missing
                    if (!mat.college && !mat.university && uploaderProfile && uploaderProfile.college) {
                        document.getElementById('v-doc-uni').textContent = uploaderProfile.college;
                    }
                    if (!mat.course && uploaderProfile && uploaderProfile.course) {
                        document.getElementById('v-doc-course').textContent = uploaderProfile.course;
                    }
                }
            } else {
                currentViewerMaterial = {
                    id: fileDocId || fileUrl,
                    fileUrl: fileUrl,
                    title: fileTitle || 'Study Material',
                    subject: 'General Subject',
                    type: 'Notes',
                    description: 'Locally hosted or static system file.',
                    createdAt: new Date().toISOString()
                };
                if (saveBtn && !saveBtn.dataset.docId && currentViewerMaterial.id) {
                    saveBtn.dataset.docId = currentViewerMaterial.id;
                }
                saveContinueReadingItem(currentViewerMaterial);
                // Fallback for static PDFs not in Firestore Database
                document.getElementById('v-doc-desc').textContent = 'Locally hosted or static system file.';
                document.getElementById('v-doc-uni').textContent = 'Not Specified';
                document.getElementById('v-doc-course').textContent = 'Not Specified';
                document.getElementById('v-doc-subject').textContent = 'General Subject';
                document.getElementById('v-uploader-date').textContent = 'System Default';
                document.getElementById('v-uploader-name').textContent = 'System Admin';
                document.getElementById('v-uploader-avatar').textContent = 'S';
                document.getElementById('v-uploader-course-univ').textContent = 'Study Book Official';
            }
        };
        loadDocumentMetadata();

        viewerOverlay.className = 'sidebar-overlay'; 
        document.body.appendChild(viewerOverlay);

        // Panel Toggles
        const togglePanel = () => {
            infoPanel.classList.toggle('active');
            if (window.innerWidth <= 768) {
                viewerOverlay.classList.toggle('active');
            }
        };
        if (infoBtn) infoBtn.addEventListener('click', togglePanel);
        if (closeInfoBtn) closeInfoBtn.addEventListener('click', togglePanel);
        viewerOverlay.addEventListener('click', togglePanel);

        // Real Like Functionality
        if (likeBtn) {
            likeBtn.addEventListener('click', async () => {
                const docId = likeBtn.dataset.docId;
                const uid = localStorage.getItem('userUid');
                
                if (!uid) {
                    window.showToast('Please log in to like notes.', 'warning');
                    return;
                }
                if (!docId) return; // Document not loaded yet

                // Optimistic UI update
                const isLiked = likeBtn.classList.toggle('liked');
                const currentCount = parseInt(document.getElementById('v-like-count').textContent) || 0;
                likeBtn.innerHTML = `<i class="fa${isLiked ? 's' : 'r'} fa-heart"></i> <span id="v-like-count">${isLiked ? currentCount + 1 : currentCount - 1}</span>`;
                
                try {
                    if (window.toggleLikeMaterial) {
                        const result = await window.toggleLikeMaterial(docId, uid);
                        likeBtn.innerHTML = `<i class="fa${result.isLiked ? 's' : 'r'} fa-heart"></i> <span id="v-like-count">${result.count}</span>`;
                    }
                } catch (error) {
                    likeBtn.classList.toggle('liked', !isLiked);
                    likeBtn.innerHTML = `<i class="fa${!isLiked ? 's' : 'r'} fa-heart"></i> <span id="v-like-count">${currentCount}</span>`;
                    window.showToast('Failed to update like status.', 'error');
                }
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const docId = saveBtn.dataset.docId;
                const uid = localStorage.getItem('userUid');

                if (!uid) {
                    window.showToast('Please log in to save PDFs.', 'warning');
                    return;
                }
                if (!docId) return;

                const isSaved = saveBtn.classList.toggle('saved');
                saveBtn.innerHTML = `<i class="fa${isSaved ? 's' : 'r'} fa-bookmark"></i> <span class="desktop-only">${isSaved ? 'Saved' : 'Save'}</span>`;

                try {
                    const ready = await ensureSaveApiReady();
                    if (!ready) throw new Error('Save API not ready');
                    const result = await window.toggleSaveMaterial(docId, uid);
                    saveBtn.classList.toggle('saved', result.isSaved);
                    saveBtn.innerHTML = `<i class="fa${result.isSaved ? 's' : 'r'} fa-bookmark"></i> <span class="desktop-only">${result.isSaved ? 'Saved' : 'Save'}</span>`;
                    if (!savedDocIdsCache || savedDocIdsCacheUid !== uid) {
                        savedDocIdsCache = new Set();
                        savedDocIdsCacheUid = uid;
                    }
                    if (result.isSaved) {
                        savedDocIdsCache.add(docId);
                        upsertLocalSaved(uid, currentViewerMaterial || { id: docId, fileUrl, title: fileTitle || 'Study Material' });
                    } else {
                        savedDocIdsCache.delete(docId);
                        removeLocalSaved(uid, docId);
                    }
                    window.showToast(result.isSaved ? 'PDF saved.' : 'PDF removed from saved.', 'success');
                } catch (error) {
                    const localSaved = isSaved;
                    saveBtn.classList.toggle('saved', localSaved);
                    saveBtn.innerHTML = `<i class="fa${localSaved ? 's' : 'r'} fa-bookmark"></i> <span class="desktop-only">${localSaved ? 'Saved' : 'Save'}</span>`;
                    if (!savedDocIdsCache || savedDocIdsCacheUid !== uid) {
                        savedDocIdsCache = new Set();
                        savedDocIdsCacheUid = uid;
                    }
                    if (localSaved) {
                        savedDocIdsCache.add(docId);
                        upsertLocalSaved(uid, currentViewerMaterial || { id: docId, fileUrl, title: fileTitle || 'Study Material' });
                    } else {
                        savedDocIdsCache.delete(docId);
                        removeLocalSaved(uid, docId);
                    }
                    window.showToast(localSaved ? 'PDF saved locally.' : 'PDF removed from local saved.', 'success');
                }
            });
        }

        // Share Functionality (Native Share on Mobile, Clipboard Fallback)
        if (shareBtn) {
            shareBtn.addEventListener('click', async () => {
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: document.title,
                            url: window.location.href
                        });
                    } catch (error) {
                        console.log('Error sharing:', error);
                    }
                } else {
                    navigator.clipboard.writeText(window.location.href).then(() => {
                        window.showToast('Document link copied to clipboard!', 'success');
                    }).catch(() => {
                        window.showToast('Failed to copy link.', 'error');
                    });
                }
            });
        }
    }

    // --- Upload Notes Modal Injection & Logic ---
    const uploadModalHTML = `
        <div class="modal-overlay" id="upload-modal-overlay">
            <div class="upload-modal">
                <div class="modal-header">
                    <h2>Upload Study Material</h2>
                    <button type="button" class="close-modal-btn" id="close-upload-modal"><i class="fas fa-times"></i></button>
                </div>
                <form id="upload-material-form" class="upload-form">
                    <div class="form-group">
                        <label class="form-label">Title <span class="required">*</span></label>
                        <input type="text" class="form-input" id="upload-title" placeholder="e.g., Data Structures Chapter 1 Notes" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Subject / Course Name <span class="required">*</span></label>
                        <input type="text" class="form-input" id="upload-subject" placeholder="e.g., Data Structures (CS-301)" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Resource Type <span class="required">*</span></label>
                        <select class="form-input" id="upload-type" required>
                            <option value="" disabled selected>Select resource type</option>
                            <option value="Class Notes">Class Notes</option>
                            <option value="Exam Preparation Notes">Exam Preparation Notes</option>
                            <option value="Previous Year Questions (PYQs)">Previous Year Questions (PYQs)</option>
                            <option value="Tutorial Sheets / Assignments">Tutorial Sheets / Assignments</option>
                            <option value="Important Questions">Important Questions</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description <span style="color:var(--text-light);font-size:0.85rem;font-weight:normal;">(Optional)</span></label>
                        <textarea class="form-textarea" id="upload-desc" placeholder="Add any extra details about the file..." style="min-height: 80px;"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">File Upload (PDF only, Max 10MB) <span class="required">*</span></label>
                        <div class="file-upload-area" id="file-drop-area">
                            <input type="file" id="upload-file" accept=".pdf" hidden>
                            <div class="file-upload-label" id="file-upload-label">
                                <i class="fas fa-cloud-upload-alt file-upload-icon"></i>
                                <span class="file-upload-text">Click to browse or drag & drop</span>
                                <span class="file-upload-hint">Only .pdf files are supported</span>
                            </div>
                            <div class="selected-file-info" id="selected-file-info" style="display: none;">
                                <div class="selected-file-left">
                                    <i class="fas fa-file-pdf"></i>
                                    <span id="selected-file-name">filename.pdf</span>
                                </div>
                                <button type="button" id="remove-file-btn"><i class="fas fa-times"></i></button>
                            </div>
                        </div>
                        <div id="file-warning-msg" class="file-msg warning-msg" style="display: none;">⚠️ Large file detected. For better performance, please upload a compressed PDF if possible.</div>
                        <div id="file-error-msg" class="file-msg error-msg" style="display: none;">❌ File exceeds the 10MB limit. Please upload a smaller file.</div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-outline" id="cancel-upload-btn">Cancel</button>
                        <button type="submit" class="btn btn-purple" id="submit-upload-btn">Upload Material</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uploadModalHTML);

    const uploadModal = document.getElementById('upload-modal-overlay');
    const uploadForm = document.getElementById('upload-material-form');
    const fileDropArea = document.getElementById('file-drop-area');
    const fileInput = document.getElementById('upload-file');
    const fileLabel = document.getElementById('file-upload-label');
    const fileInfo = document.getElementById('selected-file-info');
    const fileNameDisplay = document.getElementById('selected-file-name');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const fileWarning = document.getElementById('file-warning-msg');
    const fileError = document.getElementById('file-error-msg');
    const submitBtn = document.getElementById('submit-upload-btn');

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const WARNING_FILE_SIZE = 7 * 1024 * 1024; // 7MB

    // Intercept Google Form Links
    // Use event delegation so dynamically injected buttons (like empty states) work too
    document.body.addEventListener('click', async (e) => {
        const link = e.target.closest('a[href*="forms.gle"]');
        if (link) {
            e.preventDefault();
            
            // 1. Check if user is logged in
            const uid = localStorage.getItem('userUid');
            if (!uid) {
                window.showToast('Please log in to upload study materials.', 'warning');
                setTimeout(() => window.location.href = 'login.html', 1500);
                return;
            }

            // 2. Check if the user's profile is complete
            if (window.getUserProfile) {
                document.body.style.cursor = 'wait'; // Show loading state
                const profile = await window.getUserProfile(uid);
                document.body.style.cursor = 'default';
                
                if (!profile || !profile.college || !profile.course || !profile.branch) {
                    window.showToast('Please complete your profile (College, Course, and Branch) in the Account page before uploading materials.', 'warning');
                    setTimeout(() => window.location.href = 'account.html', 1500);
                    return;
                }
            }

            uploadModal.classList.add('active');
            if (window.innerWidth <= 768) closeSidebar();
        }
    });

    const resetFileUploadUI = () => {
        fileInput.value = '';
        fileLabel.style.display = 'flex';
        fileInfo.style.display = 'none';
        fileWarning.style.display = 'none';
        fileError.style.display = 'none';
        submitBtn.disabled = false;
        fileDropArea.classList.remove('has-error');
    };

    const closeUploadModal = () => {
        uploadModal.classList.remove('active');
        setTimeout(() => {
            uploadForm.reset();
            resetFileUploadUI();
        }, 300);
    };

    document.getElementById('close-upload-modal').addEventListener('click', closeUploadModal);
    document.getElementById('cancel-upload-btn').addEventListener('click', closeUploadModal);
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) closeUploadModal();
    });

    const handleFile = (file) => {
        if (!file) return resetFileUploadUI();

        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            fileError.innerHTML = '❌ Only PDF files are supported.';
            fileError.style.display = 'flex';
            fileWarning.style.display = 'none';
            submitBtn.disabled = true;
            fileDropArea.classList.add('has-error');
            return;
        }

        fileNameDisplay.textContent = file.name;
        fileLabel.style.display = 'none';
        fileInfo.style.display = 'flex';
        fileDropArea.classList.remove('has-error');

        if (file.size > MAX_FILE_SIZE) {
            fileError.innerHTML = '❌ File exceeds the 10MB limit. Please upload a smaller file.';
            fileError.style.display = 'flex';
            fileWarning.style.display = 'none';
            submitBtn.disabled = true;
            fileDropArea.classList.add('has-error');
        } else if (file.size > WARNING_FILE_SIZE) {
            fileWarning.style.display = 'flex';
            fileError.style.display = 'none';
            submitBtn.disabled = false;
        } else {
            fileWarning.style.display = 'none';
            fileError.style.display = 'none';
            submitBtn.disabled = false;
        }
    };

    fileDropArea.addEventListener('click', (e) => {
        if (e.target !== removeFileBtn && e.target !== removeFileBtn.querySelector('i')) fileInput.click();
    });

    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetFileUploadUI();
    });

    // Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, () => fileDropArea.classList.add('dragover'), false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, () => fileDropArea.classList.remove('dragover'), false);
    });
    fileDropArea.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // --- Search Page Logic (Modern UI Update) ---
    if (page === 'search.html') {
        const topSearchForm = document.getElementById('top-search-form');
        const topSearchInput = document.getElementById('top-search-input');
        const advancedToggle = document.getElementById('advanced-filter-toggle');
        const advancedPanel = document.getElementById('advanced-filters-panel');
        const resultsGrid = document.getElementById('search-results-grid');
        const resultsInfo = document.getElementById('search-results-info');
        const activeFiltersContainer = document.getElementById('active-filters-container');

        let allMaterials = [];
        let currentSearchTerm = '';

        const params = new URLSearchParams(window.location.search);
        currentSearchTerm = params.get('q') || '';
        if (topSearchInput) topSearchInput.value = currentSearchTerm;

        // Generate High-Quality Dummy JSON Data (as requested) to combine with Firebase
        const dummyData = [
            { id: 'd1', title: 'Data Structures and Algorithms Complete Notes', subject: 'Computer Science', type: 'Notes', course: 'B.Tech', createdAt: new Date().toISOString(), university: 'AKTU', rating: 4.8, pages: 124, fileUrl: '#', views: 15420, year: '2', isPaid: false },
            { id: 'd2', title: 'Engineering Mathematics IV - PYQ 2023', subject: 'Mathematics', type: 'PYQ', course: 'B.Tech', createdAt: new Date(Date.now() - 86400000).toISOString(), university: 'DU', rating: 4.5, pages: 12, fileUrl: '#', views: 5320, year: '2', isPaid: false },
            { id: 'd3', title: 'Operating Systems System Concepts', subject: 'Computer Science', type: 'Books', course: 'BCA', createdAt: new Date(Date.now() - 500000000).toISOString(), university: 'GLA University', rating: 4.9, pages: 940, fileUrl: '#', views: 89000, year: '3', isPaid: false },
            { id: 'd4', title: 'Physics Formula Cheat Sheet', subject: 'Physics', type: 'Short Notes', course: 'B.Sc', createdAt: new Date(Date.now() - 200000).toISOString(), university: 'AKTU', rating: 4.2, pages: 3, fileUrl: '#', views: 1200, year: '1', isPaid: false },
            { id: 'd5', title: 'Introduction to AI Premium Course', subject: 'Artificial Intelligence', type: 'Courses', course: 'B.Tech', createdAt: new Date(Date.now() - 9000000).toISOString(), university: 'AKTU', rating: 5.0, pages: 55, fileUrl: '#', views: 24500, year: '4', isPaid: true },
            { id: 'd6', title: 'DBMS Semester Important Questions', subject: 'Database', type: 'Notes', course: 'MCA', createdAt: new Date(Date.now() - 1500000).toISOString(), university: 'DU', rating: 4.6, pages: 20, fileUrl: '#', views: 4200, year: '3', isPaid: false }
        ];

        const renderSkeletons = () => {
            resultsGrid.innerHTML = '';
            for (let i = 0; i < 8; i++) {
                resultsGrid.insertAdjacentHTML('beforeend', `
                    <div class="document-card" style="min-height: 250px;">
                        <div class="doc-preview-container skeleton-img" style="height: 180px; box-shadow: none;"></div>
                        <div class="doc-info" style="padding-top: 20px;">
                            <div class="skeleton-text medium" style="margin: 0 0 10px 0;"></div>
                            <div class="skeleton-text short" style="margin: 0;"></div>
                        </div>
                    </div>
                `);
            }
        };

        const renderCards = (filtered) => {
            if (filtered.length === 0) {
                resultsGrid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1; border: none; background: transparent;">
                        <i class="fas fa-search" style="font-size: 4rem; color: var(--border-color); margin-bottom: 20px;"></i>
                        <h3 style="font-size: 1.4rem; color: var(--text-dark); margin-bottom: 10px;">No Results Found</h3>
                        <p style="font-size: 1rem; color: var(--text-light); max-width: 400px; margin: 0 auto 20px auto;">Try adjusting your search terms, changing the filters, or removing the advanced options.</p>
                    </div>
                `;
                resultsInfo.textContent = `Found 0 results for "${currentSearchTerm}"`;
                return;
            }

            resultsGrid.innerHTML = '';
            resultsInfo.textContent = `Showing ${filtered.length} result${filtered.length > 1 ? 's' : ''}`;
            
            filtered.forEach((mat, index) => {
                const diffDays = Math.floor(Math.abs(new Date() - new Date(mat.createdAt)) / (1000 * 60 * 60 * 24));
                const timeAgo = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
                
                let iconColor = (mat.type && mat.type.includes('PYQ')) ? 'color: var(--purple-accent);' : '';
                const cardHTML = `
                    <a href="viewer.html?file=${encodeURIComponent(mat.fileUrl)}&title=${encodeURIComponent(mat.title || 'Study Material')}&doc=${encodeURIComponent(mat.id)}" target="_blank" class="document-card" data-pdf-url="${mat.fileUrl}">
                        <div class="doc-preview-container">
                            <canvas class="pdf-preview-canvas" style="display: none;"></canvas>
                            <div class="preview-loader"><i class="fas fa-file-pdf"></i><span>Preparing preview...</span></div>
                        </div>
                        <div class="doc-info">
                            <h3 class="doc-title">${mat.title}</h3>
                            <span class="doc-subtitle">${mat.subject || 'General Subject'} • ${mat.type || 'Notes'} • ${timeAgo}</span>
                            <div class="doc-actions">
                                <button type="button" class="save-pdf-btn" data-doc-id="${mat.id}" title="Save PDF"><i class="far fa-bookmark"></i></button>
                            </div>
                        </div>
                    </a>
                `;
                resultsGrid.insertAdjacentHTML('beforeend', cardHTML);
            });

            resultsGrid.querySelectorAll('.document-card[data-pdf-url]').forEach(card => {
                if (!card.dataset.previewRendered) {
                    const canvas = card.querySelector('.pdf-preview-canvas');
                    const url = card.dataset.pdfUrl;
                    renderPdfPreview(canvas, url);
                    card.dataset.previewRendered = 'true';
                }
            });
            syncSaveButtons(resultsGrid);
        };

        const applyFilters = () => {
            const qLower = currentSearchTerm.toLowerCase();
            
            const categoryFilter = document.getElementById('filter-category')?.value || '';
            const courseFilter = document.getElementById('filter-course')?.value || '';
            const univFilter = document.getElementById('filter-univ')?.value || '';
            const yearFilter = document.getElementById('filter-year')?.value || '';

            let filtered = allMaterials.filter(mat => {
                const matchQuery = !qLower || 
                    (mat.title && mat.title.toLowerCase().includes(qLower)) || 
                    (mat.subject && mat.subject.toLowerCase().includes(qLower));
                
                const matchCategory = !categoryFilter || (mat.type && mat.type.includes(categoryFilter));
                
                const matchCourse = !courseFilter || (mat.course && mat.course === courseFilter);
                const matchUniv = !univFilter || (mat.university && mat.university.includes(univFilter)) || (mat.college && mat.college.includes(univFilter));
                const matchYear = !yearFilter || (mat.year && String(mat.year) === String(yearFilter));
                
                return matchQuery && matchCategory && matchCourse && matchUniv && matchYear;
            });

            renderCards(filtered);
            renderActiveFilters();
        };

        const renderActiveFilters = () => {
            activeFiltersContainer.innerHTML = '';
            ['filter-category', 'filter-course', 'filter-univ', 'filter-year'].forEach(id => {
                const el = document.getElementById(id);
                if (el && el.value) {
                    const pillHTML = `
                        <div class="active-filter-pill">
                            ${el.options[el.selectedIndex].text}
                            <button type="button" data-target="${id}"><i class="fas fa-times"></i></button>
                        </div>
                    `;
                    activeFiltersContainer.insertAdjacentHTML('beforeend', pillHTML);
                }
            });

            // Add listeners to cross icons to clear filter and re-run
            activeFiltersContainer.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetId = e.currentTarget.getAttribute('data-target');
                    const el = document.getElementById(targetId);
                    if (el) el.value = '';
                    applyFilters();
                });
            });
        };

        const performSearch = async () => {
            renderSkeletons();

            // Wait for Firebase to initialize
            if (!window.searchMaterialsFirestore) {
                setTimeout(performSearch, 500);
                return;
            }

            try {

                const fbMaterials = await window.searchMaterialsFirestore();
                // Combine Real Database results with Dummy Database results to ensure a rich UI test
                allMaterials = [...dummyData, ...fbMaterials];
                applyFilters();
            } catch (error) {
                console.error("Search failed:", error);
                resultsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #ef4444;">Search failed. Please try again.</div>';
            }
        };
        
        // Init
        performSearch();
        
        // Top Search Bar Listeners
        topSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            currentSearchTerm = topSearchInput.value.trim();
            applyFilters();
        });

        // Advanced Filters Toggle
        if (advancedToggle) {
            advancedToggle.addEventListener('click', () => {
                const isVisible = advancedPanel.style.display === 'flex';
                advancedPanel.style.display = isVisible ? 'none' : 'flex';
                advancedToggle.style.backgroundColor = isVisible ? 'transparent' : 'var(--hover-bg)';
            });
        }
        
        // Advanced Filters change listeners
        ['filter-category', 'filter-course', 'filter-univ', 'filter-year'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', applyFilters);
        });
    }

    // Setup Dummy Mock Data for Related Notes on Viewer page
    if (page === 'viewer.html') {
        const relatedGrid = document.getElementById('related-notes-grid');
        if (relatedGrid) {
            const loadRelatedNotes = async () => {
                relatedGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-light);"><i class="fas fa-spinner fa-spin"></i> Loading related notes...</div>';
                
                if (!window.getRecentMaterials) {
                    setTimeout(loadRelatedNotes, 500);
                    return;
                }
                
                try {
                    const materials = await window.getRecentMaterials(8);
                    const urlParams = new URLSearchParams(window.location.search);
                    const currentFileUrl = urlParams.get('file');

                    const filtered = materials.filter(mat => mat.fileUrl !== currentFileUrl).slice(0, 4);

                    if (filtered.length === 0) {
                        relatedGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-light);">No related notes found.</div>';
                        return;
                    }

                    relatedGrid.innerHTML = '';
                    filtered.forEach((mat) => {
                        const diffDays = Math.floor(Math.abs(new Date() - new Date(mat.createdAt)) / (1000 * 60 * 60 * 24));
                        const timeAgo = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;

                        let iconColor = (mat.type && mat.type.includes('PYQ')) ? 'color: var(--purple-accent);' : '';
                        const cardHTML = `
                            <a href="viewer.html?file=${encodeURIComponent(mat.fileUrl)}&title=${encodeURIComponent(mat.title || 'Study Material')}&doc=${encodeURIComponent(mat.id)}" class="document-card" data-pdf-url="${mat.fileUrl}">
                                <div class="doc-preview-container">
                                    <canvas class="pdf-preview-canvas" style="display: none;"></canvas>
                                    <div class="preview-loader"><i class="fas fa-file-pdf"></i><span>Preparing preview...</span></div>
                                </div>
                                <div class="doc-info">
                                    <h3 class="doc-title">${mat.title}</h3>
                                    <span class="doc-subtitle">${mat.subject || 'General Subject'} • ${timeAgo}</span>
                                    <div class="doc-actions">
                                        <button type="button" class="save-pdf-btn" data-doc-id="${mat.id}" title="Save PDF"><i class="far fa-bookmark"></i></button>
                                    </div>
                                </div>
                            </a>
                        `;
                        relatedGrid.insertAdjacentHTML('beforeend', cardHTML);
                    });

                    relatedGrid.querySelectorAll('.document-card[data-pdf-url]').forEach(card => {
                        if (!card.dataset.previewRendered) {
                            const canvas = card.querySelector('.pdf-preview-canvas');
                            const url = card.dataset.pdfUrl;
                            renderPdfPreview(canvas, url);
                            card.dataset.previewRendered = 'true';
                        }
                    });
                    syncSaveButtons(relatedGrid);
                } catch (error) {
                    console.error("Failed to load related notes:", error);
                    relatedGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #ef4444;">Failed to load related notes.</div>';
                }
            };
            loadRelatedNotes();
        }
    }

    // --- Fetch and Render Recent Materials (index.html) ---
    const loadRecentMaterials = async () => {
        const notesGrid = document.getElementById('uploaded-notes-grid');
        const pyqsGrid = document.getElementById('uploaded-pyqs-grid');
        const continueReadingGrid = document.getElementById('continue-reading-grid');
        const recentlyUploadedGrid = document.getElementById('recently-uploaded-grid');
        
        if (!notesGrid && !pyqsGrid && !continueReadingGrid && !recentlyUploadedGrid) return; // Only execute if grids exist on current page

        const renderGridSkeletons = (grid) => {
            if (grid && grid.children.length === 0) {
                let skeletons = '';
                for (let i = 0; i < 4; i++) {
                    skeletons += `
                        <div class="document-card" style="min-height: 250px; cursor: default;">
                            <div class="doc-preview-container skeleton-img" style="height: 180px; box-shadow: none;"></div>
                            <div class="doc-info" style="padding-top: 20px;">
                                <div class="skeleton-text medium" style="margin: 0 0 10px 0;"></div>
                                <div class="skeleton-text short" style="margin: 0;"></div>
                            </div>
                        </div>
                    `;
                }
                grid.innerHTML = skeletons;
            }
        };

        renderGridSkeletons(notesGrid);
        renderGridSkeletons(pyqsGrid);
        renderGridSkeletons(continueReadingGrid);
        renderGridSkeletons(recentlyUploadedGrid);

        // If Firebase hasn't loaded yet, retry in 500ms
        if (!window.getRecentMaterials) {
            setTimeout(loadRecentMaterials, 500);
            return;
        }

        try {
            // Fetch up to 20 materials to ensure we have enough to split between the two sections
            const materials = await window.getRecentMaterials(20);
            
            // Split by type (Max 8 in each grid)
            const notes = materials.filter(mat => !mat.type || !mat.type.includes('PYQ')).slice(0, 8);
            const pyqs = materials.filter(mat => mat.type && mat.type.includes('PYQ')).slice(0, 8);
            const recentlyUploaded = materials.slice(0, 8);
            const continueReading = getContinueReadingList().slice(0, 8);

            if (continueReadingGrid) {
                if (continueReading.length === 0) {
                    continueReadingGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-light); font-weight: 500;">No recently opened PDFs yet. Open a PDF to continue reading from here.</p>';
                } else {
                    continueReadingGrid.innerHTML = '';
                    continueReading.forEach(mat => {
                        continueReadingGrid.insertAdjacentHTML('beforeend', buildMaterialCardHTML(mat));
                    });
                    hydrateMaterialCards(continueReadingGrid);
                }
            }

            if (recentlyUploadedGrid) {
                if (recentlyUploaded.length === 0) {
                    recentlyUploadedGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-light); font-weight: 500;">No uploads yet. Be the first to share!</p>';
                } else {
                    recentlyUploadedGrid.innerHTML = '';
                    recentlyUploaded.forEach(mat => {
                        recentlyUploadedGrid.insertAdjacentHTML('beforeend', buildMaterialCardHTML(mat));
                    });
                    hydrateMaterialCards(recentlyUploadedGrid);
                }
            }

            if (notesGrid) {
                if (notes.length === 0) {
                    notesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-light); font-weight: 500;">No notes uploaded yet. Be the first to share!</p>';
                } else {
                    notesGrid.innerHTML = ''; // Clear placeholders
                    notes.forEach(mat => {
                        const diffDays = Math.floor(Math.abs(new Date() - new Date(mat.createdAt)) / (1000 * 60 * 60 * 24));
                        const timeAgo = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;

                        let iconColor = '';
                        if (mat.type && mat.type.includes('Exam')) iconColor = 'color: var(--blue-accent);';

                        const cardHTML = `
                            <a href="viewer.html?file=${encodeURIComponent(mat.fileUrl)}&title=${encodeURIComponent(mat.title || 'Study Material')}&doc=${encodeURIComponent(mat.id)}" target="_blank" class="document-card" data-pdf-url="${mat.fileUrl}">
                                <div class="doc-preview-container">
                                    <canvas class="pdf-preview-canvas" style="display: none;"></canvas>
                                    <div class="preview-loader"><i class="fas fa-file-pdf"></i><span>Preparing preview...</span></div>
                                </div>
                                <div class="doc-info">
                                    <h3 class="doc-title">${mat.title}</h3>
                                    <span class="doc-subtitle">${mat.subject} • ${timeAgo}</span>
                                    <div class="doc-actions">
                                        <button type="button" class="save-pdf-btn" data-doc-id="${mat.id}" title="Save PDF"><i class="far fa-bookmark"></i></button>
                                    </div>
                                </div>
                            </a>
                        `;
                        notesGrid.insertAdjacentHTML('beforeend', cardHTML);
                    });

                    notesGrid.querySelectorAll('.document-card[data-pdf-url]').forEach(card => {
                        if (!card.dataset.previewRendered) {
                            const canvas = card.querySelector('.pdf-preview-canvas');
                            const url = card.dataset.pdfUrl;
                            renderPdfPreview(canvas, url);
                            card.dataset.previewRendered = 'true';
                        }
                    });
                    syncSaveButtons(notesGrid);
                }
            }

            if (pyqsGrid) {
                if (pyqs.length === 0) {
                    pyqsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-light); font-weight: 500;">No PYQs uploaded yet. Be the first to share!</p>';
                } else {
                    pyqsGrid.innerHTML = ''; // Clear placeholders
                    pyqs.forEach(mat => {
                        const diffDays = Math.floor(Math.abs(new Date() - new Date(mat.createdAt)) / (1000 * 60 * 60 * 24));
                        const timeAgo = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;

                        let iconColor = 'color: var(--purple-accent);';

                        const cardHTML = `
                            <a href="viewer.html?file=${encodeURIComponent(mat.fileUrl)}&title=${encodeURIComponent(mat.title || 'Study Material')}&doc=${encodeURIComponent(mat.id)}" target="_blank" class="document-card" data-pdf-url="${mat.fileUrl}">
                                <div class="doc-preview-container">
                                    <canvas class="pdf-preview-canvas" style="display: none;"></canvas>
                                    <div class="preview-loader"><i class="fas fa-file-pdf"></i><span>Preparing preview...</span></div>
                                </div>
                                <div class="doc-info">
                                    <h3 class="doc-title">${mat.title}</h3>
                                    <span class="doc-subtitle">${mat.subject} • ${timeAgo}</span>
                                    <div class="doc-actions">
                                        <button type="button" class="save-pdf-btn" data-doc-id="${mat.id}" title="Save PDF"><i class="far fa-bookmark"></i></button>
                                    </div>
                                </div>
                            </a>
                        `;
                        pyqsGrid.insertAdjacentHTML('beforeend', cardHTML);
                    });

                    pyqsGrid.querySelectorAll('.document-card[data-pdf-url]').forEach(card => {
                        if (!card.dataset.previewRendered) {
                            const canvas = card.querySelector('.pdf-preview-canvas');
                            const url = card.dataset.pdfUrl;
                            renderPdfPreview(canvas, url);
                            card.dataset.previewRendered = 'true';
                        }
                    });
                    syncSaveButtons(pyqsGrid);
                }
            }
        } catch (error) {
            console.error("Failed to load materials:", error);
        }
    };

    loadRecentMaterials();

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        submitBtn.disabled = true;

        const file = fileInput.files[0];
        
        if (!file) {
            window.showToast('Please select a PDF file to upload.', 'warning');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        // Check for duplicate uploads before sending to Firebase Storage
        if (window.checkDuplicateMaterial) {
            const isDuplicate = await window.checkDuplicateMaterial(file.name);
            if (isDuplicate) {
                window.showToast('A material with this file name has already been uploaded. Please rename the file or upload a different one.', 'warning');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }
        }

        try {
            if (window.uploadFileToFirebase) {
                // Create a clean filename and standard upload path
                const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const path = `uploads/study-materials/${Date.now()}_${safeName}`;
                
                const downloadURL = await window.uploadFileToFirebase(file, path);
                console.log("File uploaded to Firebase. URL:", downloadURL);

                // Save Metadata to Firestore
                if (window.saveMaterialToFirestore) {
                    // Fetch user profile to attach their current course and college to document seamlessly
                    const uid = localStorage.getItem('userUid');
                    let userCourse = '', userCollege = '', userBranch = '';
                    if (uid && window.getUserProfile) {
                        const profile = await window.getUserProfile(uid);
                        if (profile) {
                            userCourse = profile.course || '';
                            userCollege = profile.college || '';
                            userBranch = profile.branch || '';
                        }
                    }

                    await window.saveMaterialToFirestore({
                        title: document.getElementById('upload-title').value,
                        subject: document.getElementById('upload-subject').value,
                        type: document.getElementById('upload-type').value,
                        description: document.getElementById('upload-desc').value,
                        fileName: file.name,
                        fileUrl: downloadURL,
                        uploaderUid: uid,
                        course: userCourse,
                        college: userCollege,
                        branch: userBranch
                    });
                    
                    // Refresh grid if user is on index.html
                    loadRecentMaterials();
                }
            } else {
                // Fallback mock upload if Firebase module hasn't loaded yet
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            window.showToast('Material uploaded successfully! It will be available after review.', 'success');
            closeUploadModal();
        } catch (error) {
            console.error("Upload error:", error);
            window.showToast('Failed to upload material. Please try again later.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
});
