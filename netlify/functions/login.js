// Netlify Function for login
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

        // Simple response (no database)
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: '로그인 테스트 성공!',
                token: 'test-token-' + Date.now(),
                user: { 
                    username: username
                },
                timestamp: new Date().toISOString()
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
