import { IAnnouncement, AnnouncementModel } from '../models/announcement.model';

export class AnnouncementRepository {
  async findActive(): Promise<IAnnouncement[]> {
    return AnnouncementModel.find({ isActive: true }).sort({ createdAt: -1 });
  }

  async findLatestActive(): Promise<IAnnouncement | null> {
    return AnnouncementModel.findOne({ isActive: true }).sort({ createdAt: -1 });
  }

  async findAll(): Promise<IAnnouncement[]> {
    return AnnouncementModel.find().sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<IAnnouncement | null> {
    return AnnouncementModel.findById(id);
  }

  async create(data: Partial<IAnnouncement>): Promise<IAnnouncement> {
    const announcement = new AnnouncementModel(data);
    return announcement.save();
  }

  async updateById(id: string, data: Partial<IAnnouncement>): Promise<IAnnouncement | null> {
    return AnnouncementModel.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteById(id: string): Promise<IAnnouncement | null> {
    return AnnouncementModel.findByIdAndDelete(id);
  }
}
