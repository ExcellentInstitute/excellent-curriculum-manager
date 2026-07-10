// 1. FIREBASE IMPORTS (Notice we added arrayRemove and deleteField for the Offline button)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, updateDoc, setDoc, arrayUnion, arrayRemove, deleteField, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. YOUR CONFIGURATIONS
const firebaseConfig = {
  apiKey: "AIzaSyDOX3ciualcuFxI5wt8Z14Zv3g_sjWUOGI",
  authDomain: "odia-learning-platform-d4a8e.firebaseapp.com",
  projectId: "odia-learning-platform-d4a8e",
  storageBucket: "odia-learning-platform-d4a8e.firebasestorage.app",
  messagingSenderId: "961301102290",
  appId: "1:961301102290:web:e638784217b07582e0770b",
  measurementId: "G-R0RRLPMQ1P"
};

// Your exact GitHub details for the auto-scanner
const GITHUB_OWNER = "ExcellentInstitute"; 
const GITHUB_REPO = "excellent-curriculum-manager"; 

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3. UI ELEMENTS
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const passInput = document.getElementById('passInput');
const loginError = document.getElementById('loginError');
const uploadStatus = document.getElementById('uploadStatus');

// 4. SECURE FIREBASE LOGIN
document.getElementById('loginBtn').addEventListener('click', async () => {
    const enteredPass = passInput.value.trim();
    if (!enteredPass) return;

    try {
        const securityDocRef = doc(db, "Admin", "Settings");
        const securityDoc = await getDoc(securityDocRef);

        if (securityDoc.exists() && securityDoc.data().passcode === enteredPass) {
            loginSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            scanGitHubRepository(); // Trigger the scanner once logged in!
        } else {
            loginError.innerText = "Incorrect passcode.";
        }
    } catch (error) {
        loginError.innerText = "Database error. Check config.";
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    dashboardSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
});

// 5. GITHUB AUTO-SCANNER
async function scanGitHubRepository() {
    const imageSelect = document.getElementById('imageSelect');
    const materialSelect = document.getElementById('materialSelect');
    
    imageSelect.innerHTML = '<option value="">Select an image...</option>';
    materialSelect.innerHTML = '<option value="">Select a material file...</option>';

    try {
        // Ping the GitHub API to see what's in the materials folder
        const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/materials`);
        const files = await response.json();

        files.forEach(file => {
            // Generate the live GitHub Pages link for this file
            const liveLink = `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/${file.path}`;
            const optionHTML = `<option value="${liveLink}">${file.name}</option>`;

            // Sort files into the right dropdowns based on extension
            if (file.name.endsWith('.jpg') || file.name.endsWith('.png') || file.name.endsWith('.jpeg')) {
                imageSelect.innerHTML += optionHTML;
            } else if (file.name.endsWith('.pdf') || file.name.endsWith('.html')) {
                materialSelect.innerHTML += optionHTML;
            }
        });
    } catch (error) {
        uploadStatus.innerText = "Failed to scan GitHub repository.";
    }
}

// 6. PUBLISH LIVE LOGIC
document.getElementById('uploadBtn').addEventListener('click', async () => {
    const className = document.getElementById('classSelect').value;
    const subjectName = document.getElementById('subjectName').value.trim();
    const imageUrl = document.getElementById('imageSelect').value;
    const materialUrl = document.getElementById('materialSelect').value;

    if (!subjectName || !imageUrl || !materialUrl) {
        uploadStatus.innerText = "Error: Select subject, image, and material.";
        return;
    }

    try {
        const classDocRef = doc(db, "Curriculum", className);
        await updateDoc(classDocRef, {
            subjects: arrayUnion(subjectName),
            [`pdf_links.${subjectName}`]: materialUrl,
            [`image_links.${subjectName}`]: imageUrl
        });
        uploadStatus.style.color = "var(--success)";
        uploadStatus.innerText = `✅ "${subjectName}" is LIVE on all devices.`;
    } catch (error) {
        uploadStatus.style.color = "var(--error)";
        uploadStatus.innerText = "Failed to publish. Check database rules.";
    }
});

// 7. TAKE OFFLINE LOGIC
document.getElementById('offlineBtn').addEventListener('click', async () => {
    const className = document.getElementById('classSelect').value;
    const subjectName = document.getElementById('subjectName').value.trim();

    if (!subjectName) {
        uploadStatus.innerText = "Type the Subject Name you want to take offline.";
        return;
    }

    if(confirm(`Are you sure you want to remove ${subjectName} from the app?`)) {
        try {
            const classDocRef = doc(db, "Curriculum", className);
            // Remove the subject from the array, and delete its links from the maps
            await updateDoc(classDocRef, {
                subjects: arrayRemove(subjectName),
                [`pdf_links.${subjectName}`]: deleteField(),
                [`image_links.${subjectName}`]: deleteField()
            });
            uploadStatus.style.color = "var(--error)";
            uploadStatus.innerText = `🛑 "${subjectName}" has been taken OFFLINE.`;
        } catch (error) {
            uploadStatus.innerText = "Failed to take offline.";
        }
    }
});
