// Netlify Function for getting leaderboard (Firebase Realtime Database 사용)
const { admin, database } = require('../../firebase-admin-config.js');

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
        // Realtime Database에서 상위 10명의 최고 점수 가져오기
        const snapshot = await database.ref('users')
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
                    bestScore: userData.bestScore || 0,
                    lastPlayed: userData.updatedAt || userData.createdAt
                }))
                .sort((a, b) => b.bestScore - a.bestScore)
                .slice(0, 10);
            
            sortedUsers.forEach((user, index) => {
                leaderboard.push({
                    rank: index + 1,
                    username: user.username,
                    bestScore: user.bestScore,
                    lastPlayed: user.lastPlayed
                });
            });
        }

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
