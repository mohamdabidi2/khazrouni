"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const network_controller_1 = require("../controllers/network.controller");
const router = (0, express_1.Router)();
const controller = new network_controller_1.NetworkController();
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
exports.default = router;
