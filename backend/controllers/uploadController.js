import dotenv from 'dotenv';
dotenv.config();

import ImageKit from 'imagekit';
import multer from 'multer';

// -------------------- MULTER CONFIG --------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// -------------------- IMAGEKIT INIT (SAFE) --------------------
function getImageKit() {
  return new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
}

// -------------------- MIDDLEWARE --------------------
export const uploadMiddleware = upload.single('file');

// -------------------- CONTROLLER --------------------
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const imagekit = getImageKit();

    const base64File = req.file.buffer.toString('base64');

    const result = await imagekit.upload({
      file: base64File,
      fileName: `${Date.now()}-${req.file.originalname}`,
      folder: 'verbal-quiz',
      useUniqueFileName: true,
    });

    return res.status(201).json({
      url: result.url,
      fileId: result.fileId,
    });
  } catch (error) {
    next(error);
  }
};