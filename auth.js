// Firebase 인증 관련 JavaScript 코드
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { 
    ref, 
    get, 
    set, 
    update, 
    push, 
    query, 
    orderByChild, 
    limitToLast, 
    onValue 
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js';
import { 
    logEvent 
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js';

class AuthManager {
    constructor() {
        this.user = null;
        this.bestScore = 0;
        
        this.initializeEventListeners();
        this.initializeAuthStateListener();
    }

    initializeEventListeners() {
        // 탭 전환
        document.getElementById('loginTab').addEventListener('click', () => this.switchTab('login'));
        document.getElementById('registerTab').addEventListener('click', () => this.switchTab('register'));

        // 폼 제출
        document.getElementById('loginFormElement').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerFormElement').addEventListener('submit', (e) => this.handleRegister(e));

        // 로그아웃
        document.getElementById('logoutButton').addEventListener('click', () => this.logout());
    }

    switchTab(tab) {
        // 탭 버튼 활성화
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.getElementById(tab + 'Tab').classList.add('active');

        // 폼 표시/숨김
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        document.getElementById(tab + 'Form').classList.add('active');

        // 에러 메시지 초기화
        document.getElementById('loginError').textContent = '';
        document.getElementById('registerError').textContent = '';
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorElement = document.getElementById('loginError');

        // 로딩 상태 표시
        setLoading('loginButton', true);
        errorElement.textContent = '';

        try {
            // Firebase Auth가 초기화되었는지 확인
            if (!window.firebaseAuth) {
                throw new Error('Firebase가 초기화되지 않았습니다. 페이지를 새로고침해주세요.');
            }
            
            const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
            this.user = userCredential.user;
            
            // 사용자 프로필 정보 가져오기
            await this.loadUserData();
            this.showUserPanel();
            
            // Analytics 이벤트 로그
            if (window.firebaseAnalytics) {
                logEvent(window.firebaseAnalytics, 'login', {
                    method: 'email'
                });
            }
            
        } catch (error) {
            console.error('로그인 오류:', error);
            let errorMessage = '로그인에 실패했습니다.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = '등록되지 않은 이메일입니다.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = '잘못된 비밀번호입니다.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '유효하지 않은 이메일 형식입니다.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = '너무 많은 로그인 시도로 일시적으로 차단되었습니다.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = '비활성화된 계정입니다.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = '네트워크 연결을 확인해주세요.';
                    break;
            }
            
            errorElement.textContent = errorMessage;
        } finally {
            // 로딩 상태 해제
            setLoading('loginButton', false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const errorElement = document.getElementById('registerError');

        // 폼 유효성 검사
        if (!validateForm('register')) {
            return;
        }

        // 로딩 상태 표시
        setLoading('registerButton', true);
        errorElement.textContent = '';

        try {
            // Firebase Auth가 초기화되었는지 확인
            if (!window.firebaseAuth) {
                throw new Error('Firebase가 초기화되지 않았습니다. 페이지를 새로고침해주세요.');
            }
            
            // Firebase Auth로 사용자 생성
            const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
            this.user = userCredential.user;
            
            // 사용자 프로필에 사용자명 추가
            await updateProfile(this.user, {
                displayName: username
            });
            
            // Realtime Database에 사용자 정보 저장
            await set(ref(window.firebaseDatabase, `users/${this.user.uid}`), {
                username: username,
                email: email,
                bestScore: 0,
                totalGames: 0,
                createdAt: new Date().toISOString()
            });
            
            await this.loadUserData();
            this.showUserPanel();
            
            // Analytics 이벤트 로그
            if (window.firebaseAnalytics) {
                logEvent(window.firebaseAnalytics, 'sign_up', {
                    method: 'email'
                });
            }
            
        } catch (error) {
            console.error('회원가입 오류:', error);
            let errorMessage = '회원가입에 실패했습니다.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = '이미 사용 중인 이메일입니다.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '유효하지 않은 이메일 형식입니다.';
                    break;
                case 'auth/weak-password':
                    errorMessage = '비밀번호는 6자 이상이어야 합니다.';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = '이메일/비밀번호 로그인이 비활성화되어 있습니다.';
                    // Firebase 설정 패널 표시
                    if (window.showFirebaseSetupPanel) {
                        window.showFirebaseSetupPanel();
                    }
                    break;
                case 'auth/network-request-failed':
                    errorMessage = '네트워크 연결을 확인해주세요.';
                    break;
                case 'auth/configuration-not-found':
                    errorMessage = 'Firebase Console에서 Authentication을 활성화해주세요.';
                    // Firebase 설정 패널 표시
                    if (window.showFirebaseSetupPanel) {
                        window.showFirebaseSetupPanel();
                    }
                    break;
            }
            
            errorElement.textContent = errorMessage;
        } finally {
            // 로딩 상태 해제
            setLoading('registerButton', false);
        }
    }

    initializeAuthStateListener() {
        onAuthStateChanged(window.firebaseAuth, async (user) => {
            if (user) {
                this.user = user;
                await this.loadUserData();
                this.showUserPanel();
            } else {
                this.user = null;
                this.showAuthPanel();
            }
        });
    }

    showAuthPanel() {
        document.getElementById('authPanel').style.display = 'flex';
        document.getElementById('userPanel').style.display = 'none';
    }

    showUserPanel() {
        document.getElementById('authPanel').style.display = 'none';
        document.getElementById('userPanel').style.display = 'block';
        const displayName = this.user.displayName || this.user.email;
        document.getElementById('userWelcome').textContent = `환영합니다, ${displayName}님!`;
        
        // 사용자 아바타 설정
        const avatar = document.getElementById('userAvatar');
        if (this.user.photoURL) {
            avatar.innerHTML = `<img src="${this.user.photoURL}" alt="프로필" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            avatar.textContent = displayName.charAt(0).toUpperCase();
        }
    }

    async loadUserData() {
        if (!this.user) return;

        try {
            // Realtime Database에서 사용자 데이터 로드
            const userRef = ref(window.firebaseDatabase, `users/${this.user.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                const userData = snapshot.val();
                this.bestScore = userData.bestScore || 0;
                document.getElementById('bestScoreValue').textContent = this.bestScore;
                document.getElementById('totalGames').textContent = userData.totalGames || 0;
            }

            // 랭킹 로드
            await this.loadLeaderboard();
        } catch (error) {
            console.error('사용자 데이터 로드 실패:', error);
        }
    }

    async loadLeaderboard() {
        try {
            // 모든 사용자 데이터 가져오기
            const usersRef = ref(window.firebaseDatabase, 'users');
            const snapshot = await get(usersRef);
            
            if (!snapshot.exists()) {
                document.getElementById('userRank').textContent = 'Unranked';
                return;
            }
            
            const data = snapshot.val();
            const allUsers = Object.entries(data)
                .map(([uid, userData]) => ({
                    uid,
                    username: userData.username,
                    bestScore: userData.bestScore || 0
                }))
                .sort((a, b) => b.bestScore - a.bestScore);
            
            // 상위 10명 순위표 생성
            const leaderboard = allUsers.slice(0, 10).map((user, index) => ({
                rank: index + 1,
                username: user.username,
                score: user.bestScore
            }));
            
            // 현재 사용자 순위 찾기
            const userRank = allUsers.findIndex(user => user.uid === this.user.uid) + 1;
            
            // 순위 표시 (10위 밖이어도 전체 순위 표시)
            if (userRank > 0) {
                document.getElementById('userRank').textContent = `#${userRank}`;
            } else {
                document.getElementById('userRank').textContent = 'Unranked';
            }
                
            console.log('순위표 로드 완료:', {
                totalUsers: allUsers.length,
                userRank: userRank,
                userScore: allUsers.find(user => user.uid === this.user.uid)?.bestScore || 0
            });
                
        } catch (error) {
            console.error('랭킹 로드 실패:', error);
            document.getElementById('userRank').textContent = '순위 외';
        }
    }

    async saveScore(score) {
        if (!this.user) return false;

        try {
            // Realtime Database에 점수 저장
            const scoreRef = push(ref(window.firebaseDatabase, 'scores'));
            await set(scoreRef, {
                userId: this.user.uid,
                username: this.user.displayName,
                score: score,
                gameDate: new Date().toISOString()
            });

            // 사용자 최고 점수 업데이트
            const userRef = ref(window.firebaseDatabase, `users/${this.user.uid}`);
            const userSnapshot = await get(userRef);
            
            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                const isNewRecord = score > (userData.bestScore || 0);
                
                // 게임 수는 항상 증가 (새로운 최고 기록이든 아니든)
                const newTotalGames = (userData.totalGames || 0) + 1;
                
                if (isNewRecord) {
                    await update(userRef, {
                        bestScore: score,
                        totalGames: newTotalGames
                    });
                    
                    this.bestScore = score;
                    document.getElementById('bestScoreValue').textContent = this.bestScore;
                    
                    // 랭킹 다시 로드
                    await this.loadLeaderboard();
                    
                    // Analytics 이벤트 로그
                    if (window.firebaseAnalytics) {
                        logEvent(window.firebaseAnalytics, 'score_achievement', {
                            score: score,
                            is_new_record: true
                        });
                    }
                    
                    return true; // 새로운 최고 기록
                } else {
                    await update(userRef, {
                        totalGames: newTotalGames
                    });
                }
                
                // 게임 수 UI 업데이트
                document.getElementById('totalGames').textContent = newTotalGames;
            }
            
            return false; // 새로운 최고 기록 아님
        } catch (error) {
            console.error('점수 저장 실패:', error);
        }
        
        return false;
    }

    async logout() {
        try {
            await signOut(window.firebaseAuth);
            this.user = null;
            this.bestScore = 0;
            
            this.showAuthPanel();
            
            // Analytics 이벤트 로그
            if (window.firebaseAnalytics) {
                logEvent(window.firebaseAnalytics, 'logout');
            }
            
            // 폼 초기화
            document.getElementById('loginFormElement').reset();
            document.getElementById('registerFormElement').reset();
            document.getElementById('loginError').textContent = '';
            document.getElementById('registerError').textContent = '';
        } catch (error) {
            console.error('로그아웃 오류:', error);
        }
    }

    isAuthenticated() {
        return this.user !== null;
    }

    getCurrentUser() {
        return this.user;
    }

    getBestScore() {
        return this.bestScore;
    }
}

// AuthManager 초기화 함수
async function initializeAuthManager() {
    // Firebase가 초기화될 때까지 대기
    let attempts = 0;
    const maxAttempts = 50; // 5초 대기
    
    while (!window.firebaseAuth && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.firebaseAuth) {
        console.error('Firebase Auth가 초기화되지 않았습니다.');
        return null;
    }
    
    // AuthManager 인스턴스 생성
    const authManager = new AuthManager();
    window.authManager = authManager;
    
    console.log('AuthManager 초기화 완료');
    return authManager;
}

// 전역으로 사용할 수 있도록 설정
window.initializeAuthManager = initializeAuthManager;

