import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, updateProfile, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, where, doc, setDoc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// TODO: Replace with your app's actual Firebase project configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCYhE8Iw3KIRwqRmtAkVSE4zGG_8yxYn4M",
  authDomain: "studybook-15297.firebaseapp.com",
  projectId: "studybook-15297",
  storageBucket: "studybook-15297.firebasestorage.app",
  messagingSenderId: "765823309336",
  appId: "1:765823309336:web:1110e756610c3495d6156d",
  measurementId: "G-JCFQV07N25"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

let isInitialAuthCheck = true;
// Check if user is already logged in
onAuthStateChanged(auth, async (user) => {
    if (user) {
        localStorage.setItem('userUid', user.uid);
        
        // Temporarily set name for immediate UI feedback
        if (!localStorage.getItem('userName')) {
            localStorage.setItem('userName', user.displayName || user.email.split('@')[0]);
        }
        
        // Immediately update UI with whatever we have in local storage
        if (window.updateProfileUI) window.updateProfileUI();

        if (isInitialAuthCheck && window.location.pathname.includes('login.html')) {
            window.location.href = 'index.html';
        }
        
        // Fetch latest name from Firestore to ensure it's completely synced with the Account page
        try {
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            if (userDocSnap.exists() && userDocSnap.data().name) {
                localStorage.setItem('userName', userDocSnap.data().name);
                if (window.updateProfileUI) window.updateProfileUI(); // Refresh UI with synced name
            }
        } catch (error) {
            console.error("Error fetching synced user data:", error);
        }
    } else {
        localStorage.removeItem('userName');
        localStorage.removeItem('userUid');
    }
    isInitialAuthCheck = false;
});

// Expose Firebase Storage upload function globally for script.js
window.uploadFileToFirebase = async (file, path) => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
};

// Expose Firestore save function globally
window.saveMaterialToFirestore = async (data) => {
    try {
        const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-6);
        const docRef = await addDoc(collection(db, "study_materials"), {
            ...data,
            slug: slug,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw e;
    }
};

// Expose Firestore save contact message function globally
window.saveContactMessage = async (data) => {
    try {
        const docRef = await addDoc(collection(db, "contact_messages"), {
            ...data,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (e) {
        console.error("Error saving contact message: ", e);
        throw e;
    }
};

// Expose Firestore duplicate check function globally
window.checkDuplicateMaterial = async (fileName) => {
    try {
        const q = query(collection(db, "study_materials"), where("fileName", "==", fileName), limit(1));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (e) {
        console.error("Error checking duplicate: ", e);
        return false;
    }
};

// Expose Firestore fetch function globally
window.getRecentMaterials = async (limitCount = 8) => {
    try {
        const q = query(collection(db, "study_materials"), orderBy("createdAt", "desc"), limit(limitCount));
        const querySnapshot = await getDocs(q);
        const materials = [];
        querySnapshot.forEach((doc) => {
            materials.push({ id: doc.id, ...doc.data() });
        });
        return materials;
    } catch (e) {
        console.error("Error getting documents: ", e);
        return [];
    }
};

// Expose Firestore fetch function by file URL globally
window.getMaterialByUrl = async (url) => {
    try {
        const q = query(collection(db, "study_materials"), where("fileUrl", "==", url), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (e) {
        console.error("Error fetching material by URL:", e);
        return null;
    }
};

// Expose Firestore fetch function by slug globally
window.getMaterialBySlug = async (slug) => {
    try {
        const q = query(collection(db, "study_materials"), where("slug", "==", slug), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            return { id: docSnap.id, ...docSnap.data() };
        }
        const docRef = doc(db, "study_materials", slug);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (e) {
        console.error("Error fetching material by slug:", e);
        return null;
    }
};

window.getPersonalizedMaterials = async (uid, limitCount = 20) => {
    if (!uid) return []; // No user, no personalized content

    try {
        const userProfile = await window.getUserProfile(uid);
        
        // If profile is incomplete, show recent materials instead of an empty state.
        if (!userProfile || !userProfile.course || !userProfile.branch || !userProfile.college) {
            console.log('User profile is incomplete. Showing recent materials as a fallback.');
            return await window.getRecentMaterials(limitCount);
        }

        // This query will require a composite index in Firestore.
        // The error message in the browser console will provide a direct link to create it.
        const q = query(
            collection(db, "study_materials"),
            where("course", "==", userProfile.course),
            where("branch", "==", userProfile.branch),
            where("college", "==", userProfile.college),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const materials = [];
        querySnapshot.forEach((doc) => {
            materials.push({ id: doc.id, ...doc.data() });
        });

        // If no personalized materials are found, fall back to showing recent materials.
        if (materials.length === 0) {
            console.log('No personalized materials found for this profile. Showing recent materials as a fallback.');
            return await window.getRecentMaterials(limitCount);
        }

        return materials;

    } catch (e) {
        console.error("Error getting personalized materials. This might be due to a missing Firestore index. Falling back to recent materials.", e);
        // As per request, show recent materials on failure.
        return await window.getRecentMaterials(limitCount);
    }
};

window.toggleLikeMaterial = async (docId, uid) => {
    if (!uid) throw new Error("User not logged in");
    try {
        const docRef = doc(db, "study_materials", docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            let likedBy = data.likedBy || [];
            let isLiked = false;
            if (likedBy.includes(uid)) {
                likedBy = likedBy.filter(id => id !== uid);
            } else {
                likedBy.push(uid);
                isLiked = true;
            }
            await updateDoc(docRef, { likedBy });
            return { isLiked, count: likedBy.length };
        }
    } catch (e) {
        console.error("Error toggling like:", e);
        throw e;
    }
};

window.toggleSaveMaterial = async (docId, uid) => {
    if (!uid) throw new Error("User not logged in");
    try {
        const docRef = doc(db, "study_materials", docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            let savedBy = data.savedBy || [];
            let isSaved = false;
            if (savedBy.includes(uid)) {
                savedBy = savedBy.filter(id => id !== uid);
            } else {
                savedBy.push(uid);
                isSaved = true;
            }
            await updateDoc(docRef, { savedBy });
            return { isSaved, count: savedBy.length };
        }
        throw new Error("Material not found");
    } catch (e) {
        console.error("Error toggling save:", e);
        throw e;
    }
};

// Expose Firestore fetch all materials function for global search
window.searchMaterialsFirestore = async () => {
    try {
        const q = query(collection(db, "study_materials"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const materials = [];
        querySnapshot.forEach((doc) => {
            materials.push({ id: doc.id, ...doc.data() });
        });
        return materials;
    } catch (e) {
        console.error("Error fetching materials for search: ", e);
        return [];
    }
};

// Expose Firestore fetch function for specific user globally
window.getUserMaterials = async (uid) => {
    try {
        const q = query(collection(db, "study_materials"), where("uploaderUid", "==", uid));
        const querySnapshot = await getDocs(q);
        const materials = [];
        querySnapshot.forEach((doc) => {
            materials.push({ id: doc.id, ...doc.data() });
        });
        // Sort descending in JS to avoid needing a composite index in Firestore right away
        materials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return materials;
    } catch (e) {
        console.error("Error getting user materials: ", e);
        return [];
    }
};

// Expose Firestore fetch function for liked user materials globally
window.getLikedMaterials = async (uid) => {
    try {
        const q = query(collection(db, "study_materials"), where("likedBy", "array-contains", uid));
        const querySnapshot = await getDocs(q);
        const materials = [];
        querySnapshot.forEach((doc) => {
            materials.push({ id: doc.id, ...doc.data() });
        });
        return materials;
    } catch (e) {
        console.error("Error getting liked materials: ", e);
        return [];
    }
};

window.getSavedMaterials = async (uid) => {
    try {
        const q = query(collection(db, "study_materials"), where("savedBy", "array-contains", uid));
        const querySnapshot = await getDocs(q);
        const materials = [];
        querySnapshot.forEach((doc) => {
            materials.push({ id: doc.id, ...doc.data() });
        });
        return materials;
    } catch (e) {
        console.error("Error getting saved materials: ", e);
        return [];
    }
};

window.deleteMaterialFromFirestore = async (docId) => {
    try {
        await deleteDoc(doc(db, "study_materials", docId));
    } catch (e) {
        console.error("Error deleting document: ", e);
    }
};

// Expose Account functions
window.getUserProfile = async (uid) => {
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        return docSnap.exists() ? docSnap.data() : null;
    } catch (e) {
        console.error("Error getting profile:", e);
        return null;
    }
};

window.getCurrentUser = () => auth.currentUser;

window.saveUserProfile = async (uid, data) => {
    try {
        await setDoc(doc(db, "users", uid), data, { merge: true });
        // Sync the core Firebase Auth profile name as well
        if (auth.currentUser && data.name) {
            await updateProfile(auth.currentUser, { displayName: data.name });
        }
    } catch (e) {
        console.error("Error saving profile:", e);
        throw e;
    }
};

window.logoutUser = async () => {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (e) {
        console.error("Error logging out:", e);
    }
};

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const googleBtn = document.getElementById('google-login-btn');
const googleRegBtn = document.getElementById('google-register-btn');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const resetPasswordForm = document.getElementById('reset-password-form');

// 1. Handle Registration
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = registerForm.querySelector('button[type="submit"]');
        btn.innerText = 'Creating Account...';
        btn.disabled = true;

        const email = registerForm.querySelector('input[type="email"]').value;
        const password = registerForm.querySelector('input[type="password"]').value;
        const name = registerForm.querySelector('input[type="text"]').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Update auth profile and save user data to Firestore
            await updateProfile(userCredential.user, { displayName: name });
            await setDoc(doc(db, "users", userCredential.user.uid), {
                name: name,
                email: email,
                createdAt: new Date().toISOString()
            });

            // Store immediately for sidebar display
            localStorage.setItem('userName', name);

            window.showToast(`Account created successfully for ${name}!`, 'success');
            window.location.href = 'index.html'; // Redirect to home page
        } catch (error) {
            window.showToast(`Registration Error: ${error.message}`, 'error');
            btn.innerText = 'Create Account';
            btn.disabled = false;
        }
    });
}

// 2. Handle Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('button[type="submit"]');
        btn.innerText = 'Signing In...';
        btn.disabled = true;

        const email = loginForm.querySelector('input[type="email"]').value;
        const password = loginForm.querySelector('input[type="password"]').value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Record login data in database
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);
            
            const userData = {
                email: user.email,
                lastLogin: new Date().toISOString()
            };
            
            let finalName = user.displayName || user.email.split('@')[0];

            if (!userDoc.exists()) {
                userData.createdAt = new Date().toISOString();
                userData.name = finalName;
            } else if (userDoc.data().name) {
                finalName = userDoc.data().name;
            }
            await setDoc(userRef, userData, { merge: true });

            // Store immediately for sidebar display
            localStorage.setItem('userName', finalName);

            window.showToast(`Welcome back, ${finalName}!`, 'success');
            window.location.href = 'index.html'; // Redirect to home page
        } catch (error) {
            window.showToast(error.code === 'auth/invalid-credential' ? 'Login Error: Invalid email or password.' : `Login Error: ${error.message}`, 'error');
            btn.innerText = 'Sign In';
            btn.disabled = false;
        }
    });
}

// 3. Handle Social Logins (Google & GitHub)
const handleSocialLogin = async (provider) => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Ensure user document exists in Firestore and update login details
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        const userData = {
            email: user.email,
            lastLogin: new Date().toISOString()
        };
        let finalName = user.displayName || user.email.split('@')[0];
        
        if (!userDoc.exists()) {
            userData.createdAt = new Date().toISOString();
            userData.name = finalName;
        } else if (user.displayName) {
            userData.name = user.displayName; // Update name on social login to keep it fresh
            finalName = user.displayName;
        } else if (userDoc.data().name) {
            finalName = userDoc.data().name;
        }
        await setDoc(userRef, userData, { merge: true });
        
        localStorage.setItem('userName', finalName);

        window.location.href = 'index.html';
    } catch(error) {
        if (error.code !== 'auth/popup-closed-by-user') {
            window.showToast(`Authentication Error: ${error.message}`, 'error');
        }
    }
};

if(googleBtn) googleBtn.addEventListener('click', () => handleSocialLogin(new GoogleAuthProvider()));
if(googleRegBtn) googleRegBtn.addEventListener('click', () => handleSocialLogin(new GoogleAuthProvider()));

// 4. Handle Password Reset
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const emailInput = document.querySelector('#login-form input[type="email"]');
        const email = emailInput ? emailInput.value.trim() : '';
        
        if (!email) {
            window.showToast('Please enter your email address in the email field first to reset your password.', 'warning');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            window.showToast('Password reset email sent! Please check your inbox (and spam folder).', 'success');
            
            // Start 60-second countdown timer
            let countdown = 60;
            forgotPasswordLink.style.pointerEvents = 'none';
            forgotPasswordLink.style.opacity = '0.5';
            const originalText = forgotPasswordLink.innerText;
            forgotPasswordLink.innerText = `Resend in ${countdown}s`;
            
            const timer = setInterval(() => {
                countdown--;
                if (countdown <= 0) {
                    clearInterval(timer);
                    forgotPasswordLink.innerText = originalText;
                    forgotPasswordLink.style.pointerEvents = 'auto';
                    forgotPasswordLink.style.opacity = '1';
                } else {
                    forgotPasswordLink.innerText = `Resend in ${countdown}s`;
                }
            }, 1000);
        } catch (error) {
            window.showToast(`Error: ${error.message}`, 'error');
        }
    });
}

// 5. Handle Reset Password Form (if on separate forgot-password.html page)
if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = resetPasswordForm.querySelector('button[type="submit"]');
        const email = resetPasswordForm.querySelector('input[type="email"]').value.trim();
        
        btn.innerText = 'Sending...';
        btn.disabled = true;

        try {
            await sendPasswordResetEmail(auth, email);
            window.showToast('Password reset email sent! Please check your inbox.', 'success');
            
            let countdown = 60;
            btn.innerText = `Resend in ${countdown}s`;
            
            const timer = setInterval(() => {
                countdown--;
                if (countdown <= 0) {
                    clearInterval(timer);
                    btn.innerText = 'Send Reset Link';
                    btn.disabled = false;
                } else {
                    btn.innerText = `Resend in ${countdown}s`;
                }
            }, 1000);
            
        } catch (error) {
            window.showToast(`Error: ${error.message}`, 'error');
            btn.innerText = 'Send Reset Link';
            btn.disabled = false;
        }
    });
}
