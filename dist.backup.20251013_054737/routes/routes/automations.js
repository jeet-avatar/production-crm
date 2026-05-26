"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', async (req, res, next) => {
    try {
        res.json({ message: 'Automations endpoint - to be implemented' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
