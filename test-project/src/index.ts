import express from 'express';

// Fixed ESLint and TypeScript errors
const app = express();
const PORT = 3000;

// Using proper type instead of any
interface Message {
  message: string;
}
const data: Message = { message: 'Hello, world!' };

app.get('/', (req, res) => {
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for testing
export default app;