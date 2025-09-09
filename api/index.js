// Vercel API Routes 방식으로 변경
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// 환경변수 로드
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || '350600';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/desert-flight-game';

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());

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

        if (!username || !email || !password) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

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

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: '잘못된 사용자명 또는 비밀번호입니다' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: '잘못된 사용자명 또는 비밀번호입니다' });
        }

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

// 전체 랭킹 조회 API
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

// 정적 파일 서빙
app.use(express.static('.'));

// 메인 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: '.' });
});

// Vercel에서 사용할 수 있도록 export
module.exports = app;
