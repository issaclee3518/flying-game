// 환경변수 로드
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/desert-flight-game';

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // 정적 파일 서빙

// MongoDB 연결
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB 연결 성공!');
})
.catch((error) => {
    console.error('❌ MongoDB 연결 실패:', error);
    process.exit(1);
});

// 스키마 정의
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    }
}, {
    timestamps: true
});

const scoreSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    score: {
        type: Number,
        required: true,
        min: 0
    },
    level: {
        type: Number,
        default: 1,
        min: 1
    }
}, {
    timestamps: true
});

// 인덱스 생성
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
scoreSchema.index({ user: 1, score: -1 });
scoreSchema.index({ score: -1 });

// 모델 생성
const User = mongoose.model('User', userSchema);
const Score = mongoose.model('Score', scoreSchema);

// JWT 토큰 검증 미들웨어
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(403).json({ error: 'User not found' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// 회원가입 API
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

        // 비밀번호 해시화
        const hashedPassword = await bcrypt.hash(password, 12);

        // 사용자 생성
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // JWT 토큰 생성
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: '회원가입이 완료되었습니다',
            token,
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email 
            }
        });

    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                error: field === 'username' ? '이미 존재하는 사용자명입니다' : '이미 존재하는 이메일입니다' 
            });
        }
        
        console.error('회원가입 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 로그인 API
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '사용자명과 비밀번호를 입력해주세요' });
        }

        // 사용자 찾기
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: '잘못된 사용자명 또는 비밀번호입니다' });
        }

        // 비밀번호 확인
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: '잘못된 사용자명 또는 비밀번호입니다' });
        }

        // JWT 토큰 생성
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: '로그인 성공',
            token,
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email 
            }
        });

    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 점수 저장 API
app.post('/api/scores', authenticateToken, async (req, res) => {
    try {
        const { score, level = 1 } = req.body;

        if (!score || score < 0 || !Number.isInteger(score)) {
            return res.status(400).json({ error: '유효한 점수를 입력해주세요' });
        }

        const newScore = new Score({
            user: req.user._id,
            score,
            level
        });

        await newScore.save();

        res.status(201).json({
            message: '점수가 저장되었습니다',
            scoreId: newScore._id,
            score,
            level
        });

    } catch (error) {
        console.error('점수 저장 오류:', error);
        res.status(500).json({ error: '점수 저장 중 오류가 발생했습니다' });
    }
});

// 사용자 최고 점수 조회 API
app.get('/api/scores/best', authenticateToken, async (req, res) => {
    try {
        const bestScore = await Score.findOne({ user: req.user._id })
            .sort({ score: -1 })
            .select('score');

        res.json({
            bestScore: bestScore ? bestScore.score : 0
        });

    } catch (error) {
        console.error('최고 점수 조회 오류:', error);
        res.status(500).json({ error: '점수 조회 중 오류가 발생했습니다' });
    }
});

// 전체 랭킹 조회 API (상위 10명)
app.get('/api/scores/leaderboard', async (req, res) => {
    try {
        const leaderboard = await Score.aggregate([
            {
                $group: {
                    _id: '$user',
                    bestScore: { $max: '$score' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $unwind: '$userInfo'
            },
            {
                $project: {
                    username: '$userInfo.username',
                    bestScore: 1
                }
            },
            {
                $sort: { bestScore: -1 }
            },
            {
                $limit: 10
            }
        ]);

        const formattedLeaderboard = leaderboard.map((entry, index) => ({
            rank: index + 1,
            username: entry.username,
            score: entry.bestScore
        }));

        res.json({
            leaderboard: formattedLeaderboard
        });

    } catch (error) {
        console.error('랭킹 조회 오류:', error);
        res.status(500).json({ error: '랭킹 조회 중 오류가 발생했습니다' });
    }
});

// 사용자 점수 히스토리 조회 API
app.get('/api/scores/history', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const history = await Score.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('score level createdAt');

        res.json({
            history: history.map(score => ({
                score: score.score,
                level: score.level,
                createdAt: score.createdAt
            }))
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
            id: req.user._id,
            username: req.user.username,
            email: req.user.email
        }
    });
});

// 사용자 통계 API
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await Score.aggregate([
            { $match: { user: req.user._id } },
            {
                $group: {
                    _id: null,
                    totalGames: { $sum: 1 },
                    bestScore: { $max: '$score' },
                    averageScore: { $avg: '$score' },
                    totalScore: { $sum: '$score' }
                }
            }
        ]);

        const userStats = stats[0] || {
            totalGames: 0,
            bestScore: 0,
            averageScore: 0,
            totalScore: 0
        };

        res.json({
            stats: {
                totalGames: userStats.totalGames,
                bestScore: userStats.bestScore,
                averageScore: Math.round(userStats.averageScore || 0),
                totalScore: userStats.totalScore
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
    console.log(`📊 MongoDB URI: ${MONGODB_URI}`);
});

// 서버 종료 시 MongoDB 연결 종료
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB 연결이 종료되었습니다.');
        process.exit(0);
    } catch (error) {
        console.error('MongoDB 연결 종료 오류:', error);
        process.exit(1);
    }
});