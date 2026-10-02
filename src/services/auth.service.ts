import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenModel } from '../models/refresh-token.model';
import { IUser } from '../models/user.model';
import { IJwtPayload, UserRole, UserStatus, ErrorCode } from '../types';
import { AppError, UnauthorizedError, ForbiddenError, ConflictError } from '../utils/errors';

export class AuthService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  async register(username: string, fullName: string, password: string):
    Promise<{ user: Partial<IUser>; message: string }> {
    const existing = await this.userRepo.findByUsername(username);
    if (existing) {
      throw new ConflictError('اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر', ErrorCode.DUPLICATE_USERNAME);
    }

    if (password.length < 8) {
      throw new AppError('يجب أن لا تقل كلمة المرور عن 8 أحرف', 400, ErrorCode.VALIDATION_ERROR);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await this.userRepo.create({
      username: username.toLowerCase().trim(),
      fullName: fullName.trim(),
      passwordHash,
      role: UserRole.CLIENT,
      status: UserStatus.PENDING,
      balance: 0
    });

    return {
      user: {
        _id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        status: newUser.status,
        balance: newUser.balance,
        createdAt: newUser.createdAt
      },
      message: 'تم إنشاء حسابك بنجاح. حسابك في انتظار موافقة الإدارة.'
    };
  }

  async login(username: string, password: string):
    Promise<{ user: Partial<IUser>; accessToken: string; refreshToken: string }> {
    const user = await this.userRepo.findByUsername(username);
    if (!user) {
      throw new UnauthorizedError('اسم المستخدم أو كلمة المرور غير صحيحة', ErrorCode.INVALID_CREDENTIALS);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('اسم المستخدم أو كلمة المرور غير صحيحة', ErrorCode.INVALID_CREDENTIALS);
    }

    // Role-independent status checks (especially for clients)
    if (user.status === UserStatus.PENDING) {
      throw new ForbiddenError('حسابك في انتظار موافقة الإدارة.', ErrorCode.ACCOUNT_PENDING);
    }

    if (user.status === UserStatus.REJECTED) {
      throw new ForbiddenError('تم رفض حسابك من قبل الإدارة.', ErrorCode.ACCOUNT_REJECTED);
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenError('تم إيقاف حسابك من قبل الإدارة.', ErrorCode.ACCOUNT_BLOCKED);
    }

    // Update lastLoginAt
    await this.userRepo.updateById(user._id.toString(), { lastLoginAt: new Date() });

    const tokens = await this.generateTokens(user);

    return {
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        balance: user.balance,
        debt: user.debt || 0,
        createdAt: user.createdAt
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  async refreshToken(refreshTokenString: string): Promise<{ accessToken: string; refreshToken: string }> {
    let decoded: { userId: string };
    try {
      decoded = jwt.verify(refreshTokenString, env.JWT_REFRESH_SECRET) as { userId: string };
    } catch {
      throw new UnauthorizedError('جلسة التحديث غير صالحة أو منتهية', ErrorCode.UNAUTHORIZED);
    }

    const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');
    const storedToken = await RefreshTokenModel.findOne({
      userId: decoded.userId,
      tokenHash,
      revokedAt: { $exists: false }
    });

    if (!storedToken) {
      throw new UnauthorizedError('جلسة التحديث ملغاة أو غير صالحة', ErrorCode.UNAUTHORIZED);
    }

    const user = await this.userRepo.findById(decoded.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenError('الحساب غير نشط أو غير موجود', ErrorCode.FORBIDDEN);
    }

    // Revoke old refresh token (Token rotation)
    storedToken.revokedAt = new Date();
    await storedToken.save();

    // Generate new pair
    return this.generateTokens(user);
  }

  async logout(refreshTokenString?: string): Promise<void> {
    if (!refreshTokenString) return;

    const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');
    await RefreshTokenModel.updateOne({ tokenHash }, { revokedAt: new Date() });
  }

  async changePassword(userId: string, oldPass: string, newPass: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedError('المستخدم غير موجود', ErrorCode.USER_NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('كلمة المرور الحالية غير صحيحة', ErrorCode.INVALID_CREDENTIALS);
    }

    if (newPass.length < 8) {
      throw new AppError('يجب أن لا تقل كلمة المرور الجديدة عن 8 أحرف', 400, ErrorCode.VALIDATION_ERROR);
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPass, salt);

    await this.userRepo.updateById(userId, { passwordHash: newHash });

    // Revoke all refresh tokens for this user on password change
    await RefreshTokenModel.updateMany({ userId }, { revokedAt: new Date() });
  }

  private async generateTokens(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: IJwtPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      status: user.status
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES as unknown as number
    });

    const refreshToken = jwt.sign({ userId: user._id.toString() }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES as unknown as number
    });

    // Store hashed refresh token in DB
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshTokenModel.create({
      userId: user._id,
      tokenHash,
      expiresAt
    });

    return { accessToken, refreshToken };
  }
}
