// Netlify Function for saving game scores (Firebase Realtime Database 사용)
const { admin, database } = require('../../firebase-admin-config.js');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '350600';

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

        // Realtime Database에서 사용자 정보 가져오기
        const userSnapshot = await database.ref(`users/${decoded.userId}`).once('value');
        if (!userSnapshot.exists()) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: '사용자를 찾을 수 없습니다' })
            };
        }

        const userData = userSnapshot.val();

        // 점수 저장
        const scoreRef = database.ref('scores').push();
        await scoreRef.set({
            userId: decoded.userId,
            username: decoded.username,
            score: score,
            gameDate: admin.database.ServerValue.TIMESTAMP
        });

        // 사용자 최고기록 업데이트
        let isNewRecord = false;
        const updates = {
            totalGames: (userData.totalGames || 0) + 1
        };

        if (score > (userData.bestScore || 0)) {
            updates.bestScore = score;
            isNewRecord = true;
        }

        await database.ref(`users/${decoded.userId}`).update(updates);

        console.log(`점수 저장 완료: ${decoded.username} - ${score}점 (새 기록: ${isNewRecord})`);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: '점수가 저장되었습니다',
                score: {
                    id: scoreRef.id,
                    score: score,
                    gameDate: new Date()
                },
                userStats: {
                    bestScore: isNewRecord ? score : userData.bestScore,
                    totalGames: (userData.totalGames || 0) + 1,
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
