import { app } from './api.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[SQLite Server] Running at http://localhost:${PORT}`);
  console.log(`[SQLite Server] API Endpoints available at http://localhost:${PORT}/api/`);
});
