"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RechargeProviderFactory = exports.OoredooTunisieProvider = exports.OrangeTunisieProvider = exports.TunisieTelecomProvider = exports.ManualRechargeProvider = void 0;
class ManualRechargeProvider {
    name = 'ManualProvider';
    async recharge(request) {
        return {
            success: true,
            externalReference: `MANUAL-${Date.now()}`,
            message: `تم تجهيز طلب الشحن اليدوي للرقم ${request.beneficiaryNumber} بنجاح.`,
            isAutomatic: false
        };
    }
}
exports.ManualRechargeProvider = ManualRechargeProvider;
class TunisieTelecomProvider {
    name = 'TunisieTelecomProvider';
    async recharge(request) {
        // In current version, defaults to manual handling by admin
        return new ManualRechargeProvider().recharge(request);
    }
}
exports.TunisieTelecomProvider = TunisieTelecomProvider;
class OrangeTunisieProvider {
    name = 'OrangeTunisieProvider';
    async recharge(request) {
        return new ManualRechargeProvider().recharge(request);
    }
}
exports.OrangeTunisieProvider = OrangeTunisieProvider;
class OoredooTunisieProvider {
    name = 'OoredooTunisieProvider';
    async recharge(request) {
        return new ManualRechargeProvider().recharge(request);
    }
}
exports.OoredooTunisieProvider = OoredooTunisieProvider;
class RechargeProviderFactory {
    static getProvider(networkCode) {
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
exports.RechargeProviderFactory = RechargeProviderFactory;
