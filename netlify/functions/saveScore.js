// Netlify Function for saving game scores
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '350600';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://issaclee6320_db_user:ok350600@cluster0.lp1ajav.mongodb.net/desert-flight-game?retryWrites=true&w=majority';

// MongoDB 연결
let isConnected = false;

async function connectDB() {
    if (isConnected) return;
    
    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log('MongoDB 연결 성공!');
    } catch (err) {
        console.error('MongoDB 연결 오류:', err);
        throw err;
    }
}

// 사용자 스키마 정의
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
    },
    bestScore: {
        type: Number,
        default: 0
    },
    totalGames: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

// 점수 스키마 정의
const scoreSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    gameDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const Score = mongoose.model('Score', scoreSchema);

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // JWT 토큰 확인
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: '인증이 필요합니다' })
            };
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);

        const { score } = JSON.parse(event.body);

        if (!score || typeof score !== 'number') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '유효한 점수를 입력해주세요' })
            };
        }

        // MongoDB 연결
        await connectDB();

        // 사용자 정보 가져오기
        const user = await User.findById(decoded.userId);
        if (!user) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: '사용자를 찾을 수 없습니다' })
            };
        }

        // 점수 저장
        const newScore = new Score({
            userId: decoded.userId,
            username: decoded.username,
            score: score
        });

        await newScore.save();

        // 사용자 최고기록 업데이트
        let isNewRecord = false;
        if (score > user.bestScore) {
            user.bestScore = score;
            isNewRecord = true;
        }
        user.totalGames += 1;
        await user.save();

        console.log(`점수 저장 완료: ${decoded.username} - ${score}점 (새 기록: ${isNewRecord})`);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: '점수가 저장되었습니다',
                score: {
                    id: newScore._id,
                    score: newScore.score,
                    gameDate: newScore.gameDate
                },
                userStats: {
                    bestScore: user.bestScore,
                    totalGames: user.totalGames,
                    isNewRecord: isNewRecord
                }
            })
        };

    } catch (error) {
        console.error('점수 저장 오류:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: '유효하지 않은 토큰입니다' })
            };
        }
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: '서버 오류가 발생했습니다' })
        };
    }
};
