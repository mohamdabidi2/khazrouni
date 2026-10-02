"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_controller_1 = require("../controllers/client.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new client_controller_1.ClientController();
router.get('/dashboard', auth_middleware_1.authenticate, auth_middleware_1.requireClient, auth_middleware_1.requireActive, controller.getDashboard);
exports.default = router;
