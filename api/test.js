// 간단한 테스트 API
export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        res.status(200).json({
            message: 'API 테스트 성공!',
            timestamp: new Date().toISOString(),
            method: req.method
        });
    } catch (error) {
        console.error('테스트 API 오류:', error);
        res.status(500).json({ error: '서버 오류' });
    }
}