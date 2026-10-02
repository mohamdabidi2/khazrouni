"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const database_1 = require("./config/database");
const swagger_1 = require("./docs/swagger");
const logger_middleware_1 = require("./middleware/logger.middleware");
const rate_limiter_middleware_1 = require("./middleware/rate-limiter.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
// Import Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const client_routes_1 = __importDefault(require("./routes/client.routes"));
const network_routes_1 = __importDefault(require("./routes/network.routes"));
const pack_routes_1 = __importDefault(require("./routes/pack.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const wallet_routes_1 = __importDefault(require("./routes/wallet.routes"));
const announcement_routes_1 = __importDefault(require("./routes/announcement.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const createApp = () => {
    const app = (0, express_1.default)();
    // 1. Security Middlewares
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginEmbedderPolicy: false,
    }));
    const corsOptions = {
        origin: true, // Dynamically echoes request origin, allowing localhost on any port
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
        exposedHeaders: ['Content-Range', 'X-Total-Count'],
    };
    app.use((0, cors_1.default)(corsOptions));
    app.options('*', (0, cors_1.default)(corsOptions));
    // 2. Parsing Middlewares
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // 3. Observability
    app.use(logger_middleware_1.requestLogger);
    // 4. Rate Limiting for general API
    app.use('/api', rate_limiter_middleware_1.apiRateLimiter);
    // 5. Health Check
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            database: (0, database_1.isDbConnected)() ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    });
    // 6. Swagger API Documentation
    app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerDocument));
    // 7. Mount Module Routes
    app.use('/api/auth', auth_routes_1.default);
    app.use('/api/client', client_routes_1.default);
    app.use('/api/networks', network_routes_1.default);
    app.use('/api/packs', pack_routes_1.default);
    app.use('/api/orders', order_routes_1.default);
    app.use('/api/wallet', wallet_routes_1.default);
    app.use('/api/announcements', announcement_routes_1.default);
    app.use('/api/notifications', notification_routes_1.default);
    app.use('/api/admin', admin_routes_1.default);
    // 8. 404 Route Handler
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: `المسار ${req.originalUrl} غير موجود`,
            code: 'ROUTE_NOT_FOUND'
        });
    });
    // 9. Central Error Handler
    app.use(error_middleware_1.errorHandler);
    return app;
};
exports.createApp = createApp;
