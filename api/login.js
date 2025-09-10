// 간단한 로그인 API (테스트용)
export default async function handler(req, res) {
    try {
        // CORS 설정
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '사용자명과 비밀번호를 입력해주세요' });
        }

        // 간단한 응답 (데이터베이스 없이)
        res.status(200).json({
            message: '로그인 테스트 성공!',
            token: 'test-token-' + Date.now(),
            user: { 
                username: username
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
}