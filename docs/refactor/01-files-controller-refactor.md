# FilesController Refactor - Implementação Detalhada

**Arquivo Target**: `backend/src/core/files/files.controller.ts`  
**Mudança Principal**: De `diskStorage` (filesystem) → `@google-cloud/storage` (Cloud Storage com Signed URLs)

---

## 1. Estrutura Atual vs Nova

### Atual (diskStorage + Express Multer)

```typescript
@Post('health-documents')
@UseGuards(JwtAuthGuard)
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        ensureHealthDocDir();
        cb(null, HEALTH_DOC_DIR);  // mkdir -p /app/uploads/health
      },
      filename: (_req, file, cb) => {
        const safeExt = ALLOWED_HEALTH_EXTENSIONS.has(ext) ? ext : '';
        const filename = `${randomUUID()}${safeExt}`;
        cb(null, filename);
      },
    }),
    limits: { fileSize: MAX_HEALTH_FILE_SIZE },
  }),
)
uploadHealthDocument(@UploadedFile() file?: Express.Multer.File) {
  return {
    path: `/uploads/health/${file.filename}`,  // ← Retorna path local
  };
}
```

**Problemas**:

- Arquivo fica em `/app/uploads/` (efêmero em Cloud Run)
- `diskStorage` bloqueia requisição enquanto salva
- Path público sim, mas sem controle de acesso

---

### Nova (Cloud Storage + Signed URLs)

```typescript
@Post('health-documents')
@UseGuards(JwtAuthGuard)
@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(),  // ← Buffer em RAM durante upload
    limits: { fileSize: MAX_HEALTH_FILE_SIZE },
  }),
)
async uploadHealthDocument(
  @UploadedFile() file?: Express.Multer.File,
  @Req() req: AuthenticatedRequest,
) {
  // 1. Validar arquivo
  // 2. Gerar GCS path
  // 3. Upload para Cloud Storage
  // 4. Salvar path no banco (Prisma)
  // 5. Retornar metadata
}
```

**Vantagens**:

- `memoryStorage` (buffer em RAM) → direto para GCS
- Arquivo nunca toca filesystem local
- Control de acesso via Signed URLs

---

## 2. Nova Estrutura de Arquivos

```
backend/src/core/files/
├── files.controller.ts          (refatorado)
├── files.module.ts              (adiciona CloudStorageService)
├── files.service.ts             (nova camada de lógica)
├── cloud-storage.service.ts     (novo wrapper do SDK GCS)
├── constants/
│   ├── file-limits.ts           (novo)
│   ├── file-types.ts            (novo)
│   └── gcs-paths.ts             (novo - padrões de path)
└── interfaces/
    ├── upload-result.ts         (novo)
    └── file-metadata.ts         (novo)
```

---

## 3. Implementação Passo a Passo

### 3.1 Arquivo: `files.module.ts` (Atualizado)

```typescript
import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service"; // Nova
import { CloudStorageService } from "./cloud-storage.service"; // Nova
import { PrismaModule } from "../prisma/prisma.module";
import { RequestContextModule } from "../request-context/request-context.module";

@Module({
  imports: [PrismaModule, RequestContextModule],
  controllers: [FilesController],
  providers: [FilesService, CloudStorageService],
  exports: [FilesService, CloudStorageService], // Para usar em outros módulos
})
export class FilesModule {}
```

---

### 3.2 Arquivo: `cloud-storage/constants/file-types.ts` (Novo)

```typescript
export enum DocumentType {
  AVATAR = "avatars",
  HEALTH = "health",
  PEOPLE = "people",
  PROGRAMS = "programs",
  PROJECTS = "projects",
  ACTIONS = "actions",
  PANTRY = "pantry",
  DEPOSIT = "deposit",
  TASKS = "tasks",
  TENANT_LOGO = "tenant-logos",
}

export enum DocumentSensitivity {
  HIGH = "HIGH", // health, people
  MEDIUM = "MEDIUM", // programs, projects, actions
  LOW = "LOW", // avatars, tenant-logos
}

export const DOCUMENT_TYPE_TO_SENSITIVITY: Record<
  DocumentType,
  DocumentSensitivity
> = {
  [DocumentType.AVATAR]: DocumentSensitivity.LOW,
  [DocumentType.HEALTH]: DocumentSensitivity.HIGH,
  [DocumentType.PEOPLE]: DocumentSensitivity.HIGH,
  [DocumentType.PROGRAMS]: DocumentSensitivity.MEDIUM,
  [DocumentType.PROJECTS]: DocumentSensitivity.MEDIUM,
  [DocumentType.ACTIONS]: DocumentSensitivity.MEDIUM,
  [DocumentType.PANTRY]: DocumentSensitivity.MEDIUM,
  [DocumentType.DEPOSIT]: DocumentSensitivity.MEDIUM,
  [DocumentType.TASKS]: DocumentSensitivity.MEDIUM,
  [DocumentType.TENANT_LOGO]: DocumentSensitivity.LOW,
};

export const SIGNED_URL_TTL_SECONDS: Record<DocumentSensitivity, number> = {
  [DocumentSensitivity.HIGH]: 5 * 60, // 5 minutos
  [DocumentSensitivity.MEDIUM]: 30 * 60, // 30 minutos
  [DocumentSensitivity.LOW]: 60 * 60, // 1 hora
};

export const MAX_FILE_SIZES: Record<DocumentType, number> = {
  [DocumentType.AVATAR]: 2 * 1024 * 1024, // 2MB
  [DocumentType.HEALTH]: 6 * 1024 * 1024, // 6MB
  [DocumentType.PEOPLE]: 10 * 1024 * 1024, // 10MB
  [DocumentType.PROGRAMS]: 10 * 1024 * 1024, // 10MB
  [DocumentType.PROJECTS]: 10 * 1024 * 1024, // 10MB
  [DocumentType.ACTIONS]: 6 * 1024 * 1024, // 6MB
  [DocumentType.PANTRY]: 10 * 1024 * 1024, // 10MB
  [DocumentType.DEPOSIT]: 10 * 1024 * 1024, // 10MB
  [DocumentType.TASKS]: 10 * 1024 * 1024, // 10MB
  [DocumentType.TENANT_LOGO]: 3 * 1024 * 1024, // 3MB
};

export const ALLOWED_EXTENSIONS: Record<DocumentType, Set<string>> = {
  [DocumentType.AVATAR]: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]),
  [DocumentType.HEALTH]: new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".pdf",
  ]),
  [DocumentType.PEOPLE]: new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".pdf",
    ".txt",
    ".csv",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".zip",
  ]),
  [DocumentType.PROGRAMS]: new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".pdf",
    ".txt",
    ".csv",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".zip",
  ]),
  [DocumentType.PROJECTS]: new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".pdf",
    ".txt",
    ".csv",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".zip",
  ]),
  [DocumentType.ACTIONS]: new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".pdf",
    ".txt",
    ".csv",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".zip",
  ]),
  [DocumentType.PANTRY]: new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".pdf",
    ".txt",
    ".csv",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".zip",
  ]),
  [DocumentType.DEPOSIT]: new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".pdf",
    ".txt",
    ".csv",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".zip",
  ]),
  [DocumentType.TASKS]: new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".pdf",
    ".txt",
    ".csv",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".zip",
  ]),
  [DocumentType.TENANT_LOGO]: new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
  ]),
};

export const ALLOWED_MIMETYPES: Record<
  DocumentType,
  (mime: string) => boolean
> = {
  [DocumentType.AVATAR]: (mime) => mime.startsWith("image/"),
  [DocumentType.HEALTH]: (mime) =>
    mime.startsWith("image/") || mime === "application/pdf",
  [DocumentType.PEOPLE]: (mime) =>
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    mime.includes("word") ||
    mime.includes("excel") ||
    mime === "text/plain" ||
    mime === "text/csv" ||
    mime === "application/zip",
  [DocumentType.PROGRAMS]: (mime) =>
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    mime.includes("word") ||
    mime.includes("excel") ||
    mime === "text/plain" ||
    mime === "text/csv" ||
    mime === "application/zip",
  [DocumentType.PROJECTS]: (mime) =>
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    mime.includes("word") ||
    mime.includes("excel") ||
    mime === "text/plain" ||
    mime === "text/csv" ||
    mime === "application/zip",
  [DocumentType.ACTIONS]: (mime) => mime.startsWith("image/"),
  [DocumentType.PANTRY]: (mime) =>
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    mime.includes("word") ||
    mime.includes("excel") ||
    mime === "text/plain" ||
    mime === "text/csv" ||
    mime === "application/zip",
  [DocumentType.DEPOSIT]: (mime) =>
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    mime.includes("word") ||
    mime.includes("excel") ||
    mime === "text/plain" ||
    mime === "text/csv" ||
    mime === "application/zip",
  [DocumentType.TASKS]: (mime) =>
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    mime.includes("word") ||
    mime.includes("excel") ||
    mime === "text/plain" ||
    mime === "text/csv" ||
    mime === "application/zip",
  [DocumentType.TENANT_LOGO]: (mime) => mime.startsWith("image/"),
};
```

---

### 3.3 Arquivo: `cloud-storage.service.ts` (Novo)

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { Storage, Bucket } from "@google-cloud/storage";
import { ConfigService } from "@nestjs/config";
import { Readable } from "stream";

@Injectable()
export class CloudStorageService {
  private readonly logger = new Logger(CloudStorageService.name);
  private storage: Storage;
  private bucket: Bucket;

  constructor(private readonly configService: ConfigService) {
    this.initializeStorage();
  }

  private initializeStorage() {
    const projectId = this.configService.get<string>("GCP_PROJECT_ID");
    const bucketName = this.configService.get<string>("GCP_BUCKET_NAME");

    if (!projectId || !bucketName) {
      throw new Error("GCP_PROJECT_ID e GCP_BUCKET_NAME não configuradas");
    }

    // Application Default Credentials (via GOOGLE_APPLICATION_CREDENTIALS env var)
    this.storage = new Storage({ projectId });
    this.bucket = this.storage.bucket(bucketName);

    this.logger.debug(
      `Cloud Storage inicializado: ${bucketName} (${projectId})`,
    );
  }

  /**
   * Fazer upload de buffer para Cloud Storage
   * @param path Caminho no bucket (ex: "health/person-id/file-uuid.pdf")
   * @param buffer Conteúdo do arquivo
   * @param mimeType Tipo MIME
   */
  async uploadBuffer(
    path: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ path: string; size: number; md5: string }> {
    const file = this.bucket.file(path);

    // Metadados customizados
    const metadata = {
      contentType: mimeType,
      cacheControl: "private, max-age=3600",
    };

    await new Promise<void>((resolve, reject) => {
      const stream = file.createWriteStream({ metadata });
      stream.on("error", reject);
      stream.on("finish", resolve);
      stream.end(buffer);
    });

    // Retornar metadados
    const [meta] = await file.getMetadata();
    return {
      path,
      size: meta.size,
      md5: meta.md5Hash,
    };
  }

  /**
   * Gerar Signed URL para download
   * @param path Caminho no bucket
   * @param expiresIn TTL em segundos
   */
  async generateSignedUrl(
    path: string,
    expiresIn: number = 300, // 5 min default
  ): Promise<string> {
    const file = this.bucket.file(path);

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresIn * 1000,
    });

    return signedUrl;
  }

  /**
   * Verificar se arquivo existe
   */
  async fileExists(path: string): Promise<boolean> {
    const file = this.bucket.file(path);
    const [exists] = await file.exists();
    return exists;
  }

  /**
   * Deletar arquivo
   */
  async deleteFile(path: string): Promise<void> {
    const file = this.bucket.file(path);
    await file.delete();
    this.logger.debug(`Arquivo deletado: ${path}`);
  }

  /**
   * Deletar pasta (recursivo)
   */
  async deleteFolder(prefix: string): Promise<void> {
    // Warning: itera e deleta um por um
    const options = { prefix };
    const [files] = await this.bucket.getFiles(options);

    for (const file of files) {
      await file.delete();
    }

    this.logger.debug(`Pasta deletada: ${prefix}`);
  }

  /**
   * Obter metadados de arquivo
   */
  async getFileMetadata(path: string) {
    const file = this.bucket.file(path);
    const [metadata] = await file.getMetadata();
    return metadata;
  }
}
```

---

### 3.4 Arquivo: `files.service.ts` (Novo)

```typescript
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { CloudStorageService } from "./cloud-storage.service";
import {
  DocumentType,
  DocumentSensitivity,
  DOCUMENT_TYPE_TO_SENSITIVITY,
  SIGNED_URL_TTL_SECONDS,
  MAX_FILE_SIZES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIMETYPES,
} from "./constants/file-types";
import { extname } from "path";
import { randomUUID } from "crypto";

export interface UploadFileResult {
  id?: string; // Attachment ID
  path: string; // GCS path (salvo no banco)
  size: number;
  mimeType: string;
}

export interface FileAccessResult {
  signedUrl: string;
  expiresIn: number; // segundos
  mimeType: string;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly cloudStorage: CloudStorageService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validar arquivo antes do upload
   */
  validateFile(file: Express.Multer.File, documentType: DocumentType): void {
    if (!file) {
      throw new BadRequestException("Arquivo obrigatório.");
    }

    const maxSize = MAX_FILE_SIZES[documentType];
    if (file.size > maxSize) {
      throw new BadRequestException(
        `Arquivo muito grande. Máximo: ${maxSize / 1024 / 1024}MB`,
      );
    }

    const mimeValidator = ALLOWED_MIMETYPES[documentType];
    if (!mimeValidator(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido: ${file.mimetype}`,
      );
    }

    const ext = extname(file.originalname).toLowerCase();
    const allowedExts = ALLOWED_EXTENSIONS[documentType];
    if (!allowedExts.has(ext)) {
      throw new BadRequestException(
        `Extensão não permitida: ${ext}. Permitidas: ${Array.from(allowedExts).join(", ")}`,
      );
    }
  }

  /**
   * Gerar path GCS padronizado
   * Formato: {documentType}/{entityId}/{uuid}.{ext}
   */
  generateGcsPath(
    documentType: DocumentType,
    entityId: string,
    originalFilename: string,
  ): string {
    const ext = extname(originalFilename).toLowerCase();
    const filename = `${randomUUID()}${ext}`;
    return `${documentType}/${entityId}/${filename}`;
  }

  /**
   * Fazer upload de arquivo para cloud storage
   */
  async uploadFile(
    file: Express.Multer.File,
    documentType: DocumentType,
    entityId: string,
    tenantId: string,
  ): Promise<UploadFileResult> {
    // 1. Validar
    this.validateFile(file, documentType);

    // 2. Gerar path
    const relativePath = this.generateGcsPath(
      documentType,
      entityId,
      file.originalname,
    );
    const gcpPath = `${tenantId}/${relativePath}`; // Isolar por tenant

    // 3. Upload para GCS
    const result = await this.cloudStorage.uploadBuffer(
      gcpPath,
      file.buffer,
      file.mimetype,
    );

    return {
      path: relativePath, // Salva no banco sem tenantId (é implícito no contexto)
      size: result.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Gerar URL para acesso ao arquivo
   */
  async generateAccessUrl(
    filePath: string,
    documentType: DocumentType,
    tenantId: string,
  ): Promise<FileAccessResult> {
    const gcpPath = `${tenantId}/${filePath}`;

    // Verificar se existe
    const exists = await this.cloudStorage.fileExists(gcpPath);
    if (!exists) {
      throw new NotFoundException("Arquivo não encontrado.");
    }

    // Determinar TTL
    const sensitivity = DOCUMENT_TYPE_TO_SENSITIVITY[documentType];
    const ttlSeconds = SIGNED_URL_TTL_SECONDS[sensitivity];

    // Gerar signed URL
    const signedUrl = await this.cloudStorage.generateSignedUrl(
      gcpPath,
      ttlSeconds,
    );

    // Obter mimetype
    const metadata = await this.cloudStorage.getFileMetadata(gcpPath);

    return {
      signedUrl,
      expiresIn: ttlSeconds,
      mimeType: metadata.contentType || "application/octet-stream",
    };
  }

  /**
   * Deletar arquivo
   */
  async deleteFile(filePath: string, tenantId: string): Promise<void> {
    const gcpPath = `${tenantId}/${filePath}`;
    await this.cloudStorage.deleteFile(gcpPath);
  }
}
```

---

### 3.5 Arquivo: `files.controller.ts` (Refatorado - Exemplos)

```typescript
import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Req,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer"; // ← Mudou de diskStorage
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  FilesService,
  UploadFileResult,
  FileAccessResult,
} from "./files.service";
import { DocumentType } from "./constants/file-types";
import { PrismaService } from "../prisma/prisma.service";

interface AuthenticatedRequest extends Request {
  user: { id: string };
  tenantId?: string;
}

@Controller("files")
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly prisma: PrismaService,
  ) {}

  // ===== AVATARS =====
  @Post("avatars")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(), // ← Buffer em RAM
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;

    // Upload
    const result = await this.filesService.uploadFile(
      file,
      DocumentType.AVATAR,
      userId,
      req.tenantId,
    );

    // Salvar banco
    const attachment = await this.prisma.userAvatar.create({
      data: {
        userId,
        filePath: result.path,
        mimeType: result.mimeType,
        fileSizeBytes: result.size,
      },
      select: { id: true, filePath: true },
    });

    return {
      id: attachment.id,
      path: attachment.filePath,
      size: result.size,
    };
  }

  // ===== HEALTH DOCUMENTS =====
  @Post("health-documents")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 6 * 1024 * 1024 },
    }),
  )
  async uploadHealthDocument(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    const { personId } = req.body as { personId: string };

    if (!personId) {
      throw new BadRequestException("personId obrigatório.");
    }

    // Validar que person pertence ao tenant
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { tenantId: true },
    });

    if (!person || person.tenantId !== req.tenantId) {
      throw new BadRequestException("Pessoa não encontrada ou sem permissão.");
    }

    // Upload
    const result = await this.filesService.uploadFile(
      file,
      DocumentType.HEALTH,
      personId,
      req.tenantId,
    );

    // Salvar banco
    const attachment = await this.prisma.personAttachment.create({
      data: {
        tenantId: req.tenantId,
        personId,
        uploadedByUserId: req.user.id,
        label: file.originalname,
        filePath: result.path,
        mimeType: result.mimeType,
        fileSizeBytes: result.size,
      },
      select: { id: true, filePath: true },
    });

    return {
      id: attachment.id,
      path: attachment.filePath,
      size: result.size,
    };
  }

  // ===== GET FILE (Signed URL) =====
  @Get(":attachmentId")
  @UseGuards(JwtAuthGuard)
  async getFile(
    @Param("attachmentId") attachmentId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<FileAccessResult> {
    // Buscar attachment no banco
    const attachment = await this.prisma.personAttachment.findUnique({
      where: { id: attachmentId },
      select: { filePath: true, personId: true, tenantId: true },
    });

    if (!attachment || attachment.tenantId !== req.tenantId) {
      throw new BadRequestException(
        "Attachment não encontrado ou sem permissão.",
      );
    }

    // Determinar tipo de documento pelo path
    const [documentType] = attachment.filePath.split("/") as [DocumentType];

    // Gerar signed URL
    return this.filesService.generateAccessUrl(
      attachment.filePath,
      documentType,
      req.tenantId,
    );
  }

  // ... mais endpoints para programs, projects, actions, etc.
  // Padrão é idêntico: FileInterceptor + memoryStorage + uploadFile + prisma.create
}
```

---

## 4. Mudanças no Banco de Dados

Nenhuma migração Prisma necessária! Apenas mudar o que é **armazenado** em `filePath`:

**Antes**:

```
filePath: "/uploads/health/3fa85f64-5717-4562-b3fc-2c963f66afa6.pdf"
```

**Depois**:

```
filePath: "health/112e8400-e29b-41d4-a716-446655440111/3fa85f64-5717-4562-b3fc-2c963f66afa6.pdf"
```

---

## 5. Tratamento de Erros

Adicionar `HttpExceptionFilter`:

```typescript
@Catch(Error)
export class GcsErrorFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception.message.includes("ENOENT")) {
      return response.status(404).json({ message: "Arquivo não encontrado" });
    }

    if (exception.message.includes("Permission Denied")) {
      return response
        .status(403)
        .json({ message: "Sem permissão para acessar arquivo" });
    }

    // Google Cloud Storage erros
    if (exception.message.includes("InvalidArgument")) {
      return response.status(400).json({ message: "Parâmetros inválidos" });
    }

    // Erro genérico
    return response.status(500).json({ message: "Erro ao processar arquivo" });
  }
}
```

---

## 6. Checklist de Implementação

- [ ] Instalar `npm install @google-cloud/storage`
- [ ] Criar arquivos de constantes
- [ ] Implementar `CloudStorageService`
- [ ] Implementar `FilesService`
- [ ] Refatorar `FilesController`
- [ ] Atualizar `FilesModule`
- [ ] Testes unitários
- [ ] Testar upload/download em staging
- [ ] Validar Signed URLs expiram corretamente
- [ ] Performance tests (upload de 50MB?)

---

## 7. Referências

- [Google Cloud Storage Node.js Client](https://cloud.google.com/nodejs/docs/reference/storage/latest)
- [Signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)
