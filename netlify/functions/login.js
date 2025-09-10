// Netlify Function for login
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '350600';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://issaclee6320_db_user:ok350600@cluster0.lp1ajav.mongodb.net/desert-flight-game?retryWrites=true&w=majority';

// MongoDB 연결 (Netlify Functions 최적화)
let isConnected = false;

async function connectDB() {
    if (isConnected) {
        return mongoose.connection.readyState === 1;
    }
    
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        isConnected = true;
        console.log('MongoDB 연결 성공!');
        return true;
    } catch (err) {
        console.error('MongoDB 연결 오류:', err);
        isConnected = false;
        return false;
    }
}

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

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
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
        const { username, password } = JSON.parse(event.body);

        if (!username || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '사용자명과 비밀번호를 입력해주세요' })
            };
        }

        // MongoDB 연결 시도
        const dbConnected = await connectDB();
        if (!dbConnected) {
            console.error('MongoDB 연결 실패');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: '데이터베이스 연결에 실패했습니다' })
            };
        }

        // 사용자 찾기
        const user = await User.findOne({ username });
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: '사용자명 또는 비밀번호가 올바르지 않습니다' })
            };
        }

        // 비밀번호 확인
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: '사용자명 또는 비밀번호가 올바르지 않습니다' })
            };
        }

        // JWT 토큰 생성
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('로그인 성공:', user.username);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: '로그인 성공!',
                token,
                user: { 
                    id: user._id, 
                    username: user.username, 
                    email: user.email 
                }
            })
        };

    } catch (error) {
        console.error('로그인 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: '서버 오류가 발생했습니다' })
        };
    }
};
