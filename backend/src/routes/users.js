import express from 'express';
import { getAllUsers, updateUserRole, deleteUser, updateProfile, requestPasswordChange, confirmPasswordChange, uploadAvatar } from '../controllers/userController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 📂 Multer Configuration for Avatars
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/avatars';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error("Only JPEG, JPG, and PNG images are allowed"));
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = express.Router();

// 🔒 Protected Routes: Only Admins can access these
router.get('/', verifyToken, isAdmin, getAllUsers);
router.put('/:id/role', verifyToken, isAdmin, updateUserRole);
router.delete('/:id', verifyToken, isAdmin, deleteUser);

// 👤 Profile Routes (Authenticated Users)
router.put('/update-profile', verifyToken, updateProfile);
router.post('/request-password-change', verifyToken, requestPasswordChange);
router.post('/confirm-password-change', verifyToken, confirmPasswordChange);
router.post('/upload-avatar', verifyToken, upload.single('avatar'), uploadAvatar);

export default router;