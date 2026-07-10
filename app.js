// Import the Firebase SDKs directly from Google's CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, updateDoc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 1. YOUR FIREBASE CONFIGURATION
// You need to replace this block with your actual config from the Firebase Console
const firebaseConfig = {
    apiKey: "REPLACE_WITH_YOUR_API_KEY",
    authDomain: "odia-learning-platform-d4a8e.firebaseapp.com",
    projectId: "odia-learning-platform-d4a8e",
    storageBucket: "odia-learning-platform-d4a8e.appspot.com",
    messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
    appId: "REPLACE_WITH_YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. UI ELEMENTS
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const passInput = document.getElementById('passInput');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');

// 3. SECURE LOGIN LOGIC
// Note: This is a front-end gate to stop casual visitors. 
const ADMIN_PASSCODE = "Excellent2026"; 

loginBtn.addEventListener('click', () => {
    if (passInput.value === ADMIN_PASSCODE) {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        passInput.value = '';
        loginError.innerText = '';
    } else {
        loginError.innerText = "Incorrect passcode. Access denied.";
    }
});

logoutBtn.addEventListener('click', () => {
    dashboardSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
});

// 4. DATABASE UPLOAD LOGIC
uploadBtn.addEventListener('click', async () => {
    // Grab the values from the form
    const className = document.getElementById('classSelect').value;
    const subjectName = document.getElementById('subjectName').value.trim();
    const imageUrl = document.getElementById('imageUrl').value.trim();
    const htmlUrl = document.getElementById('htmlUrl').value.trim();

    // Validation Check
    if (!subjectName || !imageUrl || !htmlUrl) {
        uploadStatus.style.color = "var(--error)";
        uploadStatus.innerText = "Error: All fields must be filled out.";
        return;
    }

    uploadBtn.innerText = "⏳ Publishing...";
    uploadBtn.disabled = true;

    try {
        const classDocRef = doc(db, "Curriculum", className);

        // We prepare the specific map updates dynamically using bracket notation
        const pdfLinkUpdate = `pdf_links.${subjectName}`;
        const imageLinkUpdate = `image_links.${subjectName}`;

        // Push the update to Firebase
        await updateDoc(classDocRef, {
            subjects: arrayUnion(subjectName),
            [pdfLinkUpdate]: htmlUrl,
            [imageLinkUpdate]: imageUrl
        });

        // Success Reset
        uploadStatus.style.color = "var(--success)";
        uploadStatus.innerText = `✅ Success! "${subjectName}" is now live on all devices.`;
        
        // Clear the form for the next upload
        document.getElementById('subjectName').value = '';
        document.getElementById('imageUrl').value = '';
        document.getElementById('htmlUrl').value = '';

    } catch (error) {
        // If the document doesn't exist yet, we create it from scratch
        if (error.code === 'not-found') {
            try {
                const classDocRef = doc(db, "Curriculum", className);
                await setDoc(classDocRef, {
                    subjects: [subjectName],
                    pdf_links: { [subjectName]: htmlUrl },
                    image_links: { [subjectName]: imageUrl }
                });
                uploadStatus.style.color = "var(--success)";
                uploadStatus.innerText = `✅ Success! Created new class folder and published "${subjectName}".`;
            } catch (creationError) {
                uploadStatus.style.color = "var(--error)";
                uploadStatus.innerText = "Network Error: Could not connect to database.";
            }
        } else {
            uploadStatus.style.color = "var(--error)";
            uploadStatus.innerText = `Error: ${error.message}`;
        }
    } finally {
        uploadBtn.innerText = "🚀 Publish Live";
        uploadBtn.disabled = false;
    }
});
