import { Router } from 'express';
import { AnnouncementController } from '../controllers/announcement.controller';

const router = Router();
const controller = new AnnouncementController();

router.get('/active', controller.getActive);

export default router;
