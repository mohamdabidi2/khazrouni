"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const announcement_controller_1 = require("../controllers/announcement.controller");
const router = (0, express_1.Router)();
const controller = new announcement_controller_1.AnnouncementController();
router.get('/active', controller.getActive);
exports.default = router;
