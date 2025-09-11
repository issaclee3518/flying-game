// 환경변수 로드
require('dotenv').config();

const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { admin, database } = require('./firebase-admin-config.js');

const app = express();
const PORT = process.env.PORT || 9000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // 정적 파일 서빙

console.log('✅ Firebase Admin SDK 초기화 완료!');

// Realtime Database 참조
const usersRef = database.ref('users');
const scoresRef = database.ref('scores');

// JWT 토큰 검증 미들웨어
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userSnapshot = await usersRef.child(decoded.userId).once('value');
        
        if (!userSnapshot.exists()) {
            return res.status(403).json({ error: 'User not found' });
        }
        
        req.user = { id: decoded.userId, ...userSnapshot.val() };
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// 회원가입 API (Firebase Auth 사용)
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 입력 검증
        if (!username || !email || !password) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다' });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: '사용자명은 3-20자 사이여야 합니다' });
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다' });
        }

        // Firebase Auth로 사용자 생성
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: username
        });

        // Realtime Database에 사용자 정보 저장
        await usersRef.child(userRecord.uid).set({
            username: username,
            email: email,
            bestScore: 0,
            totalGames: 0,
            createdAt: admin.database.ServerValue.TIMESTAMP
        });

        // JWT 토큰 생성
        const token = jwt.sign(
            { userId: userRecord.uid, username: username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: '회원가입이 완료되었습니다',
            token,
            user: { 
                id: userRecord.uid, 
                username: username, 
                email: email 
            }
        });

    } catch (error) {
        console.error('회원가입 오류:', error);
        
        if (error.code === 'auth/email-already-exists') {
            return res.status(400).json({ error: '이미 존재하는 이메일입니다' });
        } else if (error.code === 'auth/invalid-email') {
            return res.status(400).json({ error: '유효하지 않은 이메일 형식입니다' });
        } else if (error.code === 'auth/weak-password') {
            return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다' });
        }
        
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 로그인 API (Firebase Auth 사용)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요' });
        }

        // Firebase Admin SDK로 사용자 인증
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            
            // 사용자 정보 가져오기
            const userSnapshot = await usersRef.child(userRecord.uid).once('value');
            const userData = userSnapshot.exists() ? userSnapshot.val() : null;
            
            // JWT 토큰 생성
            const token = jwt.sign(
                { 
                    userId: userRecord.uid, 
                    email: userRecord.email,
                    username: userData?.username || userRecord.displayName
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({
                message: '로그인 성공',
                token,
                user: { 
                    id: userRecord.uid,
                    username: userData?.username || userRecord.displayName,
                    email: userRecord.email
                }
            });
            
        } catch (authError) {
            console.error('Firebase 인증 오류:', authError);
            res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
        }

    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 점수 저장 API (Firestore 사용)
app.post('/api/scores', authenticateToken, async (req, res) => {
    try {
        const { score, level = 1 } = req.body;

        if (!score || score < 0 || !Number.isInteger(score)) {
            return res.status(400).json({ error: '유효한 점수를 입력해주세요' });
        }

        // Realtime Database에 점수 저장
        const scoreRef = scoresRef.push();
        await scoreRef.set({
            userId: req.user.id,
            username: req.user.username,
            score: score,
            level: level,
            gameDate: admin.database.ServerValue.TIMESTAMP
        });

        // 사용자 최고 점수 업데이트
        let isNewRecord = false;
        const updates = {
            totalGames: (req.user.totalGames || 0) + 1
        };

        if (score > (req.user.bestScore || 0)) {
            updates.bestScore = score;
            isNewRecord = true;
        }

        await usersRef.child(req.user.id).update(updates);

        res.status(201).json({
            message: '점수가 저장되었습니다',
            scoreId: scoreRef.id,
            score,
            level,
            isNewRecord
        });

    } catch (error) {
        console.error('점수 저장 오류:', error);
        res.status(500).json({ error: '점수 저장 중 오류가 발생했습니다' });
    }
});

// 사용자 최고 점수 조회 API (Firestore 사용)
app.get('/api/scores/best', authenticateToken, async (req, res) => {
    try {
        res.json({
            bestScore: req.user.bestScore || 0
        });

    } catch (error) {
        console.error('최고 점수 조회 오류:', error);
        res.status(500).json({ error: '점수 조회 중 오류가 발생했습니다' });
    }
});

// 전체 랭킹 조회 API (상위 10명) - Realtime Database 사용
app.get('/api/scores/leaderboard', async (req, res) => {
    try {
        const snapshot = await usersRef
            .orderByChild('bestScore')
            .limitToLast(10)
            .once('value');

        const leaderboard = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            const sortedUsers = Object.entries(data)
                .map(([uid, userData]) => ({
                    uid,
                    username: userData.username,
                    bestScore: userData.bestScore || 0
                }))
                .sort((a, b) => b.bestScore - a.bestScore)
                .slice(0, 10);
            
            sortedUsers.forEach((user, index) => {
                leaderboard.push({
                    rank: index + 1,
                    username: user.username,
                    score: user.bestScore
                });
            });
        }

        res.json({
            leaderboard: leaderboard
        });

    } catch (error) {
        console.error('랭킹 조회 오류:', error);
        res.status(500).json({ error: '랭킹 조회 중 오류가 발생했습니다' });
    }
});

// 사용자 점수 히스토리 조회 API (Realtime Database 사용)
app.get('/api/scores/history', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const snapshot = await scoresRef
            .orderByChild('userId')
            .equalTo(req.user.id)
            .orderByChild('gameDate')
            .limitToLast(limit)
            .once('value');

        const history = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            const sortedScores = Object.values(data)
                .sort((a, b) => b.gameDate - a.gameDate)
                .slice(0, limit);
            
            sortedScores.forEach(score => {
                history.push({
                    score: score.score,
                    level: score.level || 1,
                    createdAt: score.gameDate
                });
            });
        }

        res.json({
            history: history
        });

    } catch (error) {
        console.error('점수 히스토리 조회 오류:', error);
        res.status(500).json({ error: '점수 히스토리 조회 중 오류가 발생했습니다' });
    }
});

// 토큰 검증 API
app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email
        }
    });
});

// 사용자 통계 API (Realtime Database 사용)
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        // 사용자 기본 통계
        const userStats = {
            totalGames: req.user.totalGames || 0,
            bestScore: req.user.bestScore || 0
        };

        // 추가 통계를 위해 점수 히스토리 조회
        const snapshot = await scoresRef
            .orderByChild('userId')
            .equalTo(req.user.id)
            .once('value');

        let totalScore = 0;
        let gameCount = 0;
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.values(data).forEach(score => {
                totalScore += score.score;
                gameCount++;
            });
        }

        const averageScore = gameCount > 0 ? Math.round(totalScore / gameCount) : 0;

        res.json({
            stats: {
                totalGames: userStats.totalGames,
                bestScore: userStats.bestScore,
                averageScore: averageScore,
                totalScore: totalScore
            }
        });

    } catch (error) {
        console.error('통계 조회 오류:', error);
        res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다' });
    }
});

// 메인 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다`);
    console.log(`🌐 http://localhost:${PORT} 에서 게임을 플레이하세요!`);
    console.log(`🔥 Firebase 프로젝트: ${process.env.FIREBASE_PROJECT_ID || '설정 필요'}`);
});

// 서버 종료 시 정리
process.on('SIGINT', async () => {
    try {
        console.log('서버를 종료합니다...');
        process.exit(0);
    } catch (error) {
        console.error('서버 종료 오류:', error);
        process.exit(1);
    }
});