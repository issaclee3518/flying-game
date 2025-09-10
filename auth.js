// 인증 관련 JavaScript 코드

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('gameToken');
        this.user = JSON.parse(localStorage.getItem('gameUser') || 'null');
        this.bestScore = 0;
        
        this.initializeEventListeners();
        this.checkAuthStatus();
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
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const errorElement = document.getElementById('loginError');

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                
                localStorage.setItem('gameToken', this.token);
                localStorage.setItem('gameUser', JSON.stringify(this.user));
                
                this.showUserPanel();
                await this.loadUserData();
            } else {
                errorElement.textContent = data.error || '로그인에 실패했습니다.';
            }
        } catch (error) {
            errorElement.textContent = '서버 연결에 실패했습니다.';
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const errorElement = document.getElementById('registerError');

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                
                localStorage.setItem('gameToken', this.token);
                localStorage.setItem('gameUser', JSON.stringify(this.user));
                
                this.showUserPanel();
                await this.loadUserData();
            } else {
                errorElement.textContent = data.error || '회원가입에 실패했습니다.';
            }
        } catch (error) {
            errorElement.textContent = '서버 연결에 실패했습니다.';
        }
    }

    checkAuthStatus() {
        if (this.token && this.user) {
            this.verifyToken();
        } else {
            this.showAuthPanel();
        }
    }

    async verifyToken() {
        try {
            const response = await fetch('/api/verify', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.showUserPanel();
                await this.loadUserData();
            } else {
                this.logout();
            }
        } catch (error) {
            this.logout();
        }
    }

    showAuthPanel() {
        document.getElementById('authPanel').style.display = 'flex';
        document.getElementById('userPanel').style.display = 'none';
    }

    showUserPanel() {
        document.getElementById('authPanel').style.display = 'none';
        document.getElementById('userPanel').style.display = 'block';
        document.getElementById('userWelcome').textContent = `환영합니다, ${this.user.username}님!`;
    }

    async loadUserData() {
        if (!this.token) return;

        try {
            // 최고 점수 로드
            const scoreResponse = await fetch('/api/scores/best', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (scoreResponse.ok) {
                const scoreData = await scoreResponse.json();
                this.bestScore = scoreData.bestScore || 0;
                document.getElementById('bestScoreValue').textContent = this.bestScore;
            }

            // 랭킹 로드
            const leaderboardResponse = await fetch('/api/scores/leaderboard');
            if (leaderboardResponse.ok) {
                const leaderboardData = await leaderboardResponse.json();
                const userRank = leaderboardData.leaderboard.findIndex(
                    entry => entry.username === this.user.username
                ) + 1;
                
                document.getElementById('userRank').textContent = 
                    userRank > 0 ? `${userRank}위` : '순위 외';
            }
        } catch (error) {
            console.error('사용자 데이터 로드 실패:', error);
        }
    }

    async saveScore(score) {
        if (!this.token) return false;

        try {
            const response = await fetch('/api/scores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ score })
            });

            if (response.ok) {
                const data = await response.json();
                
                // 새로운 최고 기록인지 확인
                if (score > this.bestScore) {
                    this.bestScore = score;
                    document.getElementById('bestScoreValue').textContent = this.bestScore;
                    return true; // 새로운 최고 기록
                }
                
                return false; // 새로운 최고 기록 아님
            }
        } catch (error) {
            console.error('점수 저장 실패:', error);
        }
        
        return false;
    }

    logout() {
        this.token = null;
        this.user = null;
        this.bestScore = 0;
        
        localStorage.removeItem('gameToken');
        localStorage.removeItem('gameUser');
        
        this.showAuthPanel();
        
        // 폼 초기화
        document.getElementById('loginFormElement').reset();
        document.getElementById('registerFormElement').reset();
        document.getElementById('loginError').textContent = '';
        document.getElementById('registerError').textContent = '';
    }

    isAuthenticated() {
        return this.token && this.user;
    }

    getCurrentUser() {
        return this.user;
    }

    getBestScore() {
        return this.bestScore;
    }
}

// 전역 인증 매니저 인스턴스
const authManager = new AuthManager();
