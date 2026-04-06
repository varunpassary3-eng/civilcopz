import express from 'express';

export function startSoapMock(port = 8080) {
  const app = express();
  app.post("/soap", (req, res) => {
    res.send(`
      <Response>
        <DiaryNumber>12345</DiaryNumber>
        <Status>ACCEPTED</Status>
      </Response>
    `);
  });
  return app.listen(port, () => console.log(`SOAP Mock Server running on port ${port}`));
}
