import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import apiRouter from './routes/api';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API routes
app.use('/api', apiRouter);

// Serve frontend static files in production
app.use(express.static(path.join(__dirname, '../../frontend/public')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

export default app;
