document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menu-btn');
    const closeBtn = document.getElementById('close-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');

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
            navLinks.forEach(link => {
                link.classList.remove('active');
                const href = link.getAttribute('href');
                
                if (page === 'notes.html' && href.includes('notes.html')) {
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
            alert('Please enter valid credits and grades/marks.');
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
            alert('Please enter valid SGPA for both semesters.');
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
            alert('Please enter SGPA for at least one semester.');
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
    const updateProfileUI = () => {
        const userName = localStorage.getItem('userName');
        if (userName) {
            const firstLetter = userName.charAt(0).toUpperCase();
            
            // Update sidebar profile link
            const profileLinks = document.querySelectorAll('.profile-link');
            profileLinks.forEach(link => {
                link.innerHTML = `<div class="user-avatar">${firstLetter}</div> <span>${userName}</span>`;
                link.href = '#'; 
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (confirm('Do you want to log out?')) {
                        localStorage.removeItem('userName');
                        window.location.reload();
                    }
                });
            });

            // Update navbar login button
            const navLoginBtns = document.querySelectorAll('.nav-btn[href="login.html"]');
            navLoginBtns.forEach(btn => {
                btn.innerHTML = `<div class="user-avatar nav-avatar" style="background-color: rgba(255,255,255,0.2);">${firstLetter}</div> <span>${userName}</span>`;
                btn.href = '#';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (confirm('Do you want to log out?')) {
                        localStorage.removeItem('userName');
                        window.location.reload();
                    }
                });
            });
        }
    };
    updateProfileUI();
});
