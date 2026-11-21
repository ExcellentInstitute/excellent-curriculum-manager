// ==========================================
// 1. FIREBASE IMPORTS
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, updateDoc, setDoc, arrayUnion, arrayRemove, deleteField, getDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const WORKER_NOTIFY_URL = "https://foxy-olearning-proxy.pkb9658-pkb-pkb.workers.dev/admin/notify";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CLASSES = ["ପ୍ରଥମ ଶ୍ରେଣୀ", "ଦ୍ୱିତୀୟ ଶ୍ରେଣୀ", "ତୃତୀୟ ଶ୍ରେଣୀ", "ଚତୁର୍ଥ ଶ୍ରେଣୀ", "ପଞ୍ଚମ ଶ୍ରେଣୀ", "ଷଷ୍ଠ ଶ୍ରେଣୀ", "ସପ୍ତମ ଶ୍ରେଣୀ", "ଅଷ୍ଟମ ଶ୍ରେଣୀ", "ନବମ ଶ୍ରେଣୀ", "ଦଶମ ଶ୍ରେଣୀ"];

// Global State Memory
let globalMergedData = {};
let liveClassCovers = {};
let allGithubImages = [];
let publishedExamPapers = [];
let activeImageFormatFilter = "ALL";
let portalConfig = {
    header_title_odia: "ଶ୍ରେଣୀ ଚୟନ କରନ୍ତୁ",
    header_title_en: "Select Your Class",
    tab_study_label: "📚 ପାଠ୍ୟ ପୁସ୍ତକ",
    tab_video_label: "🎬 ଭିଡିଓ ଶିକ୍ଷା",
    tab_live_label: "🔴 ଲାଇଭ୍ କ୍ଲାସ୍",
    footer_brand_text: "🦊 Excellent Institute • Odisha",
    live_youtube_id: "jfKfPfyJRdk",
    live_class_title: "🔴 Live Class (ଲାଇଭ୍ କ୍ଲାସ୍)",
    live_class_description: "Join our interactive Odisha Board Live Revision Class & ask doubts in YouTube Live Chat.",
    pdf_backup_mirror_base: "",
    social_youtube: "https://www.youtube.com",
    social_instagram: "https://www.instagram.com",
    social_facebook: "https://www.facebook.com",
    social_map: "https://maps.google.com",
    custom_class_names: {},
    sidebar_items: [
        { title: "📢 ସୂଚନା ଫଳକ (Notice Board)", target: "ନୂତନ ଶିକ୍ଷାବର୍ଷ ପାଇଁ ସମସ୍ତ ବହି ଏବଂ AI ଶିକ୍ଷକ ଉପଲବ୍ଧ ଅଛି।" },
        { title: "📅 ପରୀକ୍ଷା ସୂଚୀ (Exam Routine)", target: "ପ୍ରତି ରବିବାର ଲାଇଭ୍ କ୍ଲାସ୍ ଏବଂ ସାପ୍ତାହିକ ଅଭ୍ୟାସ ପରୀକ୍ଷା।" },
        { title: "📞 ସହାୟତା କେନ୍ଦ୍ର (Help Desk)", target: "Excellent Institute, Odisha • କୌଣସି ସନ୍ଦେହ ଥିଲେ Foxy AI କୁ ପଚାରନ୍ତୁ।" }
    ],
    custom_sections: [],
    video_playlists: [],
    past_live_classes: [],
    video_lessons: {}
};

function escapeJs(str) {
    return String(str || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function extractYoutubeId(raw) {
    const t = String(raw || "").trim();
    if (t.includes("youtu.be/")) return t.split("youtu.be/")[1].split(/[?&]/)[0];
    if (t.includes("v=")) return t.split("v=")[1].split(/[?&]/)[0];
    if (t.includes("live/")) return t.split("live/")[1].split(/[?&]/)[0];
    if (t.includes("embed/")) return t.split("embed/")[1].split(/[?&]/)[0];
    return t;
}
let simActiveTab = "HOME";
let simSelectedClass = null;
let simDarkMode = false;
window.currentCropper = null;

// ==========================================
// 3. UI ELEMENTS & TAB NAVIGATION
// ==========================================
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const systemStatus = document.getElementById('systemStatus');

const tabSimulatorBtn = document.getElementById('tabSimulatorBtn');
const tabMaterialsBtn = document.getElementById('tabMaterialsBtn');
const tabClassesBtn = document.getElementById('tabClassesBtn');

const simulatorView = document.getElementById('simulatorView');
const materialsView = document.getElementById('materialsView');
const classCoversView = document.getElementById('classCoversView');

function switchDashboardTab(activeBtn, activeView) {
    [tabSimulatorBtn, tabMaterialsBtn, tabClassesBtn].forEach(b => b.classList.remove('active'));
    [simulatorView, materialsView, classCoversView].forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden');
    });
    activeBtn.classList.add('active');
    activeView.classList.add('active');
    activeView.classList.remove('hidden');
}

tabSimulatorBtn.addEventListener('click', () => switchDashboardTab(tabSimulatorBtn, simulatorView));
tabMaterialsBtn.addEventListener('click', () => switchDashboardTab(tabMaterialsBtn, materialsView));
tabClassesBtn.addEventListener('click', () => switchDashboardTab(tabClassesBtn, classCoversView));

document.getElementById('searchInput').addEventListener('input', renderMaterialGrid);
document.getElementById('classFilter').addEventListener('change', renderMaterialGrid);
document.getElementById('refreshBtn').addEventListener('click', () => {
    sessionStorage.removeItem('gh_materials_cache');
    loadDashboard();
});

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
            loadDashboard();
        } else {
            document.getElementById('loginError').innerText = "Incorrect passcode.";
            btn.innerHTML = `Unlock System <i class='bx bx-right-arrow-alt'></i>`;
        }
    } catch (e) {
        document.getElementById('loginError').innerText = "Database connection error.";
        btn.innerHTML = `Unlock System <i class='bx bx-right-arrow-alt'></i>`;
    }
});

document.getElementById('passInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
});
document.getElementById('logoutBtn').addEventListener('click', () => window.location.reload());

// ==========================================
// 5. CORE ENGINE: SCAN & MERGE DATA (WITH BANDWIDTH CACHE)
// ==========================================
async function loadDashboard() {
    systemStatus.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Syncing Firebase & GitHub...";
    systemStatus.style.color = "var(--text-main)";
    
    try {
        // Load Portal Config
        const portalSnap = await getDoc(doc(db, "Admin", "AppPortal"));
        if (portalSnap.exists()) {
            portalConfig = { ...portalConfig, ...portalSnap.data() };
            if (!Array.isArray(portalConfig.sidebar_items) || portalConfig.sidebar_items.length === 0) {
                portalConfig.sidebar_items = [
                    { title: portalConfig.sidebar1_title || "📢 ସୂଚନା ଫଳକ (Notice Board)", target: portalConfig.sidebar1_body || "" },
                    { title: portalConfig.sidebar2_title || "📅 ପରୀକ୍ଷା ସୂଚୀ (Exam Routine)", target: portalConfig.sidebar2_body || "" },
                    { title: portalConfig.sidebar3_title || "📞 ସହାୟତା କେନ୍ଦ୍ର (Help Desk)", target: portalConfig.sidebar3_body || "" }
                ];
            }
            if (!Array.isArray(portalConfig.custom_sections)) portalConfig.custom_sections = [];
            if (!Array.isArray(portalConfig.video_playlists)) portalConfig.video_playlists = [];
            if (!Array.isArray(portalConfig.past_live_classes)) portalConfig.past_live_classes = [];
            if (!portalConfig.custom_class_names) portalConfig.custom_class_names = {};

            // Auto-migrate legacy video_lessons map entries into video_playlists if not already present
            if (portalConfig.video_lessons && typeof portalConfig.video_lessons === 'object') {
                Object.entries(portalConfig.video_lessons).forEach(([t, id]) => {
                    const clean = extractYoutubeId(id);
                    if (!portalConfig.video_playlists.some(v => extractYoutubeId(v.video_id) === clean)) {
                        portalConfig.video_playlists.push({ title: t, video_id: clean, playlist: "General", description: "" });
                    }
                });
            }
        }

        const liveData = {};
        for (const cls of CLASSES) {
            const docSnap = await getDoc(doc(db, "Curriculum", cls));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.subjects) {
                    data.subjects.forEach(sub => {
                        liveData[sub] = {
                            class: cls,
                            pdf: data.pdf_links?.[sub] || "",
                            img: data.image_links?.[sub] || "",
                            edition: data.book_editions?.[sub] || "2026_v1"
                        };
                    });
                }
            }
        }

        const classCoversSnap = await getDoc(doc(db, "Admin", "ClassCovers"));
        liveClassCovers = classCoversSnap.exists() ? classCoversSnap.data() : {};

        // Load Published Exam Papers from Firestore
        publishedExamPapers = [];
        try {
            const examSnap = await getDocs(collection(db, "ExamPapers"));
            examSnap.forEach(d => publishedExamPapers.push({ id: d.id, ...d.data() }));
            publishedExamPapers.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
        } catch (_) {}

        const githubData = {};
        allGithubImages = []; 
        
        // Use sessionStorage cache to save GitHub API bandwidth unless 'Sync Repo' is clicked
        let files = null;
        const cachedGh = sessionStorage.getItem('gh_materials_cache');
        if (cachedGh) {
            try { files = JSON.parse(cachedGh); } catch (_) {}
        }
        if (!files) {
            const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/materials`);
            files = await res.json();
            if (Array.isArray(files)) {
                sessionStorage.setItem('gh_materials_cache', JSON.stringify(files));
            }
        }

        if (Array.isArray(files)) {
            files.forEach(file => {
                const url = `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/${file.path}`;
                const low = file.name.toLowerCase();
                let subjectName = "";

                if (low.endsWith('.webp') || low.endsWith('.png') || low.endsWith('.jpg') || low.endsWith('.jpeg')) {
                    const fmt = low.endsWith('.webp') ? 'webp' : low.endsWith('.png') ? 'png' : 'jpeg';
                    allGithubImages.push({ name: file.name, url: url, format: fmt });
                }

                if (low.endsWith('.pdf')) {
                    subjectName = file.name.replace(/\.pdf$/i, '');
                    if (!githubData[subjectName]) githubData[subjectName] = {};
                    githubData[subjectName].pdf = url;
                } else if (low.includes('-cover') || low.endsWith('.webp') || low.endsWith('.png') || low.endsWith('.jpg') || low.endsWith('.jpeg')) {
                    subjectName = low.includes('-cover')
                        ? file.name.split('-cover')[0]
                        : file.name.replace(/\.(webp|png|jpg|jpeg)$/i, '');
                    if (!githubData[subjectName]) githubData[subjectName] = {};
                    githubData[subjectName].img = url;
                }
            });
        }

        globalMergedData = {};
        
        Object.keys(liveData).forEach(liveSubject => {
            globalMergedData[liveSubject] = {
                name: liveSubject,
                pdfUrl: liveData[liveSubject].pdf,
                imgUrl: liveData[liveSubject].img || "",
                edition: liveData[liveSubject].edition || "2026_v1",
                isLive: true,
                currentClass: liveData[liveSubject].class
            };
        });

        Object.keys(githubData).forEach(gitSubject => {
            const gPdf = githubData[gitSubject].pdf || "";
            const gImg = githubData[gitSubject].img || "";
            const isAlreadyLive = Object.entries(liveData).some(([liveName, item]) => {
                if (gPdf && item.pdf && item.pdf === gPdf) return true;
                if (!gPdf && gImg && item.img && item.img === gImg && !item.pdf) return true;
                return liveName === gitSubject;
            });
            if (!isAlreadyLive && (gPdf || gImg)) {
                globalMergedData[gitSubject] = {
                    name: gitSubject,
                    pdfUrl: gPdf,
                    imgUrl: gImg,
                    edition: "2026_v1",
                    isLive: false,
                    currentClass: ""
                };
            }
        });

        systemStatus.innerHTML = "<i class='bx bx-check-circle'></i> Systems synced. Ready for deployment.";
        systemStatus.style.color = "var(--success)";
        
        updateQuietHoursIndicator();
        populateExamRepoImagePicker();
        renderAdminExamPapersList();
        renderMaterialGrid(); 
        renderClassCoversGrid();
        renderInteractiveSimulator();

    } catch (error) {
        console.error(error);
        systemStatus.innerHTML = "<i class='bx bx-error-circle'></i> Network error. Could not scan repository.";
        systemStatus.style.color = "var(--error)";
    }
}

// ==========================================
// 5B. INTERACTIVE LIVE APP SIMULATOR & VISUAL EDITOR
// ==========================================
async function savePortalConfigToFirebase() {
    await setDoc(doc(db, "Admin", "AppPortal"), portalConfig, { merge: true });
    renderInteractiveSimulator();
}
function renderInteractiveSimulator() {
    // 1. Top Header & Drawer Brand
    const homeTitle = portalConfig.home_title_odia || "ମୁଖ୍ୟ ପୃଷ୍ଠା (Home)";
    const studyTitle = portalConfig.header_title_odia || "ଶ୍ରେଣୀ ଚୟନ କରନ୍ତୁ";
    document.getElementById('simHeaderTitle').innerText =
        (simActiveTab === "HOME" ? homeTitle : simSelectedClass ? `${simSelectedClass} - Subjects` : studyTitle) + " ✏️";
    document.getElementById('simDrawerBrand').innerText =
        (portalConfig.footer_brand_text || "Excellent Institute").replace("🦊", "").trim() + " ✏️";

    // 2. Populate Core Navigation inside Slide-Out Drawer
    const coreNav = document.getElementById('simDrawerCoreNav');
    coreNav.innerHTML = '';

    const drawerNavItems = [
        { id: "HOME",  label: portalConfig.drawer_home_label || "🏠 ମୁଖ୍ୟ ପୃଷ୍ଠା (Home)", field: "drawer_home_label", color: "#6366F1" },
        { id: "STUDY", label: portalConfig.tab_study_label   || "📚 ପାଠ୍ୟ ପୁସ୍ତକ (Study Books)", field: "tab_study_label", color: "#4318FF" },
        { id: "VIDEO", label: portalConfig.tab_video_label   || "🎬 ଭିଡିଓ ଶିକ୍ଷା (Video Classes)", field: "tab_video_label", color: "#05CD99" },
        { id: "LIVE",  label: portalConfig.tab_live_label    || "🔴 ଲାଇଭ୍ କ୍ଲାସ୍ (Live Class)", field: "tab_live_label", color: "#EE5D50" }
    ];

    drawerNavItems.forEach(t => {
        const row = document.createElement('div');
        row.style.cssText = `background:${t.color}; color:white; padding:9px 12px; border-radius:10px; font-size:12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; cursor:pointer;`;
        row.innerHTML = `
            <span onclick="switchSimTab('${t.id}')" style="flex:1;">${t.label}</span>
            <span onclick="event.stopPropagation(); editSimField('${t.field}', 'Drawer Button Name')" title="Edit Name">✏️</span>
        `;
        coreNav.appendChild(row);
    });

    (portalConfig.custom_sections || []).forEach((sec, idx) => {
        const row = document.createElement('div');
        row.style.cssText = `background:#FF9800; color:white; padding:9px 12px; border-radius:10px; font-size:12px; font-weight:700; display:flex; justify-content:space-between; align-items:center; cursor:pointer;`;
        row.innerHTML = `
            <span onclick="switchSimTab('CUSTOM_${idx}')" style="flex:1;">${sec.title}</span>
            <span onclick="event.stopPropagation(); editCustomSection(${idx})" title="Edit Section">✏️</span>
        `;
        coreNav.appendChild(row);
    });

    // 3. Render Main Screen Body (Blank Home by default!)
    const bodyArea = document.getElementById('simBodyArea');
    bodyArea.innerHTML = '';

    if (simActiveTab === "HOME") {
        bodyArea.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:8px;">
                <div style="background:linear-gradient(135deg,#4318FF,#0052CC); color:white; padding:12px; border-radius:14px;">
                    <div style="font-weight:700; font-size:13px;">Welcome, Student! 👋</div>
                    <div style="font-size:10px; opacity:0.9; margin-top:2px;">Class 1–10 Books, Playlists & Foxy AI</div>
                </div>
                <div style="background:white; padding:10px; border-radius:12px; border:1.5px solid #4318FF; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:9px; font-weight:700; color:#4318FF;">🎓 MY CLASS</div>
                        <div style="font-size:11px; font-weight:700; color:#1B2559;">Select Class (1–10)</div>
                    </div>
                    <span onclick="switchSimTab('STUDY')" style="background:#4318FF; color:white; font-size:10px; padding:4px 8px; border-radius:8px; cursor:pointer;">Books ▸</span>
                </div>
                <div style="background:white; padding:10px; border-radius:12px; border:1.5px solid #05CD99; font-size:11px; color:#1B2559;">
                    <div style="font-size:9px; font-weight:700; color:#05CD99;">📖 CONTINUE READING & ⭐ BOOKMARKS</div>
                    Auto-saved locally on student's phone
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                    <div onclick="switchSimTab('STUDY')" style="background:white; padding:10px; border-radius:12px; border:1.5px solid #4318FF; cursor:pointer; font-size:11px; font-weight:700; color:#1B2559;">📚 All Classes</div>
                    <div onclick="switchSimTab('VIDEO')" style="background:white; padding:10px; border-radius:12px; border:1.5px solid #05CD99; cursor:pointer; font-size:11px; font-weight:700; color:#1B2559;">🎬 Video Playlists</div>
                    <div onclick="switchSimTab('LIVE')" style="background:white; padding:10px; border-radius:12px; border:1.5px solid #EE5D50; cursor:pointer; font-size:11px; font-weight:700; color:#1B2559;">🔴 Live & Past</div>
                    <div onclick="toggleSimSidebar(true)" style="background:white; padding:10px; border-radius:12px; border:1.5px solid #FF9800; cursor:pointer; font-size:11px; font-weight:700; color:#1B2559;">📢 Notices</div>
                </div>
                <div style="background:linear-gradient(90deg,#FF8F00,#F4511E); color:white; padding:10px; border-radius:12px;">
                    <div style="font-size:11px; font-weight:700;">👑 Student Pro Pass (₹100)</div>
                    <div style="font-size:9px; opacity:0.95;">Offline Books • Zero Ads • Priority Foxy AI</div>
                </div>
            </div>
        `;
    } else if (simActiveTab === "STUDY") {
        if (!simSelectedClass) {
            const grid = document.createElement('div');
            grid.style.cssText = "display:grid; grid-template-columns:1fr 1fr; gap:8px;";

            CLASSES.forEach((clsKey, index) => {
                const displayLabel = portalConfig.custom_class_names?.[clsKey] || clsKey;
                const cover = liveClassCovers[clsKey] || "https://via.placeholder.com/300x400?text=Class";
                const card = document.createElement('div');
                card.style.cssText = "background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.06); border:1.5px solid #4318FF; cursor:pointer;";
                card.innerHTML = `
                    <img src="${cover}" onclick="openSimClass('${clsKey}')" style="width:100%; height:78px; object-fit:cover; display:block;">
                    <div style="padding:6px; font-size:11px; font-weight:700; text-align:center; color:#1B2559; display:flex; justify-content:center; align-items:center; gap:4px;">
                        <span onclick="openSimClass('${clsKey}')">${displayLabel}</span>
                        <span onclick="event.stopPropagation(); renameSimClass('${clsKey}')" title="Rename Class">✏️</span>
                    </div>
                `;
                grid.appendChild(card);

                if ((index + 1) % 4 === 0 || index === CLASSES.length - 1) {
                    const adBanner = document.createElement('div');
                    adBanner.style.cssText = "grid-column: span 2; background:rgba(67,24,255,0.1); border:1.5px dashed #4318FF; border-radius:10px; padding:8px; text-align:center; font-size:10px; font-weight:700; color:#4318FF;";
                    adBanner.innerText = `📢 [Native Advanced Ad #${Math.ceil((index + 1) / 4)} - Full Row]`;
                    grid.appendChild(adBanner);
                }
            });
            bodyArea.appendChild(grid);
        } else {
            const backBtn = document.createElement('button');
            backBtn.style.cssText = "margin-bottom:8px; background:#1B2559; color:white; padding:6px 12px; border-radius:8px; font-size:11px;";
            backBtn.innerText = "⬅ Back to All Classes";
            backBtn.onclick = () => { simSelectedClass = null; renderInteractiveSimulator(); };
            bodyArea.appendChild(backBtn);

            const classSubjects = Object.values(globalMergedData).filter(i => i.isLive && i.currentClass === simSelectedClass);
            if (classSubjects.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = "background:white; padding:20px; border-radius:12px; text-align:center; font-size:12px; color:#64748B;";
                empty.innerText = `No live subjects published for ${simSelectedClass} yet.`;
                bodyArea.appendChild(empty);
            } else {
                const grid = document.createElement('div');
                grid.style.cssText = "display:grid; grid-template-columns:1fr 1fr; gap:8px;";
                classSubjects.forEach((sub, idx) => {
                    const card = document.createElement('div');
                    card.style.cssText = "background:white; border-radius:12px; overflow:hidden; border:1.5px solid #05CD99; cursor:pointer;";
                    card.innerHTML = `
                        <img src="${sub.imgUrl}" onclick="window.open('${sub.pdfUrl}', '_blank')" style="width:100%; height:78px; object-fit:cover; display:block;">
                        <div style="padding:6px; font-size:11px; font-weight:700; text-align:center; color:#1B2559;">
                            ${sub.name} <span onclick="event.stopPropagation(); openRenameModal('${sub.name}', '${sub.currentClass}')">✏️</span>
                        </div>
                    `;
                    grid.appendChild(card);

                    if ((idx + 1) % 4 === 0 || idx === classSubjects.length - 1) {
                        const adBanner = document.createElement('div');
                        adBanner.style.cssText = "grid-column: span 2; background:rgba(5,205,153,0.12); border:1.5px dashed #05CD99; border-radius:10px; padding:8px; text-align:center; font-size:10px; font-weight:700; color:#05CD99;";
                        adBanner.innerText = `📢 [Subject Native Advanced Ad #${Math.ceil((idx + 1) / 4)}]`;
                        grid.appendChild(adBanner);
                    }
                });
                bodyArea.appendChild(grid);
            }
        }
    } else if (simActiveTab === "VIDEO") {
        const list = portalConfig.video_playlists || [];
        const firstId = list.length > 0 ? extractYoutubeId(list[0].video_id) : "";
        let cardsHtml = list.map(v => {
            const cid = extractYoutubeId(v.video_id);
            return `
                <div style="display:flex; gap:8px; background:white; padding:6px; border-radius:10px; align-items:center; border:1px solid #E2E8F0;">
                    <img src="https://img.youtube.com/vi/${cid}/hqdefault.jpg" style="width:76px; height:46px; object-fit:cover; border-radius:6px;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-size:9px; font-weight:700; color:#05CD99;">📁 ${v.playlist || 'General'}</div>
                        <div style="font-size:11px; font-weight:700; color:#1B2559; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.title}</div>
                        <div style="font-size:9px; color:#64748B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.description || ''}</div>
                    </div>
                </div>
            `;
        }).join('');
        bodyArea.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:8px;">
                ${firstId ? `<iframe width="100%" height="145" src="https://www.youtube.com/embed/${firstId}" frameborder="0" allowfullscreen style="border-radius:10px; background:#000;"></iframe>` : ''}
                ${cardsHtml || `<div style="background:white; padding:16px; border-radius:10px; text-align:center; font-size:11px; color:#64748B;">No videos added yet. Use '+ Add Video to Playlist' on the right!</div>`}
            </div>
        `;
    } else if (simActiveTab === "LIVE") {
        const liveId = extractYoutubeId(portalConfig.live_youtube_id || "jfKfPfyJRdk");
        const pastHtml = (portalConfig.past_live_classes || []).map(p => {
            const pid = extractYoutubeId(p.video_id);
            return `
                <div style="display:flex; gap:8px; background:white; padding:6px; border-radius:10px; align-items:center; border:1px solid #E2E8F0;">
                    <img src="https://img.youtube.com/vi/${pid}/hqdefault.jpg" style="width:70px; height:42px; object-fit:cover; border-radius:6px;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-size:9px; font-weight:700; color:#4318FF;">📼 Past Live</div>
                        <div style="font-size:11px; font-weight:700; color:#1B2559; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.title}</div>
                    </div>
                </div>
            `;
        }).join('');
        bodyArea.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:8px;">
                <div style="background:white; border-radius:12px; padding:8px; border:1.5px solid #EE5D50;">
                    <div style="font-size:11px; font-weight:700; color:#EE5D50; margin-bottom:4px;">🔴 LIVE NOW — ${portalConfig.live_class_title || 'Live Class'}</div>
                    <iframe width="100%" height="140" src="https://www.youtube.com/embed/${liveId}" frameborder="0" allowfullscreen style="border-radius:8px; background:#000;"></iframe>
                </div>
                ${pastHtml}
            </div>
        `;
    } else if (simActiveTab.startsWith("CUSTOM_")) {
        const idx = parseInt(simActiveTab.replace("CUSTOM_", ""), 10);
        const sec = portalConfig.custom_sections?.[idx];
        if (sec) {
            bodyArea.innerHTML = `
                <div style="background:white; border-radius:12px; padding:8px; height:100%; display:flex; flex-direction:column;">
                    <div style="font-size:11px; font-weight:700; margin-bottom:6px; display:flex; justify-content:space-between;">
                        <span>${sec.title}</span>
                        <a href="${sec.url}" target="_blank" style="color:#4318FF;">Open Full Page ↗</a>
                    </div>
                    <iframe src="${sec.url}" style="flex:1; width:100%; border:1px solid #E2E8F0; border-radius:8px;"></iframe>
                </div>
            `;
        }
    }

    // 4. Populate Notice Items inside Slide-Out Drawer
    const sbList = document.getElementById('simSidebarItemsList');
    sbList.innerHTML = '';
    (portalConfig.sidebar_items || []).forEach((item, idx) => {
        const row = document.createElement('div');
        row.style.cssText = "background:#3B82F6; color:white; padding:8px 10px; border-radius:10px; font-size:11px; font-weight:600; display:flex; justify-content:space-between; align-items:center;";
        row.innerHTML = `
            <span onclick="previewSidebarItem(${idx})" style="cursor:pointer; flex:1;">${item.title}</span>
            <span style="display:flex; gap:6px;">
                <span onclick="editSidebarItem(${idx})" style="cursor:pointer;" title="Edit">✏️</span>
                <span onclick="deleteSidebarItem(${idx})" style="cursor:pointer;" title="Delete">🗑️</span>
            </span>
        `;
        sbList.appendChild(row);
    });

    // 5. Populate Right Panel Custom Sections List
    const adminSecList = document.getElementById('adminCustomSectionsList');
    adminSecList.innerHTML = '';
    if ((portalConfig.custom_sections || []).length === 0) {
        adminSecList.innerHTML = `<div style="font-size:12px; color:#94A3B8;">No extra sections added yet. Click below to add "📝 Exam" or any GitHub page!</div>`;
    } else {
        portalConfig.custom_sections.forEach((sec, idx) => {
            const div = document.createElement('div');
            div.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:#F4F7FE; padding:10px 14px; border-radius:10px; font-size:13px; font-weight:600;";
            div.innerHTML = `
                <div>
                    <div>${sec.title}</div>
                    <div style="font-size:11px; color:#64748B;">${sec.url}</div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="editCustomSection(${idx})" style="background:#FFF9E6; color:#D4AC0D; padding:6px 10px; border-radius:8px; font-size:12px;">✏️ Edit</button>
                    <button onclick="deleteCustomSection(${idx})" style="background:#FDE8E7; color:#EE5D50; padding:6px 10px; border-radius:8px; font-size:12px;">🗑️</button>
                </div>
            `;
            adminSecList.appendChild(div);
        });
    }

    // 6. Populate Right Panel Video Playlists List
    const vidListEl = document.getElementById('adminVideoPlaylistsList');
    if (vidListEl) {
        vidListEl.innerHTML = '';
        if ((portalConfig.video_playlists || []).length === 0) {
            vidListEl.innerHTML = `<div style="font-size:12px; color:#94A3B8;">No playlist videos added yet.</div>`;
        } else {
            portalConfig.video_playlists.forEach((v, idx) => {
                const cid = extractYoutubeId(v.video_id);
                const row = document.createElement('div');
                row.style.cssText = "display:flex; gap:10px; align-items:center; background:#F4F7FE; padding:8px 10px; border-radius:10px;";
                row.innerHTML = `
                    <img src="https://img.youtube.com/vi/${cid}/default.jpg" style="width:54px; height:40px; object-fit:cover; border-radius:6px;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-size:11px; font-weight:700; color:#05CD99;">📁 ${v.playlist || 'General'}</div>
                        <div style="font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.title}</div>
                    </div>
                    <button onclick="deletePlaylistVideo(${idx})" style="background:#FDE8E7; color:#EE5D50; padding:6px 8px; border-radius:8px; font-size:12px;">🗑️</button>
                `;
                vidListEl.appendChild(row);
            });
        }
    }

    // 7. Populate Right Panel Past Live Classes List
    const pastListEl = document.getElementById('adminPastLivesList');
    if (pastListEl) {
        pastListEl.innerHTML = '';
        if ((portalConfig.past_live_classes || []).length === 0) {
            pastListEl.innerHTML = `<div style="font-size:12px; color:#94A3B8;">No past live classes archived yet.</div>`;
        } else {
            portalConfig.past_live_classes.forEach((p, idx) => {
                const pid = extractYoutubeId(p.video_id);
                const row = document.createElement('div');
                row.style.cssText = "display:flex; gap:10px; align-items:center; background:#F4F7FE; padding:8px 10px; border-radius:10px;";
                row.innerHTML = `
                    <img src="https://img.youtube.com/vi/${pid}/default.jpg" style="width:54px; height:40px; object-fit:cover; border-radius:6px;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.title}</div>
                        <div style="font-size:10px; color:#64748B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.description || ''}</div>
                    </div>
                    <button onclick="deletePastLive(${idx})" style="background:#FDE8E7; color:#EE5D50; padding:6px 8px; border-radius:8px; font-size:12px;">🗑️</button>
                `;
                pastListEl.appendChild(row);
            });
        }
    }
}

window.toggleSimSidebar = (show) => {
    const drawer = document.getElementById('simSidebarDrawer');
    const backdrop = document.getElementById('simSidebarBackdrop');
    if (show) {
        backdrop.classList.remove('hidden');
        drawer.style.transform = "translateX(0%)";
    } else {
        backdrop.classList.add('hidden');
        drawer.style.transform = "translateX(-105%)";
    }
};

window.switchSimTab = (tabId) => {
    simActiveTab = tabId;
    simSelectedClass = null;
    toggleSimSidebar(false);
    renderInteractiveSimulator();
};

window.openSimClass = (clsKey) => {
    simSelectedClass = clsKey;
    renderInteractiveSimulator();
};

window.toggleSimTheme = () => {
    simDarkMode = !simDarkMode;
    const screen = document.getElementById('simPhoneScreen');
    screen.style.background = simDarkMode
        ? "linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)"
        : "linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 100%)";
};

window.editSimField = async (fieldKey, label) => {
    const currentVal = portalConfig[fieldKey] || "";
    const nextVal = prompt(`Edit ${label}:`, currentVal);
    if (nextVal === null) return;
    portalConfig[fieldKey] = nextVal.trim();
    await savePortalConfigToFirebase();
    showToast(`${label} updated live in App!`, "success");
};

window.renameSimClass = async (clsKey) => {
    const cur = portalConfig.custom_class_names?.[clsKey] || clsKey;
    const next = prompt(`Edit display name for ${clsKey} (Leave blank to reset to default):`, cur);
    if (next === null) return;
    if (!portalConfig.custom_class_names) portalConfig.custom_class_names = {};
    if (next.trim() === "") delete portalConfig.custom_class_names[clsKey];
    else portalConfig.custom_class_names[clsKey] = next.trim();
    await savePortalConfigToFirebase();
    showToast(`Class display name updated!`, "success");
};

window.previewSidebarItem = (idx) => {
    const item = portalConfig.sidebar_items[idx];
    if (!item) return;
    if (item.target.startsWith("http://") || item.target.startsWith("https://")) {
        window.open(item.target, "_blank");
    } else {
        alert(`${item.title}\n\n${item.target}`);
    }
};

window.addNewSidebarItem = async () => {
    const title = prompt("Enter New Sidebar Item Name (e.g., 📝 Exam Portal or 📢 Notice):");
    if (!title || !title.trim()) return;
    const target = prompt("Enter Link (https://...) OR Notice Text to display when clicked:");
    if (target === null) return;
    portalConfig.sidebar_items.push({ title: title.trim(), target: target.trim() });
    await savePortalConfigToFirebase();
    showToast("New Sidebar item added to App!", "success");
};

window.editSidebarItem = async (idx) => {
    const item = portalConfig.sidebar_items[idx];
    if (!item) return;
    const title = prompt("Edit Sidebar Title:", item.title);
    if (title === null) return;
    const target = prompt("Edit Connected Link (https://...) or Notice Message:", item.target);
    if (target === null) return;
    portalConfig.sidebar_items[idx] = { title: title.trim(), target: target.trim() };
    await savePortalConfigToFirebase();
    showToast("Sidebar item updated!", "success");
};

window.deleteSidebarItem = async (idx) => {
    if (!confirm("Delete this sidebar item from the app?")) return;
    portalConfig.sidebar_items.splice(idx, 1);
    await savePortalConfigToFirebase();
    showToast("Sidebar item removed.", "error");
};

window.clickOrEditSocial = async (fieldKey, label) => {
    const currentUrl = portalConfig[fieldKey] || "https://";
    const action = prompt(`${label}\nCurrent Link: ${currentUrl}\n\nPaste a new URL to update, or click Cancel to keep it:`, currentUrl);
    if (action !== null && action.trim() !== "") {
        portalConfig[fieldKey] = action.trim();
        await savePortalConfigToFirebase();
        showToast(`${label} updated in App!`, "success");
    }
};

window.addNewCustomSection = async () => {
    const title = prompt("Enter New Section Tab Name (e.g., 📝 Exam or 🏆 Results):");
    if (!title || !title.trim()) return;
    const url = prompt(`Enter GitHub Page URL or Web Link for "${title}":`, "https://excellentinstitute.github.io/");
    if (!url || !url.trim()) return;
    if (!Array.isArray(portalConfig.custom_sections)) portalConfig.custom_sections = [];
    portalConfig.custom_sections.push({ title: title.trim(), url: url.trim() });
    await savePortalConfigToFirebase();
    showToast(`New section "${title}" is now live in the Android App!`, "success");
};

window.editCustomSection = async (idx) => {
    const sec = portalConfig.custom_sections[idx];
    if (!sec) return;
    const title = prompt("Edit Section Tab Title:", sec.title);
    if (title === null) return;
    const url = prompt("Edit Connected GitHub Page / URL:", sec.url);
    if (url === null) return;
    portalConfig.custom_sections[idx] = { title: title.trim(), url: url.trim() };
    await savePortalConfigToFirebase();
    showToast("Section updated!", "success");
};

window.deleteCustomSection = async (idx) => {
    if (!confirm("Remove this section from the app?")) return;
    portalConfig.custom_sections.splice(idx, 1);
    simActiveTab = "HOME";
    await savePortalConfigToFirebase();
    showToast("Section removed.", "error");
};

async function fetchYouTubeTitleAuto(videoId) {
    try {
        const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (res.ok) {
            const data = await res.json();
            return data.title || "";
        }
    } catch (_) {}
    return "";
}

window.addVideoToPlaylist = async () => {
    const ytUrl = prompt("1. Paste YouTube Video URL or Video ID:");
    if (!ytUrl || !ytUrl.trim()) return;
    const cleanId = extractYoutubeId(ytUrl);

    const autoTitle = await fetchYouTubeTitleAuto(cleanId);
    const title = prompt("2. Video Title (auto-fetched from YouTube):", autoTitle || "Class Video Lesson");
    if (!title || !title.trim()) return;

    const playlist = prompt("3. Playlist Name (e.g., Class 10 Math, Class 5 Science):", "General");
    if (playlist === null) return;

    const desc = prompt("4. Short Video Description (1–2 lines):", "Watch this lesson for step-by-step Odisha Board explanation.");
    if (desc === null) return;

    if (!Array.isArray(portalConfig.video_playlists)) portalConfig.video_playlists = [];
    portalConfig.video_playlists.unshift({
        title: title.trim(),
        video_id: cleanId,
        playlist: playlist.trim() || "General",
        description: desc.trim()
    });
    await savePortalConfigToFirebase();
    showToast(`Added "${title.trim()}" to playlist "${playlist.trim() || 'General'}"!`, "success");

    if (confirm(`🔔 Send Push Notification to students about this new video?\n\n"${title.trim()}"`)) {
        const ok = await triggerCloudflarePush({
            title: "🎬 New Video Class Uploaded!",
            body: `${playlist.trim() || "Video"}: ${title.trim()}`,
            topic: "all_students",
            type: "video",
            targetId: cleanId
        });
        if (ok) showToast("Video push notification sent!", "success");
    }
};

window.deletePlaylistVideo = async (idx) => {
    if (!confirm("Remove this video from the app?")) return;
    portalConfig.video_playlists.splice(idx, 1);
    await savePortalConfigToFirebase();
    showToast("Video removed.", "error");
};

window.goLiveAndArchivePrevious = async () => {
    const newLiveUrl = prompt("1. Paste NEW YouTube Live Stream URL or Video ID:", "");
    if (!newLiveUrl || !newLiveUrl.trim()) return;
    const cleanNewId = extractYoutubeId(newLiveUrl);

    const autoTitle = await fetchYouTubeTitleAuto(cleanNewId);
    const newTitle = prompt("2. New Live Class Title:", autoTitle || "🔴 Live Class (ଲାଇଭ୍ କ୍ଲାସ୍)");
    if (!newTitle) return;
    const newDesc = prompt("3. Live Class Description:", portalConfig.live_class_description || "Live interactive doubt-clearing session.");

    // Automatically archive the previous live video into Past Live Classes
    const prevId = extractYoutubeId(portalConfig.live_youtube_id || "");
    if (prevId && prevId !== cleanNewId) {
        if (!Array.isArray(portalConfig.past_live_classes)) portalConfig.past_live_classes = [];
        const alreadyArchived = portalConfig.past_live_classes.some(p => extractYoutubeId(p.video_id) === prevId);
        if (!alreadyArchived) {
            portalConfig.past_live_classes.unshift({
                title: (portalConfig.live_class_title || "Past Live Class").replace("🔴", "").trim(),
                video_id: prevId,
                description: portalConfig.live_class_description || "Recorded Live Session"
            });
        }
    }

    portalConfig.live_youtube_id = cleanNewId;
    portalConfig.live_class_title = newTitle.trim();
    portalConfig.live_class_description = (newDesc || "").trim();

    await savePortalConfigToFirebase();
    showToast("New Live Class is pinned on top & previous stream archived!", "success");

    if (confirm(`🔴 Send HIGH-PRIORITY Live Class Push Notification to students now?\n\n"${newTitle.trim()}"`)) {
        const ok = await triggerCloudflarePush({
            title: "🔴 Live Class Started Now!",
            body: `${newTitle.trim()} — Tap to join Live Class!`,
            topic: "all_students",
            type: "live",
            targetId: cleanNewId,
            forceBypassQuietHours: true
        });
        if (ok) showToast("🔴 Live Class push alert sent to all students!", "success");
    }
};

window.addPastLiveManually = async () => {
    const ytUrl = prompt("1. Paste Past Live Recording YouTube URL or ID:");
    if (!ytUrl || !ytUrl.trim()) return;
    const cleanId = extractYoutubeId(ytUrl);
    const autoTitle = await fetchYouTubeTitleAuto(cleanId);
    const title = prompt("2. Recording Title:", autoTitle || "Past Live Revision Class");
    if (!title) return;
    const desc = prompt("3. Short Description:", "Recorded Live Class");

    if (!Array.isArray(portalConfig.past_live_classes)) portalConfig.past_live_classes = [];
    portalConfig.past_live_classes.unshift({
        title: title.trim(),
        video_id: cleanId,
        description: (desc || "").trim()
    });
    await savePortalConfigToFirebase();
    showToast("Past Live recording added!", "success");
};

window.deletePastLive = async (idx) => {
    if (!confirm("Remove this past live recording?")) return;
    portalConfig.past_live_classes.splice(idx, 1);
    await savePortalConfigToFirebase();
    showToast("Past Live removed.", "error");
};

window.manageAiConfigAndProSwitch = async () => {
    try {
        const ref = doc(db, "Admin", "AiConfig");
        const snap = await getDoc(ref);
        const cur = snap.exists() ? snap.data() : {};

        const curSwitch = cur.pro_limit_switch === true;
        const switchInput = prompt(
            `Pro Daily Quota Switch (Currently: ${curSwitch ? "ON — 10 Free / 20 Pro / 50 Monthly" : "OFF — Unlimited Training Mode"})\n\nType "ON" to activate daily limits, or "OFF" to keep unlimited:\n(Note: All AI API keys are safely stored in Cloudflare Worker Secrets.)`,
            curSwitch ? "ON" : "OFF"
        );
        if (switchInput === null) return;

        await setDoc(ref, {
            pro_limit_switch: switchInput.trim().toUpperCase() === "ON",
            updated_at: Date.now()
        }, { merge: true });

        showToast(`Pro Quota Switch set to ${switchInput.trim().toUpperCase() === "ON" ? "ON" : "OFF"}!`, "success");
    } catch (e) {
        console.error(e);
        showToast("Failed to update Pro Quota Switch.", "error");
    }
};

window.setBackupPdfMirror = async () => {
    const cur = portalConfig.pdf_backup_mirror_base || "";
    const next = prompt(
        "Optional Free Backup PDF Mirror Base URL (e.g., Cloudflare R2 public URL https://pub-xxxx.r2.dev).\nLeave blank to use automatic GitHub Pages + jsDelivr CDN + Raw mirrors:",
        cur
    );
    if (next === null) return;
    portalConfig.pdf_backup_mirror_base = next.trim();
    await savePortalConfigToFirebase();
    showToast("Backup PDF mirror setting saved!", "success");
};

// ==========================================
// 6. RENDER MATERIAL GRID & STATS (TAB 1)
// ==========================================
function renderMaterialGrid() {
    const contentGrid = document.getElementById('content-grid');
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

        const matchesSearch = item.name.toLowerCase().includes(searchQuery);
        const matchesClass = classFilter === "ALL" || item.currentClass === classFilter;

        if (matchesSearch && matchesClass) {
            createMaterialCardHTML(item, contentGrid);
        }
    });

    document.getElementById('statLiveCount').innerText = liveCount;
    document.getElementById('statOfflineCount').innerText = offlineCount;
    document.getElementById('statTotalCount').innerText = totalCount;
}

function getFilteredGithubImages() {
    return allGithubImages.filter(img =>
        activeImageFormatFilter === "ALL" || img.format === activeImageFormatFilter
    );
}

window.syncImageFormatFilter = (fmt) => {
    activeImageFormatFilter = fmt || "ALL";
    const s1 = document.getElementById('imageFormatFilter');
    const s2 = document.getElementById('classImageFormatFilter');
    if (s1) s1.value = activeImageFormatFilter;
    if (s2) s2.value = activeImageFormatFilter;
    populateExamRepoImagePicker();
    renderMaterialGrid();
    renderClassCoversGrid();
};

function createMaterialCardHTML(item, container) {
    const card = document.createElement('div');
    card.className = 'subject-card';

    let optionsHtml = `<option value="" disabled ${!item.isLive ? 'selected' : ''}>-- Assign a Class --</option>`;
    CLASSES.forEach(cls => {
        const selected = (cls === item.currentClass) ? 'selected' : '';
        optionsHtml += `<option value="${cls}" ${selected}>${cls}</option>`;
    });

    const hasValidImg = item.imgUrl && !item.imgUrl.includes('placeholder');
    let imageOptionsHtml = `<option value="" ${!hasValidImg ? 'selected' : ''}>🚫 No Cover Image (Use Default Foxy)</option>`;
    imageOptionsHtml += `<option value="CUSTOM">🔗 -- Paste Custom URL --</option>`;
    
    let imgFound = false;
    getFilteredGithubImages().forEach(img => {
        const isSelected = (item.imgUrl === img.url) ? 'selected' : '';
        if (isSelected) imgFound = true;
        imageOptionsHtml += `<option value="${img.url}" ${isSelected}>[${img.format.toUpperCase()}] ${img.name}</option>`;
    });

    if (hasValidImg && !imgFound) {
        imageOptionsHtml += `<option value="${item.imgUrl}" selected>🔗 Attached Cover Image</option>`;
    }

    const typeTag = (item.pdfUrl && hasValidImg)
        ? `📘 PDF + Cover`
        : item.pdfUrl
            ? `📄 PDF Only`
            : `🖼️ Image Only`;

    const badge = item.isLive 
        ? `<div class="status-badge status-live"><i class='bx bx-broadcast'></i> LIVE • ${item.edition || '2026_v1'}</div>` 
        : `<div class="status-badge status-offline"><i class='bx bx-archive-in'></i> OFFLINE</div>`;

    const displayThumb = hasValidImg
        ? item.imgUrl
        : "https://via.placeholder.com/400x600?text=PDF+Default+Cover";

    const safeName = escapeJs(item.name);
    const safeClass = escapeJs(item.currentClass);
    const safePdf = escapeJs(item.pdfUrl || "");
    const safeImg = escapeJs(displayThumb);

    const actionsHtml = item.isLive
        ? `<button class="btn-offline" onclick="takeMaterialOffline('${safeName}', '${safeClass}')"><i class='bx bx-cloud-download'></i> Offline</button>`
        : `<button class="btn-publish" onclick="publishMaterialLive('${safeName}', '${safePdf}')"><i class='bx bx-cloud-upload'></i> Publish</button>`;

    const previewBtn = `<button class="btn-preview" onclick="previewMaterial('${safeName}', '${safeImg}')" title="Preview App Layout"><i class='bx bx-mobile-alt'></i></button>`;
    const editionBtn = (item.isLive && item.pdfUrl)
        ? `<button class="btn-preview" onclick="upgradeSubjectEdition('${safeName}', '${safeClass}')" title="Upgrade Edition & Archive Old Book" style="color:#FF8F00;"><i class='bx bx-history'></i></button>`
        : '';
    const renameBtn = item.isLive 
        ? `<button class="btn-rename" onclick="openRenameModal('${safeName}', '${safeClass}')" title="Rename Subject Display"><i class='bx bx-edit-alt'></i></button>` 
        : '';

    const onImageChange = item.isLive 
        ? `onchange="updateLiveSubjectImage('${safeName}', '${safeClass}', this.value)"` 
        : `onchange="updateCardImagePreview('${safeName}', this.value)"`;

    card.innerHTML = `
        <div class="card-image-container">
            <img src="${displayThumb}" alt="${item.name}">
            ${badge}
        </div>
        <div class="card-content">
            <div style="font-size:11px; font-weight:700; color:#4318FF; margin-bottom:4px;">${typeTag}</div>
            <div class="card-title-wrapper">
                <div class="card-title">${item.name}</div>
                ${renameBtn}
            </div>
            <select id="select-${item.name}" class="card-select" ${item.isLive ? 'disabled' : ''}>
                ${optionsHtml}
            </select>
            <select id="imgSelect-${item.name}" class="card-select" ${onImageChange}>
                ${imageOptionsHtml}
            </select>
            <div class="card-actions-row">
                ${previewBtn}
                ${editionBtn}
                ${actionsHtml}
            </div>
        </div>
    `;
    container.appendChild(card);
}

// ==========================================
// 7. RENDER CLASS COVERS GRID (TAB 2)
// ==========================================
function renderClassCoversGrid() {
    const classGrid = document.getElementById('class-covers-grid');
    classGrid.innerHTML = '';

    let imageOptionsHtml = `<option value="" disabled selected>-- Select an Image --</option>`;
    imageOptionsHtml += `<option value="CUSTOM">🔗 -- Paste Custom URL --</option>`;
    
    getFilteredGithubImages().forEach(img => {
        imageOptionsHtml += `<option value="${img.url}">[${img.format.toUpperCase()}] ${img.name}</option>`;
    });

    CLASSES.forEach(cls => {
        const isLive = liveClassCovers[cls] !== undefined;
        const imgUrl = isLive ? liveClassCovers[cls] : "https://via.placeholder.com/400x600?text=No+Cover";
        
        const card = document.createElement('div');
        card.className = 'subject-card';

        const badge = isLive 
            ? `<div class="status-badge status-live"><i class='bx bx-broadcast'></i> LIVE</div>` 
            : `<div class="status-badge status-offline"><i class='bx bx-archive-in'></i> NOT SET</div>`;

        const actionsHtml = isLive
            ? `<button class="btn-offline" onclick="removeClassCover('${cls}')"><i class='bx bx-cloud-download'></i> Remove Cover</button>`
            : `<button class="btn-publish" onclick="publishClassCover('${cls}')"><i class='bx bx-cloud-upload'></i> Set Cover</button>`;

        const previewBtn = `<button class="btn-preview" onclick="previewMaterial('${cls}', '${imgUrl}')" title="Preview App Layout"><i class='bx bx-mobile-alt'></i></button>`;

        card.innerHTML = `
            <div class="card-image-container">
                <img src="${imgUrl}" alt="${cls}">
                ${badge}
            </div>
            <div class="card-content">
                <div class="card-title-wrapper" style="margin-bottom:8px;">
                    <div class="card-title">${cls}</div>
                </div>
                <select id="coverSelect-${cls}" class="card-select" ${isLive ? 'disabled' : ''}>
                    ${imageOptionsHtml}
                </select>
                <div class="card-actions-row">
                    ${previewBtn}
                    ${actionsHtml}
                </div>
            </div>
        `;
        classGrid.appendChild(card);
    });
}

// ==========================================
// 8. IMAGE CROP STUDIO LOGIC
// ==========================================
window.openCropModal = () => {
    document.getElementById('cropModal').classList.remove('hidden');
};

window.closeCropModal = () => {
    document.getElementById('cropModal').classList.add('hidden');
    if(window.currentCropper) {
        window.currentCropper.destroy();
        window.currentCropper = null;
    }
    document.getElementById('cropFileInput').value = "";
    document.getElementById('cropImageTarget').style.display = "none";
    document.getElementById('cropPlaceholderText').style.display = "block";
    document.getElementById('btnDownloadCrop').disabled = true;
};

document.getElementById('cropFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = document.getElementById('cropImageTarget');
        img.src = event.target.result;
        img.style.display = "block";
        document.getElementById('cropPlaceholderText').style.display = "none";
        document.getElementById('btnDownloadCrop').disabled = false;

        if(window.currentCropper) {
            window.currentCropper.destroy();
        }
        
        window.currentCropper = new Cropper(img, {
            aspectRatio: 2 / 3,
            viewMode: 1,
            autoCropArea: 1
        });
    };
    reader.readAsDataURL(file);
});

window.downloadCroppedImage = () => {
    if(!window.currentCropper) return;
    const mime = document.getElementById('cropExportFormat')?.value || 'image/webp';
    const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp';
    const canvas = window.currentCropper.getCroppedCanvas({ width: 600, height: 900 });
    
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cropped_cover_image.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast(`Cropped as .${ext}! Upload this new file to GitHub.`, "success");
        closeCropModal();
    }, mime, 0.9);
};

// ==========================================
// 9. ACTIONS: RENAME / PREVIEW / LIVE UPDATE MODALS
// ==========================================
window.openRenameModal = (oldName, className) => {
    document.getElementById('renameOldName').value = oldName;
    document.getElementById('renameClass').value = className;
    document.getElementById('renameInput').value = oldName;
    document.getElementById('renameModal').classList.remove('hidden');
};

window.closeRenameModal = () => {
    document.getElementById('renameModal').classList.add('hidden');
};

window.confirmRename = async () => {
    const oldName = document.getElementById('renameOldName').value;
    const className = document.getElementById('renameClass').value;
    const newName = document.getElementById('renameInput').value.trim();

    if (!newName || newName === oldName) {
        closeRenameModal();
        return;
    }

    try {
        const material = globalMergedData[oldName];
        const docRef = doc(db, "Curriculum", className);

        await updateDoc(docRef, {
            subjects: arrayUnion(newName),
            [`pdf_links.${newName}`]: material.pdfUrl || "",
            [`image_links.${newName}`]: material.imgUrl || "",
            [`book_editions.${newName}`]: material.edition || "2026_v1"
        });

        await updateDoc(docRef, {
            subjects: arrayRemove(oldName),
            [`pdf_links.${oldName}`]: deleteField(),
            [`image_links.${oldName}`]: deleteField(),
            [`book_editions.${oldName}`]: deleteField()
        });

        showToast(`Renamed to "${newName}"! App will update instantly.`, "success");
        closeRenameModal();
        loadDashboard(); 
    } catch (e) {
        showToast("Failed to rename subject.", "error");
    }
};

window.previewMaterial = (title, imgUrl) => {
    document.getElementById('previewTitle').innerText = title;
    document.getElementById('previewImage').src = imgUrl;
    document.getElementById('previewModal').classList.remove('hidden');
};

window.closePreviewModal = () => {
    document.getElementById('previewModal').classList.add('hidden');
};

window.updateCardImagePreview = (subjectName, imgUrl) => {
    if (imgUrl === "CUSTOM") {
        imgUrl = prompt(`Paste the custom image URL for ${subjectName}:`);
        if (!imgUrl || (!imgUrl.startsWith("http") && !imgUrl.startsWith("https"))) {
            showToast("Invalid URL provided. Must start with http/https.", "error");
            document.getElementById(`imgSelect-${subjectName}`).value = ""; 
            return;
        }
        
        const select = document.getElementById(`imgSelect-${subjectName}`);
        const opt = document.createElement('option');
        opt.value = imgUrl;
        opt.text = "🔗 Custom Link Attached";
        opt.selected = true;
        select.appendChild(opt);
    }
    
    const card = document.getElementById(`imgSelect-${subjectName}`).closest('.subject-card');
    const img = card.querySelector('.card-image-container img');
    if(img) img.src = imgUrl;
    
    const previewBtn = card.querySelector('.btn-preview');
    if(previewBtn) {
        previewBtn.setAttribute('onclick', `previewMaterial('${subjectName}', '${imgUrl}')`);
    }
};

window.updateLiveSubjectImage = async (subjectName, className, imgUrl) => {
    if (imgUrl === "CUSTOM") {
        imgUrl = prompt(`Paste the custom image URL for ${subjectName}:`);
        if (!imgUrl || (!imgUrl.startsWith("http") && !imgUrl.startsWith("https"))) {
            showToast("Invalid URL provided. Must start with http/https.", "error");
            loadDashboard();
            return;
        }
    }

    try {
        const docRef = doc(db, "Curriculum", className);
        await updateDoc(docRef, {
            [`image_links.${subjectName}`]: imgUrl
        });
        showToast(`Cover updated for "${subjectName}"!`, "success");
        loadDashboard(); 
    } catch (e) {
        showToast("Failed to update cover.", "error");
    }
};

// ==========================================
// 10. ACTIONS: PUBLISH / OFFLINE
// ==========================================
window.publishMaterialLive = async (subjectName, pdfUrl) => {
    const classSelect = document.getElementById(`select-${subjectName}`);
    const imgSelect = document.getElementById(`imgSelect-${subjectName}`);
    const selectedClass = classSelect.value;
    const imgUrl = imgSelect ? imgSelect.value : "";

    if (!selectedClass) {
        showToast("Select a class before publishing!", "error");
        return;
    }
    if (imgUrl === "CUSTOM") {
        showToast("Please provide a valid Custom URL first.", "error");
        return;
    }
    const finalPdf = pdfUrl || "";
    const finalImg = imgUrl || "";
    if (!finalPdf && !finalImg) {
        showToast("Attach at least a PDF or a Cover Image!", "error");
        return;
    }

    try {
        const docRef = doc(db, "Curriculum", selectedClass);
        await updateDoc(docRef, {
            subjects: arrayUnion(subjectName),
            [`pdf_links.${subjectName}`]: finalPdf,
            [`image_links.${subjectName}`]: finalImg,
            [`book_editions.${subjectName}`]: "2026_v1"
        }).catch(async (e) => {
            if (e.code === 'not-found') {
                await setDoc(docRef, {
                    subjects: [subjectName],
                    pdf_links: { [subjectName]: finalPdf },
                    image_links: { [subjectName]: finalImg },
                    book_editions: { [subjectName]: "2026_v1" }
                });
            } else throw e;
        });
        
        showToast(`"${subjectName}" is now live!`, "success");
        loadDashboard(); 
    } catch (e) {
        showToast("Publish failed. Check permissions.", "error");
    }
};

window.takeMaterialOffline = async (subjectName, currentClass) => {
    if (confirm(`Remove "${subjectName}" from the app?`)) {
        try {
            await updateDoc(doc(db, "Curriculum", currentClass), {
                subjects: arrayRemove(subjectName),
                [`pdf_links.${subjectName}`]: deleteField(),
                [`image_links.${subjectName}`]: deleteField(),
                [`book_editions.${subjectName}`]: deleteField()
            });
            showToast(`"${subjectName}" taken offline.`, "error");
            loadDashboard(); 
        } catch (e) {
            showToast("Failed to take offline.", "error");
        }
    }
};

window.publishClassCover = async (className) => {
    const selectBox = document.getElementById(`coverSelect-${className}`);
    let imgUrl = selectBox.value;

    if(!imgUrl) {
        showToast("Please select an image or choose Custom URL.", "error");
        return;
    }

    if (imgUrl === "CUSTOM") {
        imgUrl = prompt(`Paste the custom image URL for ${className}:`);
        if (!imgUrl || (!imgUrl.startsWith("http") && !imgUrl.startsWith("https"))) {
            showToast("Invalid URL provided. Must start with http/https.", "error");
            return;
        }
    }

    try {
        await setDoc(doc(db, "Admin", "ClassCovers"), {
            [className]: imgUrl
        }, { merge: true });
        
        showToast(`${className} cover updated!`, "success");
        loadDashboard();
    } catch (e) {
        showToast("Failed to set class cover.", "error");
    }
};

window.removeClassCover = async (className) => {
    if(confirm(`Remove the cover image for ${className}? It will turn grey in the app.`)) {
        try {
            await updateDoc(doc(db, "Admin", "ClassCovers"), {
                [className]: deleteField()
            });
            showToast(`Cover removed for ${className}.`, "error");
            loadDashboard();
        } catch (e) {
            showToast("Failed to remove cover.", "error");
        }
    }
};

// ==========================================
// 11. TOAST NOTIFICATION SYSTEM
// ==========================================
function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? "<i class='bx bxs-check-circle'></i>" : "<i class='bx bxs-error-circle'></i>";
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400); 
    }, 4000);
}

// ==========================================
// 12. MOVE AI CHUNKS FROM FIREBASE TO GITHUB (DOWNLOAD & DELETE)
// ==========================================
window.moveFirebaseAiChunksToPc = async () => {
    try {
        const snap = await getDocs(collection(db, "AiPendingChunks"));
        if (snap.empty) {
            showToast("No pending AI chunks in Firebase right now!", "error");
            return;
        }

        // 1. Fetch existing chunk paths on GitHub to prevent 'file already exists' surprises!
        const existingPaths = new Set();
        try {
            const treeRes = await fetch("https://api.github.com/repos/ExcellentInstitute/olearning-ai-chunks/git/trees/main?recursive=1");
            if (treeRes.ok) {
                const treeJson = await treeRes.json();
                (treeJson.tree || []).forEach(node => {
                    if (node.path && node.path.startsWith("chunks/")) existingPaths.add(node.path);
                });
            }
        } catch (_) {}

        let newCount = 0;
        let mergedCount = 0;
        let dislikedCount = 0;
        const reportLines = [];
        const zip = new window.JSZip();

        for (const docSnap of snap.docs) {
            const raw = docSnap.data();
            if (raw.needs_improvement === true) dislikedCount++;

            const editionTag = raw.edition || "2026_v1";
            const classFolder = raw.class_folder || "class_general";
            const bookId = raw.book_id || docSnap.id;
            const pageNum = Number(raw.page_number || 1);
            const paddedPage = `p${String(pageNum).padStart(3, "0")}.json`;
            const targetPath = raw.github_target_path || `chunks/${editionTag}/${classFolder}/${bookId}/${paddedPage}`;

            // Strip internal Firebase-only tracking fields before writing clean GitHub JSON
            const cleanChunk = {
                chunk_id: raw.chunk_id || `${editionTag}__${classFolder}__${bookId}__p${String(pageNum).padStart(3, "0")}`,
                edition: editionTag,
                schema_version: 3,
                class_folder: classFolder,
                book_id: bookId,
                subject_name: raw.subject_name || "",
                page_number: pageNum,
                page_summary: raw.page_summary || "",
                updated_at: raw.updated_at || Date.now()
            };
            ["qna", "story", "words", "narrate"].forEach(k => {
                if (raw[k] && String(raw[k]).trim()) cleanChunk[k] = raw[k];
            });
            if (raw.keywords && typeof raw.keywords === "object" && Object.keys(raw.keywords).length > 0) {
                cleanChunk.keywords = raw.keywords;
            }

            // If file already exists on GitHub, fetch & deep-merge so existing modes/keywords are preserved!
            if (existingPaths.has(targetPath)) {
                try {
                    const oldRes = await fetch(`https://raw.githubusercontent.com/ExcellentInstitute/olearning-ai-chunks/main/${targetPath}`);
                    if (oldRes.ok) {
                        const oldJson = await oldRes.json();
                        ["qna", "story", "words", "narrate"].forEach(k => {
                            if (!cleanChunk[k] && oldJson[k]) cleanChunk[k] = oldJson[k];
                        });
                        if (oldJson.keywords || cleanChunk.keywords) {
                            cleanChunk.keywords = { ...(oldJson.keywords || {}), ...(cleanChunk.keywords || {}) };
                        }
                    }
                } catch (_) {}
                zip.file(`MERGE_REPLACE/${targetPath}`, JSON.stringify(cleanChunk, null, 2));
                reportLines.push(`[MERGED EXISTING] ${targetPath}`);
                mergedCount++;
            } else {
                zip.file(`NEW_UPLOAD/${targetPath}`, JSON.stringify(cleanChunk, null, 2));
                reportLines.push(`[NEW FILE]        ${targetPath}`);
                newCount++;
            }
        }

        zip.file("UPLOAD_GUIDE.txt",
            `Excellent Institute AI Chunks Export (${new Date().toISOString()})\n` +
            `New Files: ${newCount} | Merged Existing Files: ${mergedCount} | Flagged Disliked: ${dislikedCount}\n\n` +
            `HOW TO UPLOAD WITHOUT CONFLICTS:\n` +
            `1. NEW_UPLOAD/chunks/... -> Drag & drop directly into your GitHub repo (zero conflicts!).\n` +
            `2. MERGE_REPLACE/chunks/... -> Already merged with old GitHub content; replace existing files via GitHub Desktop or git push.\n\n` +
            reportLines.join("\n")
        );

        const summaryMsg = `Found ${snap.size} chunk(s): ${newCount} Brand New, ${mergedCount} Merged Updates` +
            (dislikedCount > 0 ? `, ⚠️ ${dislikedCount} flagged 👎` : "") +
            `\n\nDownload clean ZIP now?`;
        if (!confirm(summaryMsg)) return;

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chunks_clean_export_${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);

        setTimeout(async () => {
            if (confirm(`Did the ZIP download cleanly?\nClick OK to DELETE these ${snap.size} exported doc(s) from Firestore.`)) {
                for (const docSnap of snap.docs) {
                    await deleteDoc(doc(db, "AiPendingChunks", docSnap.id));
                }
                showToast(`Cleared ${snap.size} chunk(s) from Firestore!`, "success");
            }
        }, 1200);
    } catch (e) {
        console.error(e);
        showToast("Error exporting AI chunks ZIP.", "error");
    }
};

// ==========================================
// 13. CLOUDFLARE WORKER PUSH NOTIFICATIONS (REGULATED)
// ==========================================
function getIstHourNow() {
    const now = new Date();
    const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes();
    const istMins = (utcMins + 330) % 1440;
    return Math.floor(istMins / 60);
}

function updateQuietHoursIndicator() {
    const badge = document.getElementById("quietHoursBadge");
    if (!badge) return;
    const h = getIstHourNow();
    if (h >= 21 || h < 7) {
        badge.innerText = "🌙 Quiet Hours (9 PM–7 AM IST)";
        badge.style.background = "#FDE8E7";
        badge.style.color = "#EE5D50";
    } else {
        badge.innerText = "✅ Active Window (7 AM–9 PM IST)";
        badge.style.background = "#E6FBF5";
        badge.style.color = "#05CD99";
    }
}

function getAdminPushSecret() {
    let sec = sessionStorage.getItem("admin_push_secret") || "";
    if (!sec) {
        sec = prompt("Enter your Cloudflare Worker ADMIN_PUSH_SECRET (kept only for this browser tab):") || "";
        if (sec.trim()) sessionStorage.setItem("admin_push_secret", sec.trim());
    }
    return sec.trim();
}

window.resetAdminPushSecret = () => {
    sessionStorage.removeItem("admin_push_secret");
    const next = getAdminPushSecret();
    if (next) showToast("Cloudflare Push Secret saved for this session!", "success");
};

async function triggerCloudflarePush({ title, body, topic = "all_students", type = "notice", targetId = "", forceBypassQuietHours = false }) {
    // Regulation: Warn admin if sending more than 5 pushes in one day to prevent student fatigue
    const today = new Date().toISOString().slice(0, 10);
    const sentKey = `push_count_${today}`;
    const sentToday = Number(localStorage.getItem(sentKey) || "0");
    if (sentToday >= 5 && !confirm(`⚠️ You already sent ${sentToday} notifications today. Send another one anyway?`)) {
        return false;
    }

    const secret = getAdminPushSecret();
    if (!secret) {
        showToast("Push cancelled (no secret entered).", "error");
        return false;
    }

    try {
        const res = await fetch(WORKER_NOTIFY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Admin-Secret": secret
            },
            body: JSON.stringify({ title, body, topic, type, targetId, forceBypassQuietHours })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            if (res.status === 401) sessionStorage.removeItem("admin_push_secret");
            showToast(err.error || `Push failed (HTTP ${res.status}).`, "error");
            return false;
        }
        localStorage.setItem(sentKey, String(sentToday + 1));
        return true;
    } catch (e) {
        console.error(e);
        showToast("Network error contacting Cloudflare Worker.", "error");
        return false;
    }
}

window.sendManualNoticeAndPush = async () => {
    const title = document.getElementById("pushTitleInput").value.trim();
    const body = document.getElementById("pushBodyInput").value.trim();
    const topic = document.getElementById("pushTopicSelect").value;
    if (!title || !body) {
        showToast("Enter both notification title and message!", "error");
        return;
    }

    // 1. Update Side Drawer Notice Board (sidebar_items[0]) in Firestore
    if (!Array.isArray(portalConfig.sidebar_items) || portalConfig.sidebar_items.length === 0) {
        portalConfig.sidebar_items = [{ title: "📢 ସୂଚନା ଫଳକ (Notice Board)", target: "" }];
    }
    const oldNotice = portalConfig.sidebar_items[0]?.target || "";
    const stamp = new Date().toLocaleDateString("en-IN");
    portalConfig.sidebar_items[0] = {
        title: portalConfig.sidebar_items[0]?.title || "📢 ସୂଚନା ଫଳକ (Notice Board)",
        target: `📌 ${title} (${stamp})\n${body}\n\n${oldNotice}`.slice(0, 2800)
    };
    await savePortalConfigToFirebase();

    // 2. Push to locked student phones via Cloudflare Worker -> FCM
    const ok = await triggerCloudflarePush({ title, body, topic, type: "notice" });
    if (ok) {
        document.getElementById("pushTitleInput").value = "";
        document.getElementById("pushBodyInput").value = "";
        showToast("Notice Board updated & Push Notification sent!", "success");
    }
};

// ==========================================
// 14. CLASS-WISE EXAM PAPER PUBLISHER & MANAGER
// ==========================================
function populateExamRepoImagePicker() {
    const sel = document.getElementById("examRepoImgPicker");
    if (!sel) return;
    sel.innerHTML = `<option value="">-- Quick Add Image from GitHub Repo --</option>`;
    getFilteredGithubImages().forEach(img => {
        const opt = document.createElement("option");
        opt.value = img.url;
        opt.textContent = `[${img.format.toUpperCase()}] ${img.name}`;
        sel.appendChild(opt);
    });
}

window.insertGithubImgToExam = () => {
    const sel = document.getElementById("examRepoImgPicker");
    const box = document.getElementById("examImagesInput");
    if (!sel || !box || !sel.value) return;
    box.value = box.value.trim() ? `${box.value.trim()}\n${sel.value}` : sel.value;
    sel.value = "";
};

window.toggleExamFormatInputs = () => {
    const fmt = document.getElementById("examFormatSelect").value;
    document.getElementById("examRichTextWrap").classList.toggle("hidden", fmt !== "richtext");
    document.getElementById("examImagesWrap").classList.toggle("hidden", fmt !== "images");
    document.getElementById("examHtmlUrlInput").classList.toggle("hidden", fmt !== "html");
};

window.formatExamText = (cmd) => {
    document.getElementById("examRichEditor")?.focus();
    document.execCommand(cmd, false, null);
};

window.insertExamEmoji = (emoji) => {
    document.getElementById("examRichEditor")?.focus();
    document.execCommand("insertText", false, emoji);
};

function renderAdminExamPapersList() {
    const el = document.getElementById("adminExamPapersList");
    if (!el) return;
    el.innerHTML = "";
    if (!publishedExamPapers.length) {
        el.innerHTML = `<div style="font-size:12px; color:#94A3B8;">No exam papers published yet.</div>`;
        return;
    }
    publishedExamPapers.forEach(p => {
        const icon = p.format === "images" ? "🖼️" : p.format === "html" ? "🌐" : "📝";
        const row = document.createElement("div");
        row.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:#F4F7FE; padding:8px 10px; border-radius:10px; gap:8px;";
        row.innerHTML = `
            <div style="flex:1; min-width:0;">
                <div style="font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${icon} ${p.title || 'Exam'}</div>
                <div style="font-size:10px; color:#64748B;">${p.target_class || 'ALL'} • ${(p.subjects || []).join(", ") || "All Subjects"} ${p.exam_date ? "• " + p.exam_date : ""}</div>
            </div>
            <button onclick="deleteExamPaper('${escapeJs(p.id)}')" style="background:#FDE8E7; color:#EE5D50; padding:6px 8px; border-radius:8px; font-size:12px;">🗑️</button>
        `;
        el.appendChild(row);
    });
}

window.publishExamPaper = async () => {
    const title = document.getElementById("examTitleInput").value.trim();
    const examDate = document.getElementById("examDateInput").value.trim();
    const targetClass = document.getElementById("examClassSelect").value;
    const format = document.getElementById("examFormatSelect").value;
    const subjects = document.getElementById("examSubjectsInput").value.split(",").map(s => s.trim()).filter(Boolean);

    if (!title) {
        showToast("Enter an Exam Title!", "error");
        return;
    }

    const richHtml = format === "richtext" ? document.getElementById("examRichEditor").innerHTML.trim() : "";
    const imageUrls = format === "images"
        ? document.getElementById("examImagesInput").value.split("\n").map(u => u.trim()).filter(Boolean)
        : [];
    const webpageUrl = format === "html" ? document.getElementById("examHtmlUrlInput").value.trim() : "";

    if (format === "richtext" && !richHtml) return showToast("Type the exam paper content first!", "error");
    if (format === "images" && imageUrls.length === 0) return showToast("Add at least 1 question image URL!", "error");
    if (format === "html" && !webpageUrl.startsWith("https://")) return showToast("Enter a valid https:// HTML webpage URL!", "error");

    const docId = `exam_${Date.now()}`;
    const paperData = {
        title,
        exam_date: examDate,
        target_class: targetClass,
        subjects,
        format,
        rich_html: richHtml,
        image_urls: imageUrls,
        webpage_url: webpageUrl,
        created_at: Date.now()
    };

    try {
        await setDoc(doc(db, "ExamPapers", docId), paperData);
        publishedExamPapers.unshift({ id: docId, ...paperData });
        renderAdminExamPapersList();

        document.getElementById("examTitleInput").value = "";
        document.getElementById("examDateInput").value = "";
        document.getElementById("examSubjectsInput").value = "";
        document.getElementById("examRichEditor").innerHTML = "";
        document.getElementById("examImagesInput").value = "";
        document.getElementById("examHtmlUrlInput").value = "";
        showToast(`Exam Paper "${title}" is live in the App!`, "success");

        if (document.getElementById("chkPushExamAlert").checked) {
            const topicMap = {
                "ପ୍ରଥମ ଶ୍ରେଣୀ": "class_1", "ଦ୍ୱିତୀୟ ଶ୍ରେଣୀ": "class_2", "ତୃତୀୟ ଶ୍ରେଣୀ": "class_3",
                "ଚତୁର୍ଥ ଶ୍ରେଣୀ": "class_4", "ପଞ୍ଚମ ଶ୍ରେଣୀ": "class_5", "ଷଷ୍ଠ ଶ୍ରେଣୀ": "class_6",
                "ସପ୍ତମ ଶ୍ରେଣୀ": "class_7", "ଅଷ୍ଟମ ଶ୍ରେଣୀ": "class_8", "ନବମ ଶ୍ରେଣୀ": "class_9", "ଦଶମ ଶ୍ରେଣୀ": "class_10"
            };
            await triggerCloudflarePush({
                title: `📅 New Exam: ${title}`,
                body: `${subjects.join(", ") || "All Subjects"}${examDate ? " • " + examDate : ""}`,
                topic: topicMap[targetClass] || "all_students",
                type: "exam",
                targetId: docId
            });
        }
    } catch (e) {
        console.error(e);
        showToast("Failed to publish exam paper.", "error");
    }
};

window.deleteExamPaper = async (docId) => {
    if (!confirm("Delete this exam paper from the app?")) return;
    try {
        await deleteDoc(doc(db, "ExamPapers", docId));
        publishedExamPapers = publishedExamPapers.filter(p => p.id !== docId);
        renderAdminExamPapersList();
        showToast("Exam paper deleted.", "error");
    } catch (e) {
        showToast("Failed to delete exam paper.", "error");
    }
};

// ==========================================
// 15. STANDALONE PDF/IMAGE-ONLY PUBLISHER & EDITION UPGRADER
// ==========================================
window.publishCustomStandaloneMaterial = async () => {
    const subjectName = prompt("1. Subject / Card Display Name (e.g., ଗଣିତ or Time Table Chart):");
    if (!subjectName || !subjectName.trim()) return;

    const classIndexStr = prompt(
        "2. Enter Class Number (1 to 10):\n" + CLASSES.map((c, i) => `${i + 1} = ${c}`).join("\n"),
        "1"
    );
    const idx = parseInt(classIndexStr || "", 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= CLASSES.length) {
        showToast("Invalid class number (must be 1 to 10).", "error");
        return;
    }
    const selectedClass = CLASSES[idx];

    const pdfUrl = (prompt("3. PDF URL (leave BLANK if publishing Image-Only card):", "") || "").trim();
    const imgUrl = (prompt("4. Cover / Standalone Image URL (.webp/.png/.jpg — leave BLANK if publishing PDF-Only):", "") || "").trim();

    if (!pdfUrl && !imgUrl) {
        showToast("Provide at least a PDF URL or an Image URL!", "error");
        return;
    }

    try {
        const cleanName = subjectName.trim();
        const docRef = doc(db, "Curriculum", selectedClass);
        await updateDoc(docRef, {
            subjects: arrayUnion(cleanName),
            [`pdf_links.${cleanName}`]: pdfUrl,
            [`image_links.${cleanName}`]: imgUrl,
            [`book_editions.${cleanName}`]: "2026_v1"
        }).catch(async (e) => {
            if (e.code === 'not-found') {
                await setDoc(docRef, {
                    subjects: [cleanName],
                    pdf_links: { [cleanName]: pdfUrl },
                    image_links: { [cleanName]: imgUrl },
                    book_editions: { [cleanName]: "2026_v1" }
                });
            } else throw e;
        });
        showToast(`Published "${cleanName}" to ${selectedClass}!`, "success");
        loadDashboard();
    } catch (e) {
        console.error(e);
        showToast("Failed to publish material.", "error");
    }
};

window.upgradeSubjectEdition = async (subjectName, className) => {
    const item = globalMergedData[subjectName];
    if (!item) return;

    const newPdfUrl = prompt(
        `Upgrade "${subjectName}" (${className})\nCurrent Edition: ${item.edition || "2026_v1"}\n\n1. Paste the NEW Edition PDF URL:`,
        item.pdfUrl
    );
    if (!newPdfUrl || !newPdfUrl.trim()) return;

    const newEdition = prompt("2. New Edition Tag (e.g., 2027_v1):", "2027_v1");
    if (!newEdition || !newEdition.trim()) return;

    try {
        const docRef = doc(db, "Curriculum", className);
        await updateDoc(docRef, {
            archived_books: arrayUnion({
                name: subjectName,
                edition: item.edition || "2026_v1",
                pdf_url: item.pdfUrl,
                cover_url: item.imgUrl || ""
            }),
            [`pdf_links.${subjectName}`]: newPdfUrl.trim(),
            [`book_editions.${subjectName}`]: newEdition.trim()
        });
        showToast(`"${subjectName}" upgraded to ${newEdition.trim()} & old edition archived!`, "success");
        loadDashboard();
    } catch (e) {
        console.error(e);
        showToast("Failed to upgrade book edition.", "error");
    }
};
