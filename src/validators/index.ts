import { z } from 'zod';
import { UserStatus, OrderStatus, UserRole } from '../types';

export const registerSchema = z.object({
  body: z
    .object({
      username: z
        .string({ required_error: 'اسم المستخدم مطلوب' })
        .min(3, 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل')
        .max(30, 'اسم المستخدم طويل جداً')
        .regex(/^[a-zA-Z0-9_]+$/, 'يجب أن يحتوي اسم المستخدم على حروف وأرقام إنجليزية فقط بدون مسافات'),
      fullName: z
        .string({ required_error: 'الاسم الكامل مطلوب' })
        .min(3, 'الاسم الكامل يجب أن يتكون من 3 أحرف على الأقل'),
      password: z
        .string({ required_error: 'كلمة المرور مطلوبة' })
        .min(8, 'يجب أن لا تقل كلمة المرور عن 8 أحرف'),
      confirmPassword: z.string({ required_error: 'تأكيد كلمة المرور مطلوب' })
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'كلمتا المرور غير متطابقتين',
      path: ['confirmPassword']
    })
});

export const loginSchema = z.object({
  body: z.object({
    username: z.string({ required_error: 'اسم المستخدم مطلوب' }),
    password: z.string({ required_error: 'كلمة المرور مطلوبة' })
  })
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: 'رمز التحديث مطلوب' })
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string({ required_error: 'كلمة المرور الحالية مطلوبة' }),
    newPassword: z
      .string({ required_error: 'كلمة المرور الجديدة مطلوبة' })
      .min(8, 'يجب أن لا تقل كلمة المرور الجديدة عن 8 أحرف')
  })
});

export const createOrderSchema = z.object({
  body: z.object({
    packId: z.string({ required_error: 'معرف الباقة مطلوب' }).regex(/^[0-9a-fA-F]{24}$/, 'معرف الباقة غير صالح'),
    beneficiaryNumber: z
      .string({ required_error: 'رقم المستفيد مطلوب' })
      .regex(/^(2|4|5|9)[0-9]{7}$/, 'رقم الهاتف غير صالح. يجب أن يتكون من 8 أرقام تونسية تبدأ بـ 2 أو 4 أو 5 أو 9')
  })
});

export const createNetworkSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'اسم الشبكة مطلوب' }).min(2),
    code: z.string({ required_error: 'رمز الشبكة مطلوب' }).toUpperCase(),
    logo: z.string().optional().default(''),
    brandColor: z.string().optional().default('#1E88E5'),
    isActive: z.boolean().optional().default(true)
  })
});

export const updateNetworkSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    code: z.string().toUpperCase().optional(),
    logo: z.string().optional(),
    brandColor: z.string().optional(),
    isActive: z.boolean().optional()
  })
});

export const createPackSchema = z.object({
  body: z.object({
    networkId: z.string({ required_error: 'معرف الشبكة مطلوب' }).regex(/^[0-9a-fA-F]{24}$/, 'معرف الشبكة غير صالح'),
    name: z.string({ required_error: 'اسم الباقة مطلوب' }).min(2),
    dataAmount: z.string({ required_error: 'حجم البيانات مطلوب' }).min(1),
    price: z.number({ required_error: 'السعر مطلوب' }).positive('يجب أن يكون السعر أكبر من الصفر'),
    description: z.string().optional().default(''),
    isActive: z.boolean().optional().default(true)
  })
});

export const updatePackSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    dataAmount: z.string().optional(),
    price: z.number().positive('يجب أن يكون السعر أكبر من الصفر').optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional()
  })
});

export const updateUserStatusSchema = z.object({
  body: z.object({
    status: z.enum([UserStatus.ACTIVE, UserStatus.REJECTED, UserStatus.BLOCKED], {
      required_error: 'الحالة الجديدة مطلوبة'
    })
  })
});

export const addBalanceSchema = z.object({
  body: z.object({
    amount: z.number({ required_error: 'المبلغ مطلوب' }).positive('يجب أن يكون المبلغ أكبر من الصفر'),
    description: z.string().optional().default('شحن رصيد من قبل الإدارة')
  })
});

export const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'عنوان الإعلان مطلوب' }).min(3),
    message: z.string({ required_error: 'نص الإعلان مطلوب' }).min(5),
    isActive: z.boolean().optional().default(true)
  })
});

export const updateAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    message: z.string().min(5).optional(),
    isActive: z.boolean().optional()
  })
});
