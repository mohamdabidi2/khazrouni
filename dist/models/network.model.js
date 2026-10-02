"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkModel = void 0;
const mongoose_1 = require("mongoose");
const networkSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    logo: {
        type: String,
        required: true
    },
    brandColor: {
        type: String,
        default: '#1E88E5'
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true,
    toJSON: {
        transform: (_, ret) => {
            delete ret.__v;
            return ret;
        }
    }
});
exports.NetworkModel = (0, mongoose_1.model)('Network', networkSchema);
