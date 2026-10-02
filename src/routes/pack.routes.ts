import { Router } from 'express';
import { PackController } from '../controllers/pack.controller';

const router = Router();
const controller = new PackController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);

export default router;
