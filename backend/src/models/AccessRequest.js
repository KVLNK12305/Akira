import mongoose from 'mongoose';

const accessRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requestedRole: {
        type: String,
        enum: ['Developer', 'Auditor', 'Admin'],
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true,
        minlength: 10
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedAt: Date
}, { timestamps: true });

const AccessRequest = mongoose.model('AccessRequest', accessRequestSchema);
export default AccessRequest;
