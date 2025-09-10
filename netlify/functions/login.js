// Netlify Function for login
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

        // 임시 해결책: 단순한 응답 (Netlify Functions 환경 문제 해결 전까지)
        console.log('로그인 요청 받음:', { username });
        
        // 간단한 사용자 확인 (메모리 기반)
        const validUsers = ['issac', 'testuser']; // 임시 목록
        if (!validUsers.includes(username)) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: '사용자명 또는 비밀번호가 올바르지 않습니다' })
            };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: '로그인 성공! (임시 모드)',
                token: 'temp-token-' + Date.now(),
                user: { 
                    id: 'temp-id-' + Date.now(),
                    username: username, 
                    email: username + '@example.com'
                },
                note: '실제 인증은 나중에 구현됩니다'
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
