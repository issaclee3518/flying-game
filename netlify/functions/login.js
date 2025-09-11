// Netlify Function for login (Firebase Auth + Realtime Database 사용)
const { admin, database } = require('../../firebase-admin-config.js');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '350600';

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
        const { email, password } = JSON.parse(event.body);

        if (!email || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '이메일과 비밀번호를 입력해주세요' })
            };
        }

        // Firebase Admin SDK로 사용자 인증
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            
            // 사용자 정보 가져오기
            const userSnapshot = await database.ref(`users/${userRecord.uid}`).once('value');
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
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: '로그인 성공!',
                    token: token,
                    user: { 
                        id: userRecord.uid,
                        username: userData?.username || userRecord.displayName,
                        email: userRecord.email
                    }
                })
            };
            
        } catch (authError) {
            console.error('Firebase 인증 오류:', authError);
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: '이메일 또는 비밀번호가 올바르지 않습니다' })
            };
        }

    } catch (error) {
        console.error('로그인 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: '서버 오류가 발생했습니다' })
        };
    }
};
