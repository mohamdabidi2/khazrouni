import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { UserModel } from '../src/models/user.model';
import { NetworkModel } from '../src/models/network.model';
import { PackModel } from '../src/models/pack.model';
import { OrderModel } from '../src/models/order.model';
import { WalletTransactionModel } from '../src/models/wallet-transaction.model';
import { UserRole, UserStatus, OrderStatus, WalletTransactionType, ErrorCode } from '../src/types';

const app = createApp();

describe('Orders & Wallet Critical Financial Operations', () => {
  let clientToken: string;
  let clientId: string;
  let otherClientToken: string;
  let pack60Id: string;
  let pack30Id: string;
  let pack80Id: string;

  beforeEach(async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    // 1. Create Network
    const network = await NetworkModel.create({
      name: 'Ooredoo Tunisie',
      code: 'OOREDOO',
      logo: 'assets/networks/ooredoo.png',
      isActive: true
    });

    // 2. Create Packs
    const pack60 = await PackModel.create({
      networkId: network._id,
      name: 'باقة 60 د.ت',
      dataAmount: '75 Go',
      price: 60.0,
      isActive: true
    });
    pack60Id = pack60._id.toString();

    const pack30 = await PackModel.create({
      networkId: network._id,
      name: 'باقة 30 د.ت',
      dataAmount: '35 Go',
      price: 30.0,
      isActive: true
    });
    pack30Id = pack30._id.toString();

    const pack80 = await PackModel.create({
      networkId: network._id,
      name: 'باقة 80 د.ت',
      dataAmount: '100 Go',
      price: 80.0,
      isActive: true
    });
    pack80Id = pack80._id.toString();

    // 3. Create Main Client with 100 DT Balance
    const client = await UserModel.create({
      username: 'main_client',
      fullName: 'العميل الأساسي',
      passwordHash,
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      balance: 100.0
    });
    clientId = client._id.toString();

    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'main_client',
      password: 'Password123!'
    });
    clientToken = loginRes.body.data.accessToken;

    // 4. Create Other Client
    await UserModel.create({
      username: 'other_client',
      fullName: 'عميل آخر',
      passwordHash,
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      balance: 100.0
    });

    const otherLoginRes = await request(app).post('/api/auth/login').send({
      username: 'other_client',
      password: 'Password123!'
    });
    otherClientToken = otherLoginRes.body.data.accessToken;
  });

  it('Critical Requirement 122: Reserve 60 DT from 100 DT, Cancel -> Refund, Cancel again -> Fail (No Double Refund)', async () => {
    // 1. Create Order
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        packId: pack60Id,
        beneficiaryNumber: '98123456'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const orderId = createRes.body.data._id;
    expect(createRes.body.data.status).toBe(OrderStatus.PENDING);
    expect(createRes.body.data.orderNumber).toMatch(/^KG-\d{8}-\d{6}$/);

    // Verify balance is now 40
    let user = await UserModel.findById(clientId);
    expect(user!.balance).toBe(40.0);

    // Verify Reserve Transaction exists
    const reserveTx = await WalletTransactionModel.findOne({
      orderId,
      type: WalletTransactionType.RESERVE
    });
    expect(reserveTx).toBeDefined();
    expect(reserveTx!.amount).toBe(-60.0);
    expect(reserveTx!.balanceAfter).toBe(40.0);

    // 2. Cancel Order
    const cancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.status).toBe(OrderStatus.CANCELLED);

    // Verify balance restored to 100
    user = await UserModel.findById(clientId);
    expect(user!.balance).toBe(100.0);

    // Verify Refund Transaction exists
    const refundTx = await WalletTransactionModel.findOne({
      orderId,
      type: WalletTransactionType.REFUND
    });
    expect(refundTx).toBeDefined();
    expect(refundTx!.amount).toBe(60.0);
    expect(refundTx!.balanceAfter).toBe(100.0);

    // 3. Try to Cancel again -> MUST FAIL
    const cancelAgainRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(cancelAgainRes.status).toBe(400);
    expect(cancelAgainRes.body.success).toBe(false);

    // Ensure balance is STILL 100 (No double refund)
    user = await UserModel.findById(clientId);
    expect(user!.balance).toBe(100.0);

    const refundsCount = await WalletTransactionModel.countDocuments({
      orderId,
      type: WalletTransactionType.REFUND
    });
    expect(refundsCount).toBe(1);
  });

  it('Critical Requirement 33: Prevent Negative Balance when Balance < Pack Price', async () => {
    // Set balance to 20 DT
    await UserModel.findByIdAndUpdate(clientId, { balance: 20.0 });

    // Try to buy 30 DT pack
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        packId: pack30Id,
        beneficiaryNumber: '21123456'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe(ErrorCode.INSUFFICIENT_BALANCE);
    expect(res.body.message).toContain('رصيدك غير كافٍ');

    const user = await UserModel.findById(clientId);
    expect(user!.balance).toBe(20.0);
  });

  it('Critical Requirement 123: Concurrent orders (100 DT balance, 2x 80 DT orders) -> Only 1 succeeds, balance 20 DT, never negative', async () => {
    // Fire two requests concurrently
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ packId: pack80Id, beneficiaryNumber: '98111111' }),
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ packId: pack80Id, beneficiaryNumber: '98222222' })
    ]);

    const statuses = [res1.status, res2.status].sort();
    // One must be 201, one must be 400
    expect(statuses).toEqual([201, 400]);

    const successfulRes = res1.status === 201 ? res1 : res2;
    const failedRes = res1.status === 400 ? res1 : res2;

    expect(successfulRes.body.success).toBe(true);
    expect(failedRes.body.success).toBe(false);
    expect(failedRes.body.code).toBe(ErrorCode.INSUFFICIENT_BALANCE);

    // Final balance MUST be exactly 20.0, never negative
    const user = await UserModel.findById(clientId);
    expect(user!.balance).toBe(20.0);
  });

  it('Critical Requirement 77: Client cannot access another Client order', async () => {
    // Main client creates order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ packId: pack30Id, beneficiaryNumber: '55123456' });

    const orderId = orderRes.body.data._id;

    // Other client tries to access this order
    const accessRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${otherClientToken}`);

    expect(accessRes.status).toBe(403);
    expect(accessRes.body.success).toBe(false);

    // Other client tries to cancel this order
    const cancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${otherClientToken}`);

    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body.success).toBe(false);
  });
});
