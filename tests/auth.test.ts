import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { UserModel } from '../src/models/user.model';
import { UserRole, UserStatus, ErrorCode } from '../src/types';

const app = createApp();

describe('Authentication & Authorization Tests', () => {
  it('should successfully register a new client with PENDING status', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'client_tn',
      fullName: 'عميل تونس',
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('client_tn');
    expect(res.body.data.status).toBe(UserStatus.PENDING);
    expect(res.body.message).toContain('حسابك في انتظار موافقة الإدارة');
  });

  it('should prevent login for PENDING accounts with ACCOUNT_PENDING code', async () => {
    // Create pending user
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);
    await UserModel.create({
      username: 'pending_user',
      fullName: 'مستخدم معلق',
      passwordHash,
      role: UserRole.CLIENT,
      status: UserStatus.PENDING
    });

    const res = await request(app).post('/api/auth/login').send({
      username: 'pending_user',
      password: 'Password123!'
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe(ErrorCode.ACCOUNT_PENDING);
    expect(res.body.message).toContain('حسابك في انتظار موافقة الإدارة');
  });

  it('should allow login once account is ACTIVE and return JWT tokens', async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);
    await UserModel.create({
      username: 'active_client',
      fullName: 'عميل مفعل',
      passwordHash,
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      balance: 50.0
    });

    const res = await request(app).post('/api/auth/login').send({
      username: 'active_client',
      password: 'Password123!'
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.balance).toBe(50.0);
  });

  it('should reject invalid password with 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'active_client',
      password: 'WrongPassword'
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe(ErrorCode.INVALID_CREDENTIALS);
  });

  it('should block CLIENT from accessing ADMIN routes with 403 FORBIDDEN', async () => {
    // 1. Login as active client
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);
    await UserModel.create({
      username: 'normal_client',
      fullName: 'عميل عادي',
      passwordHash,
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'normal_client',
      password: 'Password123!'
    });
    const clientToken = loginRes.body.data.accessToken;

    // 2. Try to hit admin endpoint
    const adminRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(adminRes.status).toBe(403);
    expect(adminRes.body.success).toBe(false);
    expect(adminRes.body.code).toBe(ErrorCode.FORBIDDEN);
  });
});
