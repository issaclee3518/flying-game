// Netlify Function for registration (Firebase Auth + Realtime Database 사용)
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
        const { username, email, password } = JSON.parse(event.body);

        if (!username || !email || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '모든 필드를 입력해주세요' })
            };
        }

        // 입력 검증
        if (password.length < 6) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '비밀번호는 6자 이상이어야 합니다' })
            };
        }

        if (username.length < 3 || username.length > 20) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '사용자명은 3-20자 사이여야 합니다' })
            };
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '올바른 이메일 형식이 아닙니다' })
            };
        }

        // Firebase Admin SDK로 사용자 생성
        try {
            const userRecord = await admin.auth().createUser({
                email: email,
                password: password,
                displayName: username
            });

            // Realtime Database에 사용자 정보 저장
            await database.ref(`users/${userRecord.uid}`).set({
                username: username,
                email: email,
                bestScore: 0,
                totalGames: 0,
                createdAt: admin.database.ServerValue.TIMESTAMP
            });

            // JWT 토큰 생성
            const token = jwt.sign(
                { 
                    userId: userRecord.uid, 
                    email: userRecord.email,
                    username: username
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    message: '회원가입이 완료되었습니다',
                    token: token,
                    user: { 
                        id: userRecord.uid,
                        username: username, 
                        email: email 
                    }
                })
            };

        } catch (authError) {
            console.error('Firebase 사용자 생성 오류:', authError);
            
            let errorMessage = '회원가입에 실패했습니다';
            if (authError.code === 'auth/email-already-exists') {
                errorMessage = '이미 사용 중인 이메일입니다';
            } else if (authError.code === 'auth/invalid-email') {
                errorMessage = '유효하지 않은 이메일 형식입니다';
            } else if (authError.code === 'auth/weak-password') {
                errorMessage = '비밀번호는 6자 이상이어야 합니다';
            }

            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({ error: errorMessage })
            };
        }

    } catch (error) {
        console.error('회원가입 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: '서버 오류가 발생했습니다' })
        };
    }
};
