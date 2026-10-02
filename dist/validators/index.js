"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAnnouncementSchema = exports.createAnnouncementSchema = exports.addBalanceSchema = exports.updateUserStatusSchema = exports.updatePackSchema = exports.createPackSchema = exports.updateNetworkSchema = exports.createNetworkSchema = exports.createOrderSchema = exports.changePasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        username: zod_1.z
            .string({ required_error: 'اسم المستخدم مطلوب' })
            .min(3, 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل')
            .max(30, 'اسم المستخدم طويل جداً')
            .regex(/^[a-zA-Z0-9_]+$/, 'يجب أن يحتوي اسم المستخدم على حروف وأرقام إنجليزية فقط بدون مسافات'),
        fullName: zod_1.z
            .string({ required_error: 'الاسم الكامل مطلوب' })
            .min(3, 'الاسم الكامل يجب أن يتكون من 3 أحرف على الأقل'),
        password: zod_1.z
            .string({ required_error: 'كلمة المرور مطلوبة' })
            .min(8, 'يجب أن لا تقل كلمة المرور عن 8 أحرف'),
        confirmPassword: zod_1.z.string({ required_error: 'تأكيد كلمة المرور مطلوب' })
    })
        .refine((data) => data.password === data.confirmPassword, {
        message: 'كلمتا المرور غير متطابقتين',
        path: ['confirmPassword']
    })
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        username: zod_1.z.string({ required_error: 'اسم المستخدم مطلوب' }),
        password: zod_1.z.string({ required_error: 'كلمة المرور مطلوبة' })
    })
});
exports.refreshTokenSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string({ required_error: 'رمز التحديث مطلوب' })
    })
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        oldPassword: zod_1.z.string({ required_error: 'كلمة المرور الحالية مطلوبة' }),
        newPassword: zod_1.z
            .string({ required_error: 'كلمة المرور الجديدة مطلوبة' })
            .min(8, 'يجب أن لا تقل كلمة المرور الجديدة عن 8 أحرف')
    })
});
exports.createOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        packId: zod_1.z.string({ required_error: 'معرف الباقة مطلوب' }).regex(/^[0-9a-fA-F]{24}$/, 'معرف الباقة غير صالح'),
        beneficiaryNumber: zod_1.z
            .string({ required_error: 'رقم المستفيد مطلوب' })
            .regex(/^(2|4|5|9)[0-9]{7}$/, 'رقم الهاتف غير صالح. يجب أن يتكون من 8 أرقام تونسية تبدأ بـ 2 أو 4 أو 5 أو 9')
    })
});
exports.createNetworkSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: 'اسم الشبكة مطلوب' }).min(2),
        code: zod_1.z.string({ required_error: 'رمز الشبكة مطلوب' }).toUpperCase(),
        logo: zod_1.z.string().optional().default(''),
        brandColor: zod_1.z.string().optional().default('#1E88E5'),
        isActive: zod_1.z.boolean().optional().default(true)
    })
});
exports.updateNetworkSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).optional(),
        code: zod_1.z.string().toUpperCase().optional(),
        logo: zod_1.z.string().optional(),
        brandColor: zod_1.z.string().optional(),
        isActive: zod_1.z.boolean().optional()
    })
});
exports.createPackSchema = zod_1.z.object({
    body: zod_1.z.object({
        networkId: zod_1.z.string({ required_error: 'معرف الشبكة مطلوب' }).regex(/^[0-9a-fA-F]{24}$/, 'معرف الشبكة غير صالح'),
        name: zod_1.z.string({ required_error: 'اسم الباقة مطلوب' }).min(2),
        dataAmount: zod_1.z.string({ required_error: 'حجم البيانات مطلوب' }).min(1),
        price: zod_1.z.number({ required_error: 'السعر مطلوب' }).positive('يجب أن يكون السعر أكبر من الصفر'),
        description: zod_1.z.string().optional().default(''),
        isActive: zod_1.z.boolean().optional().default(true)
    })
});
exports.updatePackSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).optional(),
        dataAmount: zod_1.z.string().optional(),
        price: zod_1.z.number().positive('يجب أن يكون السعر أكبر من الصفر').optional(),
        description: zod_1.z.string().optional(),
        isActive: zod_1.z.boolean().optional()
    })
});
exports.updateUserStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum([types_1.UserStatus.ACTIVE, types_1.UserStatus.REJECTED, types_1.UserStatus.BLOCKED], {
            required_error: 'الحالة الجديدة مطلوبة'
        })
    })
});
exports.addBalanceSchema = zod_1.z.object({
    body: zod_1.z.object({
        amount: zod_1.z.number({ required_error: 'المبلغ مطلوب' }).positive('يجب أن يكون المبلغ أكبر من الصفر'),
        description: zod_1.z.string().optional().default('شحن رصيد من قبل الإدارة')
    })
});
exports.createAnnouncementSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string({ required_error: 'عنوان الإعلان مطلوب' }).min(3),
        message: zod_1.z.string({ required_error: 'نص الإعلان مطلوب' }).min(5),
        isActive: zod_1.z.boolean().optional().default(true)
    })
});
exports.updateAnnouncementSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3).optional(),
        message: zod_1.z.string().min(5).optional(),
        isActive: zod_1.z.boolean().optional()
    })
});
