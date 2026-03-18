import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// TODO: Replace with your app's actual Firebase project configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAXeBcj0axMSrbjd4JvQmKvu_Rfbii8YkA",
  authDomain: "studybook-3e7e4.firebaseapp.com",
  projectId: "studybook-3e7e4",
  storageBucket: "studybook-3e7e4.firebasestorage.app",
  messagingSenderId: "619044808575",
  appId: "1:619044808575:web:eafe160799d66532155c4a",
  measurementId: "G-J41ZWRBPCZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Check if user is already logged in
onAuthStateChanged(auth, (user) => {
    // If logged in and on the login page, redirect to home
    if (user && window.location.pathname.includes('login.html')) {
        window.location.href = 'index.html';
    }
});

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const googleBtn = document.getElementById('google-login-btn');
const githubBtn = document.getElementById('github-login-btn');
const googleRegBtn = document.getElementById('google-register-btn');

// 1. Handle Registration
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = registerForm.querySelector('button[type="submit"]');
        btn.innerText = 'Creating Account...';
        btn.disabled = true;

        const email = registerForm.querySelector('input[type="email"]').value;
        const password = registerForm.querySelector('input[type="password"]').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            alert(`Account created successfully for ${userCredential.user.email}!`);
            window.location.href = 'index.html'; // Redirect to home page
        } catch (error) {
            alert(`Registration Error: ${error.message}`);
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
            alert(`Welcome back, ${userCredential.user.email}!`);
            window.location.href = 'index.html'; // Redirect to home page
        } catch (error) {
            alert(error.code === 'auth/invalid-credential' ? 'Login Error: Invalid email or password.' : `Login Error: ${error.message}`);
            btn.innerText = 'Sign In';
            btn.disabled = false;
        }
    });
}

// 3. Handle Social Logins (Google & GitHub)
const handleSocialLogin = async (provider) => {
    try {
        const result = await signInWithPopup(auth, provider);
        window.location.href = 'index.html';
    } catch(error) {
        if (error.code !== 'auth/popup-closed-by-user') {
            alert(`Authentication Error: ${error.message}`);
        }
    }
};

if(googleBtn) googleBtn.addEventListener('click', () => handleSocialLogin(new GoogleAuthProvider()));
if(googleRegBtn) googleRegBtn.addEventListener('click', () => handleSocialLogin(new GoogleAuthProvider()));
if(githubBtn) githubBtn.addEventListener('click', () => handleSocialLogin(new GithubAuthProvider()));