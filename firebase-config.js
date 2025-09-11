// Firebase 설정 파일
const firebaseConfig = {
    apiKey: "AIzaSyCTudrQa8PRVV6pBkUxdUjYm-6gjy71Gcw",
    authDomain: "mini-game-89572.firebaseapp.com",
    projectId: "mini-game-89572",
    storageBucket: "mini-game-89572.firebasestorage.app",
    messagingSenderId: "439863312866",
    appId: "1:439863312866:web:636bde51bf5c75d84a79bb",
    measurementId: "G-D3KMQWRPKK",
    databaseURL: "https://mini-game-89572-default-rtdb.firebaseio.com/"
};

// Firebase 초기화 함수
async function initializeFirebase() {
    try {
        // Firebase SDK 동적 import
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js');
        const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js');
        const { getDatabase } = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js');
        const { getAnalytics } = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js');
        
        // Firebase 앱 초기화 (이미 초기화된 경우 체크)
        let app;
        try {
            app = initializeApp(firebaseConfig);
        } catch (error) {
            if (error.code === 'app/duplicate-app') {
                // 이미 초기화된 앱이 있는 경우 기존 앱 사용
                const { getApps } = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js');
                app = getApps()[0];
            } else {
                throw error;
            }
        }
        
        const auth = getAuth(app);
        const database = getDatabase(app);
        const analytics = getAnalytics(app);
        const googleProvider = new GoogleAuthProvider();
        
        // 전역으로 사용할 수 있도록 설정
        window.firebaseAuth = auth;
        window.firebaseDatabase = database;
        window.firebaseAnalytics = analytics;
        window.googleProvider = googleProvider;
        window.signInWithPopup = signInWithPopup;
        
        console.log('Firebase 초기화 성공');
        console.log('Auth Domain:', firebaseConfig.authDomain);
        console.log('Project ID:', firebaseConfig.projectId);
        return true;
    } catch (error) {
        console.error('Firebase 초기화 실패:', error);
        console.error('오류 세부사항:', error.message);
        return false;
    }
}

// 전역으로 사용할 수 있도록 설정
window.firebaseConfig = firebaseConfig;
window.initializeFirebase = initializeFirebase;