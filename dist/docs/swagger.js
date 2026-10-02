"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerDocument = void 0;
exports.swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'Khazrouni Giga API — مركز الإنترنت الشامل',
        version: '1.0.0',
        description: 'Documentation for the full Khazrouni Giga Tunisian Telecom Recharge Backend API.'
    },
    servers: [
        {
            url: '/api',
            description: 'Default API Base'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        }
    },
    paths: {
        '/auth/register': {
            post: {
                summary: 'تسجيل حساب عميل جديد',
                tags: ['Auth'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    username: { type: 'string', example: 'ahmed_tn' },
                                    fullName: { type: 'string', example: 'أحمد التونسي' },
                                    password: { type: 'string', example: 'Secret12345' },
                                    confirmPassword: { type: 'string', example: 'Secret12345' }
                                },
                                required: ['username', 'fullName', 'password', 'confirmPassword']
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'تم إنشاء الحساب بنجاح وهو في انتظار الموافقة' }
                }
            }
        },
        '/auth/login': {
            post: {
                summary: 'تسجيل الدخول وإصدار التوكن',
                tags: ['Auth'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    username: { type: 'string', example: 'admin_khazrouni' },
                                    password: { type: 'string', example: 'AdminSecure@2026!' }
                                },
                                required: ['username', 'password']
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'تم تسجيل الدخول بنجاح مع Access/Refresh tokens' }
                }
            }
        },
        '/client/dashboard': {
            get: {
                summary: 'بيانات لوحة تحكم العميل',
                tags: ['Client'],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'بيانات العميل والرصيد والشبكات وآخر الطلبات' }
                }
            }
        },
        '/networks': {
            get: {
                summary: 'جلب قائمة مشغلي الاتصالات',
                tags: ['Networks'],
                responses: {
                    200: { description: 'قائمة مشغلي الاتصالات التونسية' }
                }
            }
        },
        '/packs': {
            get: {
                summary: 'جلب الباقات المتاحة',
                tags: ['Packs'],
                parameters: [
                    { name: 'networkId', in: 'query', schema: { type: 'string' } }
                ],
                responses: {
                    200: { description: 'قائمة باقات الإنترنت' }
                }
            }
        },
        '/orders': {
            post: {
                summary: 'إنشاء طلب شحن جديد مع حجز الرصيد ذرّياً',
                tags: ['Orders'],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    packId: { type: 'string' },
                                    beneficiaryNumber: { type: 'string', example: '98123456' }
                                },
                                required: ['packId', 'beneficiaryNumber']
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'تم إنشاء الطلب وحجز المبلغ' }
                }
            }
        },
        '/orders/my': {
            get: {
                summary: 'طلبات العميل المسجل',
                tags: ['Orders'],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'سجل طلبات العميل' }
                }
            }
        },
        '/orders/{id}/cancel': {
            post: {
                summary: 'إلغاء الطلب واسترجاع المبلغ في الحال (فقط للطلبات المعلقة)',
                tags: ['Orders'],
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'تم إلغاء الطلب وإرجاع الرصيد بنجاح' }
                }
            }
        },
        '/admin/dashboard': {
            get: {
                summary: 'لوحة الإدارة والإحصائيات الحية',
                tags: ['Admin'],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'إحصائيات المبيعات، الطلبات، العملاء، الرصيد' }
                }
            }
        },
        '/admin/orders': {
            get: {
                summary: 'إدارة واستعراض جميع الطلبات',
                tags: ['Admin'],
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'قائمة الطلبات مع الترقيم والفلترة' }
                }
            }
        }
    }
};
