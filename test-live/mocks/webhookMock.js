import express from 'express';

export function startWebhookMock(port = 8081) {
    const app = express();
    app.use(express.json());
    
    app.post("/registry/callback", (req, res) => {
        const { caseId, status } = req.body;
        console.log(`[MOCK] Webhook callback received for ${caseId} -> Status: ${status}`);
        res.status(200).send({ success: true });
    });
    return app.listen(port, () => console.log(`Webhook Mock Server running on port ${port}`));
}
