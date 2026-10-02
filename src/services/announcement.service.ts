import { AnnouncementRepository } from '../repositories/announcement.repository';
import { IAnnouncement } from '../models/announcement.model';
import { NotFoundError } from '../utils/errors';
import { SocketEmitter } from '../sockets/socket.service';

export class AnnouncementService {
  private announcementRepo: AnnouncementRepository;

  constructor() {
    this.announcementRepo = new AnnouncementRepository();
  }

  async getActive(): Promise<IAnnouncement[]> {
    return this.announcementRepo.findActive();
  }

  async getAll(): Promise<IAnnouncement[]> {
    return this.announcementRepo.findAll();
  }

  async create(data: Partial<IAnnouncement>): Promise<IAnnouncement> {
    const announcement = await this.announcementRepo.create(data);
    SocketEmitter.emitToAll('announcement.updated', announcement);
    return announcement;
  }

  async update(id: string, data: Partial<IAnnouncement>): Promise<IAnnouncement> {
    const updated = await this.announcementRepo.updateById(id, data);
    if (!updated) {
      throw new NotFoundError('الإعلان غير موجود');
    }
    SocketEmitter.emitToAll('announcement.updated', updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.announcementRepo.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('الإعلان غير موجود');
    }
    SocketEmitter.emitToAll('announcement.deleted', { id });
  }
}
