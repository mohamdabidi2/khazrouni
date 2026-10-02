"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pack_controller_1 = require("../controllers/pack.controller");
const router = (0, express_1.Router)();
const controller = new pack_controller_1.PackController();
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
exports.default = router;
