// ==========================================
// 1. FIREBASE IMPORTS
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, updateDoc, setDoc, arrayUnion, arrayRemove, deleteField, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// 2. CONFIGURATIONS
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDOX3ciualcuFxI5wt8Z14Zv3g_sjWUOGI",
    authDomain: "odia-learning-platform-d4a8e.firebaseapp.com",
    projectId: "odia-learning-platform-d4a8e",
    storageBucket: "odia-learning-platform-d4a8e.firebasestorage.app",
    messagingSenderId: "961301102290",
    appId: "1:961301102290:web:e638784217b07582e0770b",
    measurementId: "G-R0RRLPMQ1P"
};

const GITHUB_OWNER = "ExcellentInstitute"; 
const GITHUB_REPO = "excellent-curriculum-manager";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CLASSES = ["ପ୍ରଥମ ଶ୍ରେଣୀ", "ଦ୍ୱିତୀୟ ଶ୍ରେଣୀ", "ତୃତୀୟ ଶ୍ରେଣୀ", "ଚତୁର୍ଥ ଶ୍ରେଣୀ", "ପଞ୍ଚମ ଶ୍ରେଣୀ", "ଷଷ୍ଠ ଶ୍ରେଣୀ", "ସପ୍ତମ ଶ୍ରେଣୀ", "ଅଷ୍ଟମ ଶ୍ରେଣୀ", "ନବମ ଶ୍ରେଣୀ", "ଦଶମ ଶ୍ରେଣୀ"];

// Global State Memory (for fast searching & filtering)
let globalMergedData = {};

// ==========================================
// 3. UI ELEMENTS & EVENT LISTENERS
// ==========================================
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const contentGrid = document.getElementById('content-grid');
const systemStatus = document.getElementById('systemStatus');

// Search & Filter
document.getElementById('searchInput').addEventListener('input', renderGrid);
document.getElementById('classFilter').addEventListener('change', renderGrid);
document.getElementById('refreshBtn').addEventListener('click', loadDashboard);

// ==========================================
// 4. SECURE LOGIN
// ==========================================
document.getElementById('loginBtn').addEventListener('click', async () => {
    const pass = document.getElementById('passInput').value.trim();
    if (!pass) return;

    const btn = document.getElementById('loginBtn');
    btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Verifying...`;

    try {
        const docSnap = await getDoc(doc(db, "Admin", "Settings"));
        if (docSnap.exists() && docSnap.data().passcode === pass) {
            loginSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            loadDashboard(); // Start scanning the repo!
        } else {
            document.getElementById('loginError').innerText = "Incorrect passcode.";
            btn.innerHTML = `Unlock System <i class='bx bx-right-arrow-alt'></i>`;
        }
    } catch (e) {
        document.getElementById('loginError').innerText = "Database connection error.";
        btn.innerHTML = `Unlock System <i class='bx bx-right-arrow-alt'></i>`;
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => window.location.reload());

// ==========================================
// 5. CORE ENGINE: SCAN & MERGE DATA
// ==========================================
async function loadDashboard() {
    systemStatus.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Scanning GitHub and syncing with Firebase...";
    systemStatus.style.color = "var(--text-main)";
    
    try {
        // Step A: Fetch Live Data from Firebase
        const liveData = {};
        for (const cls of CLASSES) {
            const docSnap = await getDoc(doc(db, "Curriculum", cls));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.subjects) {
                    data.subjects.forEach(sub => {
                        liveData[sub] = { class: cls, pdf: data.pdf_links[sub], img: data.image_links[sub] };
                    });
                }
            }
        }

        // Step B: Fetch Available Files from GitHub
        const githubData = {};
        const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/materials`);
        const files = await res.json();

        if (Array.isArray(files)) {
            files.forEach(file => {
                const url = `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/${file.path}`;
                let subjectName = "";

                if (file.name.endsWith('.pdf')) {
                    subjectName = file.name.replace('.pdf', '');
                    if(!githubData[subjectName]) githubData[subjectName] = {};
                    githubData[subjectName].pdf = url;
                } else if (file.name.includes('-cover')) {
                    subjectName = file.name.split('-cover')[0];
                    if(!githubData[subjectName]) githubData[subjectName] = {};
                    githubData[subjectName].img = url;
                }
            });
        }

        // Step C: Merge them together into Global State
        globalMergedData = {};
        Object.keys(githubData).forEach(subject => {
            if (githubData[subject].pdf) { // Only show subjects that have a PDF file
                globalMergedData[subject] = {
                    name: subject,
                    pdfUrl: githubData[subject].pdf,
                    imgUrl: githubData[subject].img || "https://via.placeholder.com/400x600?text=No+Cover",
                    isLive: liveData[subject] !== undefined,
                    currentClass: liveData[subject] ? liveData[subject].class : ""
                };
            }
        });

        systemStatus.innerHTML = "<i class='bx bx-check-circle'></i> Systems synced. Ready for deployment.";
        systemStatus.style.color = "var(--success)";
        
        renderGrid(); // Draw the UI

    } catch (error) {
        console.error(error);
        systemStatus.innerHTML = "<i class='bx bx-error-circle'></i> Network error. Could not scan repository.";
        systemStatus.style.color = "var(--error)";
    }
}

// ==========================================
// 6. RENDER GRID, SEARCH, & STATS
// ==========================================
function renderGrid() {
    contentGrid.innerHTML = '';
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const classFilter = document.getElementById('classFilter').value;

    let liveCount = 0;
    let offlineCount = 0;
    let totalCount = 0;

    Object.values(globalMergedData).forEach(item => {
        totalCount++;
        if (item.isLive) liveCount++;
        else offlineCount++;

        // Apply Search and Filter logic
        const matchesSearch = item.name.toLowerCase().includes(searchQuery);
        const matchesClass = classFilter === "ALL" || item.currentClass === classFilter;

        if (matchesSearch && matchesClass) {
            createCardHTML(item);
        }
    });

    // Update Analytics Board
    document.getElementById('statLiveCount').innerText = liveCount;
    document.getElementById('statOfflineCount').innerText = offlineCount;
    document.getElementById('statTotalCount').innerText = totalCount;
}

function createCardHTML(item) {
    const card = document.createElement('div');
    card.className = 'subject-card';

    // Dropdown options
    let optionsHtml = `<option value="" disabled ${!item.isLive ? 'selected' : ''}>-- Assign a Class --</option>`;
    CLASSES.forEach(cls => {
        const selected = (cls === item.currentClass) ? 'selected' : '';
        optionsHtml += `<option value="${cls}" ${selected}>${cls}</option>`;
    });

    const badge = item.isLive 
        ? `<div class="status-badge status-live"><i class='bx bx-broadcast'></i> LIVE IN APP</div>` 
        : `<div class="status-badge status-offline"><i class='bx bx-archive-in'></i> OFFLINE</div>`;

    const button = item.isLive
        ? `<button class="btn-offline" onclick="takeOffline('${item.name}', '${item.currentClass}')"><i class='bx bx-cloud-download'></i> Take Offline</button>`
        : `<button class="btn-publish" onclick="publishLive('${item.name}', '${item.pdfUrl}', '${item.imgUrl}')"><i class='bx bx-cloud-upload'></i> Publish Live</button>`;

    card.innerHTML = `
        <div class="card-image-container">
            <img src="${item.imgUrl}" alt="${item.name}">
            ${badge}
        </div>
        <div class="card-content">
            <div class="card-title">${item.name}</div>
            <select id="select-${item.name}" class="card-select" ${item.isLive ? 'disabled' : ''}>
                ${optionsHtml}
            </select>
            ${button}
        </div>
    `;
    contentGrid.appendChild(card);
}

// ==========================================
// 7. PUBLISH / OFFLINE ACTIONS
// ==========================================
window.publishLive = async (subjectName, pdfUrl, imgUrl) => {
    const classSelect = document.getElementById(`select-${subjectName}`);
    const selectedClass = classSelect.value;

    if(!selectedClass) {
        showToast("Select a class before publishing!", "error");
        return;
    }

    try {
        const docRef = doc(db, "Curriculum", selectedClass);
        await updateDoc(docRef, {
            subjects: arrayUnion(subjectName),
            [`pdf_links.${subjectName}`]: pdfUrl,
            [`image_links.${subjectName}`]: imgUrl
        }).catch(async (e) => {
            if(e.code === 'not-found') {
                await setDoc(docRef, {
                    subjects: [subjectName],
                    pdf_links: { [subjectName]: pdfUrl },
                    image_links: { [subjectName]: imgUrl }
                });
            } else throw e;
        });
        
        showToast(`"${subjectName}" is now live in the app!`, "success");
        loadDashboard(); // Refresh UI
    } catch (e) {
        showToast("Publish failed. Check permissions.", "error");
    }
}

window.takeOffline = async (subjectName, currentClass) => {
    if(confirm(`Are you sure you want to remove "${subjectName}" from the app? Students will lose access.`)) {
        try {
            await updateDoc(doc(db, "Curriculum", currentClass), {
                subjects: arrayRemove(subjectName),
                [`pdf_links.${subjectName}`]: deleteField(),
                [`image_links.${subjectName}`]: deleteField()
            });
            showToast(`"${subjectName}" taken offline.`, "error");
            loadDashboard(); // Refresh UI
        } catch (e) {
            showToast("Failed to take offline.", "error");
        }
    }
}

// ==========================================
// 8. TOAST NOTIFICATION SYSTEM
// ==========================================
function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? "<i class='bx bxs-check-circle'></i>" : "<i class='bx bxs-error-circle'></i>";
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    // Remove toast smoothly after 4 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400); // Wait for fade out animation
    }, 4000);
}
