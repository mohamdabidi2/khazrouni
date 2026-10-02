"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackModel = void 0;
const mongoose_1 = require("mongoose");
const packSchema = new mongoose_1.Schema({
    networkId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Network',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    dataAmount: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'لا يمكن أن يكون السعر أقل من 0'],
        set: (val) => Math.round(val * 1000) / 1000
    },
    description: {
        type: String,
        default: '',
        trim: true
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
packSchema.index({ networkId: 1, isActive: 1 });
exports.PackModel = (0, mongoose_1.model)('Pack', packSchema);
