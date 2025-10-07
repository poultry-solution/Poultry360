import { Router } from 'express';
import { 
  generateChatUploadUrl, 
  verifyChatUpload, 
  getAttachmentViewUrl, 
  deleteUploadedFile,
  TestR2List,
  TestR2Presign
} from '../controller/s3Controller';
import { authMiddleware } from '../middelware/middelware';

const router = Router();

// All routes require authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, []); // Allow all authenticated users
});

// Chat attachment endpoints
router.post('/chat/upload-url', generateChatUploadUrl);
router.post('/chat/verify-upload', verifyChatUpload);
router.get('/chat/view/:attachmentKey', getAttachmentViewUrl);
router.delete('/chat/delete/:attachmentKey', deleteUploadedFile);

// Legacy test endpoints
router.get('/test', TestR2List);
router.get('/test2', TestR2Presign);

export default router;