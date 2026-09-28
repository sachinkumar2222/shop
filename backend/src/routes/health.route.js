import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Shree Pooja Ghr API is running',
  });
});

export default router;
