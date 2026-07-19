# Testing Strategy - Cloud Storage Refactor

**Objetivo**: Planejar e documentar testes unitários, integração e e2e para o refactor de Cloud Storage.

---

## 1. Escopo de Testes

### Componentes a Testar

```
FilesController
  ↓
FilesService
  ↓
CloudStorageService
  ↓
Prisma (PersonAttachment, etc)
```

### Tipos de Teste

| Tipo            | Escopo                               | Ferramenta     | Coverage       |
| --------------- | ------------------------------------ | -------------- | -------------- |
| **Unitário**    | CloudStorageService, FilesService    | Jest           | 80%+           |
| **Integração**  | FilesController + Prisma             | Jest + Test DB | 70%+           |
| **E2E**         | Upload → GCS → Signed URL → Download | Supertest      | Critical paths |
| **Performance** | Upload 50MB, 1000 req/s              | Artillery      | Baseline       |

---

## 2. Testes Unitários

### 2.1 CloudStorageService Tests

**Arquivo**: `backend/src/core/files/cloud-storage.service.spec.ts`

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { CloudStorageService } from "./cloud-storage.service";
import { Storage, Bucket } from "@google-cloud/storage";

// Mock @google-cloud/storage
jest.mock("@google-cloud/storage");

describe("CloudStorageService", () => {
  let service: CloudStorageService;
  let configService: ConfigService;
  let mockBucket: jest.Mocked<Bucket>;
  let mockFile: any;

  beforeEach(async () => {
    // Mock Config
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          GCP_PROJECT_ID: "test-project",
          GCP_BUCKET_NAME: "test-bucket",
        };
        return config[key];
      }),
    };

    // Mock Bucket
    mockFile = {
      createWriteStream: jest.fn(),
      getSignedUrl: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      getMetadata: jest.fn(),
    };

    mockBucket = {
      file: jest.fn(() => mockFile),
      getFiles: jest.fn(),
      delete: jest.fn(),
    } as any;

    // Mock Storage
    (Storage as any).mockImplementation(() => ({
      bucket: jest.fn(() => mockBucket),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudStorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CloudStorageService>(CloudStorageService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe("uploadBuffer", () => {
    it("deve fazer upload de buffer para GCS", async () => {
      const path = "health/person-123/file.pdf";
      const buffer = Buffer.from("PDF content");
      const mimeType = "application/pdf";

      // Mock stream
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === "finish") {
            setTimeout(callback, 10);
          }
          return mockStream;
        }),
        end: jest.fn(),
      };

      mockFile.createWriteStream.mockReturnValue(mockStream);
      mockFile.getMetadata.mockResolvedValue([
        {
          size: buffer.length,
          md5Hash: "mockHash123",
        },
      ]);

      const result = await service.uploadBuffer(path, buffer, mimeType);

      expect(mockFile.createWriteStream).toHaveBeenCalledWith({
        metadata: {
          contentType: mimeType,
          cacheControl: "private, max-age=3600",
        },
      });
      expect(mockStream.end).toHaveBeenCalledWith(buffer);
      expect(result.path).toBe(path);
      expect(result.size).toBe(buffer.length);
    });

    it("deve lançar erro se stream falhar", async () => {
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === "error") {
            setTimeout(() => callback(new Error("Upload failed")), 10);
          }
          return mockStream;
        }),
        end: jest.fn(),
      };

      mockFile.createWriteStream.mockReturnValue(mockStream);

      await expect(
        service.uploadBuffer("path", Buffer.from("test"), "text/plain"),
      ).rejects.toThrow("Upload failed");
    });
  });

  describe("generateSignedUrl", () => {
    it("deve gerar signed URL com TTL", async () => {
      const path = "health/person-123/file.pdf";
      const expiresIn = 300; // 5 min
      const expectedUrl = "https://storage.googleapis.com/bucket/path?auth=...";

      mockFile.getSignedUrl.mockResolvedValue([expectedUrl]);

      const url = await service.generateSignedUrl(path, expiresIn);

      expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
        version: "v4",
        action: "read",
        expires: expect.any(Number),
      });
      expect(url).toBe(expectedUrl);
    });

    it("deve usar TTL default de 300s se não especificado", async () => {
      mockFile.getSignedUrl.mockResolvedValue(["url"]);

      await service.generateSignedUrl("path");

      const callArgs = mockFile.getSignedUrl.mock.calls[0][0];
      const expirationMs = callArgs.expires - Date.now();

      // Deve estar perto de 300s (5 min)
      expect(expirationMs).toBeGreaterThan(290000);
      expect(expirationMs).toBeLessThan(310000);
    });
  });

  describe("fileExists", () => {
    it("deve retornar true se arquivo existe", async () => {
      mockFile.exists.mockResolvedValue([true]);

      const exists = await service.fileExists("path");

      expect(exists).toBe(true);
    });

    it("deve retornar false se arquivo não existe", async () => {
      mockFile.exists.mockResolvedValue([false]);

      const exists = await service.fileExists("path");

      expect(exists).toBe(false);
    });
  });

  describe("deleteFile", () => {
    it("deve deletar arquivo", async () => {
      mockFile.delete.mockResolvedValue([]);

      await service.deleteFile("path");

      expect(mockFile.delete).toHaveBeenCalled();
    });
  });

  describe("deleteFolder", () => {
    it("deve deletar pasta recursivamente", async () => {
      const mockFile1 = { delete: jest.fn().mockResolvedValue([]) };
      const mockFile2 = { delete: jest.fn().mockResolvedValue([]) };

      mockBucket.getFiles.mockResolvedValue([[mockFile1, mockFile2]]);

      await service.deleteFolder("health/person-123/");

      expect(mockFile1.delete).toHaveBeenCalled();
      expect(mockFile2.delete).toHaveBeenCalled();
    });
  });
});
```

---

### 2.2 FilesService Tests

**Arquivo**: `backend/src/core/files/files.service.spec.ts`

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { FilesService } from "./files.service";
import { CloudStorageService } from "./cloud-storage.service";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DocumentType } from "./constants/file-types";

describe("FilesService", () => {
  let service: FilesService;
  let cloudStorageService: jest.Mocked<CloudStorageService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockFile: Express.Multer.File = {
    fieldname: "file",
    originalname: "document.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    size: 1024 * 512, // 512KB
    destination: "",
    filename: "",
    path: "",
    buffer: Buffer.from("PDF content"),
  };

  beforeEach(async () => {
    const mockCloudStorageService = {
      uploadBuffer: jest.fn(),
      generateSignedUrl: jest.fn(),
      fileExists: jest.fn(),
      deleteFile: jest.fn(),
      getFileMetadata: jest.fn(),
    };

    const mockPrismaService = {} as any;
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: CloudStorageService, useValue: mockCloudStorageService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    cloudStorageService = module.get(
      CloudStorageService,
    ) as jest.Mocked<CloudStorageService>;
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe("validateFile", () => {
    it("deve lançar erro se arquivo não fornecido", () => {
      expect(() => {
        service.validateFile(null as any, DocumentType.HEALTH);
      }).toThrow(BadRequestException);
    });

    it("deve lançar erro se arquivo > tamanho máximo", () => {
      const largeFile = { ...mockFile, size: 10 * 1024 * 1024 + 1 };

      expect(() => {
        service.validateFile(largeFile, DocumentType.HEALTH);
      }).toThrow("Arquivo muito grande");
    });

    it("deve lançar erro se mimetype não permitido", () => {
      const badFile = { ...mockFile, mimetype: "text/plain" };

      expect(() => {
        service.validateFile(badFile, DocumentType.HEALTH);
      }).toThrow("Tipo de arquivo não permitido");
    });

    it("deve aceitar arquivo válido", () => {
      expect(() => {
        service.validateFile(mockFile, DocumentType.HEALTH);
      }).not.toThrow();
    });
  });

  describe("generateGcsPath", () => {
    it("deve gerar path com formato correto", () => {
      const path = service.generateGcsPath(
        DocumentType.HEALTH,
        "person-123",
        "document.pdf",
      );

      expect(path).toMatch(/^health\/person-123\/[a-f0-9-]+\.pdf$/);
    });

    it("deve gerar UUIDs únicos cada vez", () => {
      const path1 = service.generateGcsPath(
        DocumentType.HEALTH,
        "person-123",
        "document.pdf",
      );
      const path2 = service.generateGcsPath(
        DocumentType.HEALTH,
        "person-123",
        "document.pdf",
      );

      expect(path1).not.toBe(path2);
    });
  });

  describe("uploadFile", () => {
    it("deve fazer upload e retornar metadata", async () => {
      const tenantId = "tenant-123";
      const personId = "person-123";
      const uploadResult = {
        path: "health/person-123/uuid.pdf",
        size: mockFile.size,
        md5: "hash123",
      };

      cloudStorageService.uploadBuffer.mockResolvedValue(uploadResult);

      const result = await service.uploadFile(
        mockFile,
        DocumentType.HEALTH,
        personId,
        tenantId,
      );

      expect(cloudStorageService.uploadBuffer).toHaveBeenCalled();
      expect(result.path).toMatch(/^health\/person-123\/[a-f0-9-]+\.pdf$/);
      expect(result.size).toBe(mockFile.size);
      expect(result.mimeType).toBe(mockFile.mimetype);
    });
  });

  describe("generateAccessUrl", () => {
    it("deve gerar signed URL com TTL apropriado", async () => {
      const filePath = "health/person-123/uuid.pdf";
      const tenantId = "tenant-123";
      const signedUrl = "https://storage.googleapis.com/bucket/path?auth=...";

      cloudStorageService.fileExists.mockResolvedValue(true);
      cloudStorageService.generateSignedUrl.mockResolvedValue(signedUrl);
      cloudStorageService.getFileMetadata.mockResolvedValue({
        contentType: "application/pdf",
      });

      const result = await service.generateAccessUrl(
        filePath,
        DocumentType.HEALTH,
        tenantId,
      );

      expect(cloudStorageService.generateSignedUrl).toHaveBeenCalledWith(
        `${tenantId}/${filePath}`,
        5 * 60, // 5 min para HIGH sensitivity
      );
      expect(result.signedUrl).toBe(signedUrl);
      expect(result.mimeType).toBe("application/pdf");
    });

    it("deve lançar erro se arquivo não existe", async () => {
      cloudStorageService.fileExists.mockResolvedValue(false);

      await expect(
        service.generateAccessUrl(
          "nonexistent",
          DocumentType.HEALTH,
          "tenant-123",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

---

## 3. Testes de Integração

### 3.1 FilesController Tests

**Arquivo**: `backend/src/core/files/files.controller.spec.ts`

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { DocumentType } from "./constants/file-types";

describe("FilesController", () => {
  let controller: FilesController;
  let filesService: jest.Mocked<FilesService>;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockFilesService = {
      uploadFile: jest.fn(),
      generateAccessUrl: jest.fn(),
      validateFile: jest.fn(),
    };

    const mockPrismaService = {
      personAttachment: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      person: {
        findUnique: jest.fn(),
      },
      userAvatar: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: FilesService, useValue: mockFilesService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<FilesController>(FilesController);
    filesService = module.get(FilesService) as jest.Mocked<FilesService>;
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe("uploadHealthDocument", () => {
    it("deve fazer upload de documento de saúde", async () => {
      const mockFile: Express.Multer.File = {
        fieldname: "file",
        originalname: "laudo.pdf",
        encoding: "7bit",
        mimetype: "application/pdf",
        size: 1024 * 100,
        destination: "",
        filename: "",
        path: "",
        buffer: Buffer.from("PDF"),
      };

      const mockRequest = {
        user: { id: "user-123" },
        tenantId: "tenant-123",
        body: { personId: "person-123" },
      };

      filesService.uploadFile.mockResolvedValue({
        path: "health/person-123/uuid.pdf",
        size: 102400,
        mimeType: "application/pdf",
      });

      prismaService.person.findUnique.mockResolvedValue({
        id: "person-123",
        tenantId: "tenant-123",
      } as any);

      prismaService.personAttachment.create.mockResolvedValue({
        id: "attachment-123",
        filePath: "health/person-123/uuid.pdf",
      } as any);

      const result = await controller.uploadHealthDocument(
        mockFile,
        mockRequest as any,
      );

      expect(result.id).toBe("attachment-123");
      expect(result.path).toBe("health/person-123/uuid.pdf");
    });
  });

  describe("getFile", () => {
    it("deve retornar signed URL", async () => {
      const mockRequest = {
        user: { id: "user-123" },
        tenantId: "tenant-123",
      };

      prismaService.personAttachment.findUnique.mockResolvedValue({
        id: "attachment-123",
        filePath: "health/person-123/uuid.pdf",
        personId: "person-123",
        tenantId: "tenant-123",
      } as any);

      filesService.generateAccessUrl.mockResolvedValue({
        signedUrl: "https://storage.googleapis.com/...",
        expiresIn: 300,
        mimeType: "application/pdf",
      });

      const result = await controller.getFile(
        "attachment-123",
        mockRequest as any,
      );

      expect(result.signedUrl).toMatch(/^https:\/\/storage\.googleapis\.com/);
      expect(result.expiresIn).toBe(300);
    });
  });
});
```

---

## 4. Testes E2E

### 4.1 Upload + Download E2E

**Arquivo**: `backend/test/files.e2e-spec.ts`

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/core/prisma/prisma.service";

describe("Files E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let tenantId: string;
  let personId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Setup: criar tenant, user, person
    const tenant = await prisma.tenant.create({
      data: { name: "Test Org", slug: "test-org" },
    });
    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        password: "hashedpwd",
        tenantId,
      },
    });

    const person = await prisma.person.create({
      data: {
        name: "Test Person",
        tenantId,
      },
    });
    personId = person.id;

    // Gerar JWT token
    const jwtService = app.get("JwtService");
    token = jwtService.sign({ id: user.id });
  });

  afterAll(async () => {
    await app.close();
  });

  it("deve fazer upload e download de documento de saúde", async () => {
    const file = Buffer.from("PDF content here");

    // Upload
    const uploadRes = await request(app.getHttpServer())
      .post("/api/files/health-documents")
      .set("Authorization", `Bearer ${token}`)
      .field("personId", personId)
      .attach("file", file, "laudo.pdf")
      .expect(201);

    expect(uploadRes.body.id).toBeDefined();
    expect(uploadRes.body.path).toMatch(/^health\//);

    const attachmentId = uploadRes.body.id;

    // Get signed URL
    const urlRes = await request(app.getHttpServer())
      .get(`/api/files/${attachmentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(urlRes.body.signedUrl).toMatch(
      /^https:\/\/storage\.googleapis\.com/,
    );
    expect(urlRes.body.expiresIn).toBe(300); // 5 min

    // Verificar que URL é acessível
    const downloadRes = await request(urlRes.body.signedUrl)
      .get("")
      .expect(200);

    expect(downloadRes.body).toEqual(file);
  });

  it("deve rejeitar uploads sem autenticação", async () => {
    const file = Buffer.from("PDF");

    await request(app.getHttpServer())
      .post("/api/files/health-documents")
      .field("personId", personId)
      .attach("file", file, "laudo.pdf")
      .expect(401);
  });

  it("deve rejeitar arquivo muito grande", async () => {
    const largeFile = Buffer.alloc(7 * 1024 * 1024); // 7MB (max = 6MB)

    await request(app.getHttpServer())
      .post("/api/files/health-documents")
      .set("Authorization", `Bearer ${token}`)
      .field("personId", personId)
      .attach("file", largeFile, "huge.pdf")
      .expect(400);
  });
});
```

---

## 5. Testes de Performance

### 5.1 Cricket/Artillery Tests

**Arquivo**: `backend/test/files.load-test.yml`

```yaml
config:
  target: "http://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 10 # 10 requests/sec
      name: "Ramp up"
    - duration: 120
      arrivalRate: 50 # 50 requests/sec for 2 min
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100 # 100 requests/sec
      name: "Peak"

scenarios:
  - name: "Upload health document"
    flow:
      - post:
          url: "/api/files/health-documents"
          headers:
            Authorization: "Bearer {{ $loopCount }}"
          formData:
            personId: "person-123"
            file@: "test.pdf"
          capture:
            json: "$.id"
            as: "attachmentId"
      - think: 2

  - name: "Download signed URL + file"
    flow:
      - get:
          url: "/api/files/{{ attachmentId }}"
          headers:
            Authorization: "Bearer {{ $loopCount }}"
      - think: 1
      - get:
          url: "{{ signedUrl }}" # URL returned from previous request
```

**Executar**:

```bash
artillery run backend/test/files.load-test.yml
```

---

## 6. Checklist de Testes

### Antes de Deploy

- [ ] Testes unitários: 80%+ coverage
- [ ] Testes integração passam
- [ ] Testes E2E passam (upload + download)
- [ ] Testes de performance: < 500ms p95
- [ ] Testes de segurança: signed URLs expiram
- [ ] Testes de fallback: arquivo não existe → 404
- [ ] Testes de permissões: user não pode acessar outro tenant

### Em Staging (Pré-Prod)

- [ ] Upload 500MB file (edge case)
- [ ] Concurrent uploads (100 simultâneos)
- [ ] Signed URL expiração validada (5 min timeout)
- [ ] Logs auditar acesso a documentos sensíveis
- [ ] Monitorar GCS quota/billing

---

## 7. Cobertura Desejada

```
CloudStorageService      85%
FilesService             85%
FilesController          75%
Integration              80%
E2E (critical paths)     100%
```

---

## 8. Referências

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest](https://github.com/visionmedia/supertest)
- [Artillery.io](https://artillery.io/)
- [Google Cloud Storage Testing](https://cloud.google.com/storage/docs/testing)
