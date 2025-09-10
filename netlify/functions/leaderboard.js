// Netlify Function for getting leaderboard
const mongoose = require('mongoose');

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
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // MongoDB 연결
        await connectDB();

        // 상위 10명의 최고 점수 가져오기
        const leaderboard = await Score.aggregate([
            {
                $group: {
                    _id: '$userId',
                    username: { $first: '$username' },
                    bestScore: { $max: '$score' },
                    lastPlayed: { $max: '$gameDate' }
                }
            },
            {
                $sort: { bestScore: -1 }
            },
            {
                $limit: 10
            },
            {
                $project: {
                    _id: 0,
                    username: 1,
                    bestScore: 1,
                    lastPlayed: 1
                }
            }
        ]);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                leaderboard: leaderboard
            })
        };

    } catch (error) {
        console.error('랭킹 조회 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: '서버 오류가 발생했습니다' })
        };
    }
};
