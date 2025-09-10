// Netlify Function for registration
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
        const { username, email, password } = JSON.parse(event.body);

        if (!username || !email || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '모든 필드를 입력해주세요' })
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

        // 중복 사용자명 확인
        const existingUser = await User.findOne({ 
            $or: [
                { username: username },
                { email: email }
            ]
        });

        if (existingUser) {
            if (existingUser.username === username) {
                return {
                    statusCode: 409,
                    headers,
                    body: JSON.stringify({ error: '이미 사용 중인 사용자명입니다' })
                };
            }
            if (existingUser.email === email) {
                return {
                    statusCode: 409,
                    headers,
                    body: JSON.stringify({ error: '이미 사용 중인 이메일입니다' })
                };
            }
        }

        // 비밀번호 해싱
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 사용자 생성
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();
        console.log('사용자 저장 성공:', user.username);

        // JWT 토큰 생성
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: '회원가입이 완료되었습니다',
                token,
                user: { 
                    id: user._id, 
                    username: user.username, 
                    email: user.email 
                }
            })
        };

    } catch (error) {
        console.error('회원가입 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: '서버 오류가 발생했습니다' })
        };
    }
};
