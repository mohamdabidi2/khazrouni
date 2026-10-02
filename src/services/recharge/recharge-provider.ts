export interface RechargeRequest {
  orderId: string;
  orderNumber: string;
  networkCode: string;
  beneficiaryNumber: string;
  packName: string;
  dataAmount: string;
  price: number;
}

export interface RechargeResult {
  success: boolean;
  externalReference?: string;
  message: string;
  isAutomatic: boolean;
}

export interface IRechargeProvider {
  name: string;
  recharge(request: RechargeRequest): Promise<RechargeResult>;
}

export class ManualRechargeProvider implements IRechargeProvider {
  name = 'ManualProvider';

  async recharge(request: RechargeRequest): Promise<RechargeResult> {
    return {
      success: true,
      externalReference: `MANUAL-${Date.now()}`,
      message: `تم تجهيز طلب الشحن اليدوي للرقم ${request.beneficiaryNumber} بنجاح.`,
      isAutomatic: false
    };
  }
}

export class TunisieTelecomProvider implements IRechargeProvider {
  name = 'TunisieTelecomProvider';

  async recharge(request: RechargeRequest): Promise<RechargeResult> {
    // In current version, defaults to manual handling by admin
    return new ManualRechargeProvider().recharge(request);
  }
}

export class OrangeTunisieProvider implements IRechargeProvider {
  name = 'OrangeTunisieProvider';

  async recharge(request: RechargeRequest): Promise<RechargeResult> {
    return new ManualRechargeProvider().recharge(request);
  }
}

export class OoredooTunisieProvider implements IRechargeProvider {
  name = 'OoredooTunisieProvider';

  async recharge(request: RechargeRequest): Promise<RechargeResult> {
    return new ManualRechargeProvider().recharge(request);
  }
}

export class RechargeProviderFactory {
  static getProvider(networkCode: string): IRechargeProvider {
    switch (networkCode.toUpperCase()) {
      case 'TT':
        return new TunisieTelecomProvider();
      case 'ORANGE':
        return new OrangeTunisieProvider();
      case 'OOREDOO':
        return new OoredooTunisieProvider();
      default:
        return new ManualRechargeProvider();
    }
  }
}
