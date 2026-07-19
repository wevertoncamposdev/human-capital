import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

const AVATAR_DIR = join(process.cwd(), 'uploads', 'avatars');
const HEALTH_DOC_DIR = join(process.cwd(), 'uploads', 'health');
const TENANT_LOGO_DIR = join(process.cwd(), 'uploads', 'tenants');
const ACTION_PHOTO_DIR = join(process.cwd(), 'uploads', 'actions');
const PEOPLE_ATTACHMENT_DIR = join(process.cwd(), 'uploads', 'people');
const PANTRY_ATTACHMENT_DIR = join(process.cwd(), 'uploads', 'pantry');
const DEPOSIT_ATTACHMENT_DIR = join(process.cwd(), 'uploads', 'deposit');
const PROGRAM_ATTACHMENT_DIR = join(process.cwd(), 'uploads', 'programs');
const PROJECT_ATTACHMENT_DIR = join(process.cwd(), 'uploads', 'projects');
const ACTION_ATTACHMENT_DIR = join(process.cwd(), 'uploads', 'action-attachments');
const TASK_ATTACHMENT_DIR = join(process.cwd(), 'uploads', 'tasks');
const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024;
const MAX_HEALTH_FILE_SIZE = 6 * 1024 * 1024;
const MAX_TENANT_LOGO_SIZE = 3 * 1024 * 1024;
const MAX_ACTION_PHOTO_FILE_SIZE = 6 * 1024 * 1024;
const MAX_PEOPLE_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PANTRY_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DEPOSIT_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PROGRAM_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PROJECT_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ACTION_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TASK_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_AVATAR_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const ALLOWED_HEALTH_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
]);
const ALLOWED_TENANT_LOGO_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
]);
const ALLOWED_ACTION_PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const ALLOWED_PEOPLE_ATTACHMENT_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
]);
const ALLOWED_PANTRY_ATTACHMENT_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
]);
const ALLOWED_DEPOSIT_ATTACHMENT_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
]);
const ALLOWED_PROGRAM_ATTACHMENT_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
]);
const ALLOWED_ACTION_ATTACHMENT_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
]);
const ALLOWED_PROJECT_ATTACHMENT_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
]);
const ALLOWED_TASK_ATTACHMENT_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
]);

function ensureAvatarDir() {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

function ensureHealthDocDir() {
  fs.mkdirSync(HEALTH_DOC_DIR, { recursive: true });
}

function ensureTenantLogoDir() {
  fs.mkdirSync(TENANT_LOGO_DIR, { recursive: true });
}

function ensureActionPhotoDir() {
  fs.mkdirSync(ACTION_PHOTO_DIR, { recursive: true });
}

function ensurePeopleAttachmentDir() {
  fs.mkdirSync(PEOPLE_ATTACHMENT_DIR, { recursive: true });
}

function ensurePantryAttachmentDir() {
  fs.mkdirSync(PANTRY_ATTACHMENT_DIR, { recursive: true });
}

function ensureDepositAttachmentDir() {
  fs.mkdirSync(DEPOSIT_ATTACHMENT_DIR, { recursive: true });
}

function ensureProgramAttachmentDir() {
  fs.mkdirSync(PROGRAM_ATTACHMENT_DIR, { recursive: true });
}

function ensureProjectAttachmentDir() {
  fs.mkdirSync(PROJECT_ATTACHMENT_DIR, { recursive: true });
}

function ensureActionAttachmentDir() {
  fs.mkdirSync(ACTION_ATTACHMENT_DIR, { recursive: true });
}

function ensureTaskAttachmentDir() {
  fs.mkdirSync(TASK_ATTACHMENT_DIR, { recursive: true });
}

@Controller('files')
export class FilesController {
  @Post('avatars')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureAvatarDir();
          cb(null, AVATAR_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const safeExt = ALLOWED_AVATAR_EXTENSIONS.has(ext) ? ext : '';
          const filename = `${randomUUID()}${safeExt}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: MAX_AVATAR_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Formato de arquivo invalido.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadAvatar(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatorio.');
    }

    return {
      path: `/uploads/avatars/${file.filename}`,
    };
  }

  @Post('health-documents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureHealthDocDir();
          cb(null, HEALTH_DOC_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const safeExt = ALLOWED_HEALTH_EXTENSIONS.has(ext) ? ext : '';
          const filename = `${randomUUID()}${safeExt}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: MAX_HEALTH_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (
          !file.mimetype.startsWith('image/') &&
          file.mimetype !== 'application/pdf'
        ) {
          cb(new BadRequestException('Formato de arquivo invalido.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadHealthDocument(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatorio.');
    }

    return {
      path: `/uploads/health/${file.filename}`,
    };
  }

  @Post('tenant-logos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureTenantLogoDir();
          cb(null, TENANT_LOGO_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const safeExt = ALLOWED_TENANT_LOGO_EXTENSIONS.has(ext) ? ext : '';
          const filename = `${randomUUID()}${safeExt}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: MAX_TENANT_LOGO_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Formato de arquivo invalido.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadTenantLogo(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatorio.');
    }

    return {
      path: `/uploads/tenants/${file.filename}`,
    };
  }

  @Post('action-photos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureActionPhotoDir();
          cb(null, ACTION_PHOTO_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const safeExt = ALLOWED_ACTION_PHOTO_EXTENSIONS.has(ext) ? ext : '';
          const filename = `${randomUUID()}${safeExt}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: MAX_ACTION_PHOTO_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Formato de arquivo invalido.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadActionPhoto(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatorio.');
    }

    return {
      path: `/uploads/actions/${file.filename}`,
    };
  }

  @Post('people-attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensurePeopleAttachmentDir();
          cb(null, PEOPLE_ATTACHMENT_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const safeExt = ALLOWED_PEOPLE_ATTACHMENT_EXTENSIONS.has(ext) ? ext : '';
          const filename = `${randomUUID()}${safeExt}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: MAX_PEOPLE_ATTACHMENT_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_PEOPLE_ATTACHMENT_EXTENSIONS.has(ext)) {
          cb(new BadRequestException('Formato de arquivo invalido.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadPeopleAttachment(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatorio.');
    }

    return {
      path: `/uploads/people/${file.filename}`,
      mimeType: file.mimetype || null,
      size: file.size ?? null,
      originalName: file.originalname || file.filename,
    };
  }

  @Post('pantry-attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensurePantryAttachmentDir();
          cb(null, PANTRY_ATTACHMENT_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const safeExt = ALLOWED_PANTRY_ATTACHMENT_EXTENSIONS.has(ext) ? ext : '';
          const filename = `${randomUUID()}${safeExt}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: MAX_PANTRY_ATTACHMENT_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_PANTRY_ATTACHMENT_EXTENSIONS.has(ext)) {
          cb(new BadRequestException('Formato de arquivo invalido.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadPantryAttachment(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatorio.');
    }

    return {
      path: `/uploads/pantry/${file.filename}`,
      mimeType: file.mimetype || null,
      size: file.size ?? null,
      originalName: file.originalname || file.filename,
    };
  }

  @Post('deposit-attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureDepositAttachmentDir();
          cb(null, DEPOSIT_ATTACHMENT_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const safeExt = ALLOWED_DEPOSIT_ATTACHMENT_EXTENSIONS.has(ext) ? ext : '';
          const filename = `${randomUUID()}${safeExt}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: MAX_DEPOSIT_ATTACHMENT_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_DEPOSIT_ATTACHMENT_EXTENSIONS.has(ext)) {
          cb(new BadRequestException('Formato de arquivo invalido.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadDepositAttachment(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatorio.');
    }

    return {
      path: `/uploads/deposit/${file.filename}`,
      mimeType: file.mimetype || null,
      size: file.size ?? null,
      originalName: file.originalname || file.filename,
    };
  }

  @Post('program-attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureProgramAttachmentDir();
          cb(null, PROGRAM_ATTACHMENT_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const safeExt = ALLOWED_PROGRAM_ATTACHMENT_EXTENSIONS.has(ext) ? ext : '';
          const filename = `${randomUUID()}${safeExt}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: MAX_PROGRAM_ATTACHMENT_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_PROGRAM_ATTACHMENT_EXTENSIONS.has(ext)) {
          cb(new BadRequestException('Formato de arquivo invalido.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadProgramAttachment(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatorio.');
    }

    return {
      path: `/uploads/programs/${file.filename}`,
      mimeType: file.mimetype || null,
      size: file.size ?? null,
      originalName: file.originalname || file.filename,
    };
  }

  @Post('project-attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureProjectAttachmentDir();
          cb(null, PROJECT_ATTACHMENT_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const safeExt = ALLOWED_PROJECT_ATTACHMENT_EXTENSIONS.has(ext) ? ext : '';
          const filename = `${randomUUID()}${safeExt}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: MAX_PROJECT_ATTACHMENT_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_PROJECT_ATTACHMENT_EXTENSIONS.has(ext)) {
          cb(new BadRequestException('Formato de arquivo invalido.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadProjectAttachment(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatorio.');
    }

    return {
      path: `/uploads/projects/${file.filename}`,
      mimeType: file.mimetype || null,
      size: file.size ?? null,
      originalName: file.originalname || file.filename,
    };
  }

  @Post('action-attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureActionAttachmentDir();
          cb(null, ACTION_ATTACHMENT_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const safeExt = ALLOWED_ACTION_ATTACHMENT_EXTENSIONS.has(ext) ? ext : '';
          const filename = `${randomUUID()}${safeExt}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: MAX_ACTION_ATTACHMENT_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_ACTION_ATTACHMENT_EXTENSIONS.has(ext)) {
          cb(new BadRequestException('Formato de arquivo invalido.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadActionAttachment(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatorio.');
    }

    return {
      path: `/uploads/action-attachments/${file.filename}`,
      mimeType: file.mimetype || null,
      size: file.size ?? null,
      originalName: file.originalname || file.filename,
    };
  }

  @Post('task-attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureTaskAttachmentDir();
          cb(null, TASK_ATTACHMENT_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const safeExt = ALLOWED_TASK_ATTACHMENT_EXTENSIONS.has(ext) ? ext : '';
          const filename = `${randomUUID()}${safeExt}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: MAX_TASK_ATTACHMENT_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_TASK_ATTACHMENT_EXTENSIONS.has(ext)) {
          cb(new BadRequestException('Formato de arquivo invalido.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadTaskAttachment(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatorio.');
    }

    return {
      path: `/uploads/tasks/${file.filename}`,
      mimeType: file.mimetype || null,
      size: file.size ?? null,
      originalName: file.originalname || file.filename,
    };
  }
}
