import { Router } from 'express';
import { NetworkController } from '../controllers/network.controller';

const router = Router();
const controller = new NetworkController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);

export default router;
