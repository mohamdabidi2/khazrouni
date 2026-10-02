"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = require("../controllers/order.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const validators_1 = require("../validators");
const router = (0, express_1.Router)();
const controller = new order_controller_1.OrderController();
// Create order: Client only, active only, validated
router.post('/', auth_middleware_1.authenticate, auth_middleware_1.requireClient, auth_middleware_1.requireActive, (0, validate_middleware_1.validateRequest)(validators_1.createOrderSchema), controller.createOrder);
// My orders
router.get('/my', auth_middleware_1.authenticate, auth_middleware_1.requireClient, controller.getMyOrders);
// Order by id (client or admin)
router.get('/:id', auth_middleware_1.authenticate, controller.getOrderById);
// Cancel order: Client only, pending only
router.post('/:id/cancel', auth_middleware_1.authenticate, auth_middleware_1.requireClient, controller.cancelOrder);
exports.default = router;
