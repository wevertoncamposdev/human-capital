"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt = __importStar(require("bcrypt"));
const prisma_runtime_1 = require("../scripts/prisma-runtime");
const prisma = (0, prisma_runtime_1.createPrismaClientFromEnv)();
async function main() {
    const tenantId = '2fad98c9-5d6c-4f76-8c46-00fb80d0509b';
    const roleIds = {
        admin: 'f7110198-db21-473d-b9b5-1e8b1b465e17',
        gestor: '0f0b83a8-3b6c-4733-8f6d-197946361394',
        atendimento: '8663ae22-3014-4996-a779-8b8d781bd8f6',
        leitor: 'a170ecfa-cf86-41e7-8bdf-19fb87a42c43',
    };
    const userIds = {
        admin: '15fc80ed-23c4-4874-8998-56e3d07cd4b7',
        gestor: 'aeed4987-2bd2-42a7-b70e-d38b7e2395d1',
        atendimento1: '12dada1f-0226-40e8-a38d-740b806a0671',
        atendimento2: '3ec47fe5-dbe5-46e9-8b60-09156c2f1fff',
        leitor: '02019099-853f-4b74-9a7d-1a92b4baca16',
    };
    const existingTenant = await prisma.tenant.findUnique({
        where: { name: 'Instituicao Exemplo' },
    });
    if (existingTenant && existingTenant.id !== tenantId) {
        await prisma.rolePermission.deleteMany({
            where: { tenantId: existingTenant.id },
        });
        await prisma.userRole.deleteMany({
            where: { tenantId: existingTenant.id },
        });
        await prisma.person.deleteMany({
            where: { tenantId: existingTenant.id },
        });
        await prisma.role.deleteMany({
            where: { tenantId: existingTenant.id },
        });
        await prisma.user.deleteMany({
            where: { tenantId: existingTenant.id },
        });
        await prisma.tenant.delete({ where: { id: existingTenant.id } });
    }
    const tenant = await prisma.tenant.upsert({
        where: { id: tenantId },
        update: {
            name: 'Instituicao Exemplo',
            slug: 'instituicao-exemplo',
            logoUrl: '/avatar-female.jpg',
            cnpj: '12.345.678/0001-90',
            startYear: 2010,
            description: '<p>Instituicao voltada ao atendimento social e desenvolvimento familiar.</p>',
        },
        create: {
            id: tenantId,
            name: 'Instituicao Exemplo',
            slug: 'instituicao-exemplo',
            logoUrl: '/avatar-female.jpg',
            cnpj: '12.345.678/0001-90',
            startYear: 2010,
            description: '<p>Instituicao voltada ao atendimento social e desenvolvimento familiar.</p>',
        },
    });
    const permissions = [
        { key: 'people.read', description: 'Ler pessoas' },
        { key: 'people.create', description: 'Criar pessoas' },
        { key: 'people.update', description: 'Atualizar pessoas' },
        { key: 'people.delete', description: 'Excluir pessoas' },
        { key: 'pantry.read', description: 'Ler despensa' },
        { key: 'pantry.create', description: 'Criar despensa' },
        { key: 'pantry.update', description: 'Atualizar despensa' },
        { key: 'pantry.delete', description: 'Excluir despensa' },
        { key: 'users.read', description: 'Ler usuarios' },
        { key: 'users.create', description: 'Criar usuarios' },
        { key: 'users.update', description: 'Atualizar usuarios' },
        { key: 'users.delete', description: 'Excluir usuarios' },
        { key: 'roles.manage', description: 'Gerenciar perfis e permissoes' },
        { key: 'audit.read', description: 'Ler auditoria de dados' },
        { key: 'tenants.read', description: 'Ler dados da instituicao' },
        { key: 'tenants.update', description: 'Atualizar dados da instituicao' },
    ];
    for (const permission of permissions) {
        await prisma.permission.upsert({
            where: { key: permission.key },
            update: { description: permission.description },
            create: permission,
        });
    }
    const allPermissions = await prisma.permission.findMany();
    const roleDefinitions = [
        {
            id: roleIds.admin,
            name: 'Admin',
            description: 'Administrador da instituicao',
            permissionKeys: allPermissions.map((permission) => permission.key),
        },
        {
            id: roleIds.gestor,
            name: 'Gestor',
            description: 'Gestao operacional',
            permissionKeys: [
                'people.read',
                'people.create',
                'people.update',
                'people.delete',
                'tenants.read',
            ],
        },
        {
            id: roleIds.atendimento,
            name: 'Atendimento',
            description: 'Equipe de atendimento',
            permissionKeys: ['people.read', 'people.create', 'people.update'],
        },
        {
            id: roleIds.leitor,
            name: 'Leitor',
            description: 'Acesso somente leitura',
            permissionKeys: ['people.read'],
        },
    ];
    for (const roleDefinition of roleDefinitions) {
        const role = await prisma.role.upsert({
            where: {
                tenantId_name: {
                    tenantId: tenant.id,
                    name: roleDefinition.name,
                },
            },
            update: {
                description: roleDefinition.description,
            },
            create: {
                id: roleDefinition.id,
                tenantId: tenant.id,
                name: roleDefinition.name,
                description: roleDefinition.description,
            },
        });
        for (const permissionKey of roleDefinition.permissionKeys) {
            const permission = allPermissions.find((item) => item.key === permissionKey);
            if (!permission)
                continue;
            await prisma.rolePermission.upsert({
                where: {
                    tenantId_roleId_permissionId: {
                        tenantId: tenant.id,
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                },
                update: {},
                create: {
                    tenantId: tenant.id,
                    roleId: role.id,
                    permissionId: permission.id,
                },
            });
        }
    }
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const userPasswordHash = await bcrypt.hash('User@123', 10);
    const users = [
        {
            id: userIds.admin,
            name: 'Administrador',
            email: 'admin@exemplo.com',
            passwordHash: adminPasswordHash,
            roleId: roleIds.admin,
        },
        {
            id: userIds.gestor,
            name: 'Gestor Operacional',
            email: 'gestor@exemplo.com',
            passwordHash: userPasswordHash,
            roleId: roleIds.gestor,
        },
        {
            id: userIds.atendimento1,
            name: 'Atendimento Silva',
            email: 'atendimento1@exemplo.com',
            passwordHash: userPasswordHash,
            roleId: roleIds.atendimento,
        },
        {
            id: userIds.atendimento2,
            name: 'Atendimento Souza',
            email: 'atendimento2@exemplo.com',
            passwordHash: userPasswordHash,
            roleId: roleIds.atendimento,
        },
        {
            id: userIds.leitor,
            name: 'Leitor Junior',
            email: 'leitor@exemplo.com',
            passwordHash: userPasswordHash,
            roleId: roleIds.leitor,
        },
    ];
    for (const user of users) {
        const savedUser = await prisma.user.upsert({
            where: {
                tenantId_email: {
                    tenantId: tenant.id,
                    email: user.email,
                },
            },
            update: {
                name: user.name,
                passwordHash: user.passwordHash,
                isActive: true,
            },
            create: {
                id: user.id,
                tenantId: tenant.id,
                name: user.name,
                email: user.email,
                passwordHash: user.passwordHash,
                isActive: true,
            },
        });
        await prisma.userRole.upsert({
            where: {
                tenantId_userId_roleId: {
                    tenantId: tenant.id,
                    userId: savedUser.id,
                    roleId: user.roleId,
                },
            },
            update: {},
            create: {
                tenantId: tenant.id,
                userId: savedUser.id,
                roleId: user.roleId,
            },
        });
    }
    const defaultAvatarUrl = '/avatar.jpg';
    const people = [
        {
            id: '675d3227-da20-4e40-ab70-4b2a1011d728',
            fullName: 'Ana Pereira',
            socialName: 'Ana Pereira',
            email: 'ana.pereira@exemplo.com',
            phone: '+55 11 98888-1212',
            document: '111.222.333-44',
            rg: '44.556.677-1',
            nis: '123.45678.90-1',
            birthDate: new Date('1994-03-12'),
            sex: 'Feminino',
            gender: 'Mulher',
            raceColor: 'Branca',
            maritalStatus: 'Solteira',
            nationality: 'Brasileira',
            status: 'Ativo',
            personType: 'Atendido',
            tags: ['Agendar reuniao com os pais'],
        },
        {
            id: '5a6afec4-5165-4f20-b394-d95b4d603fdd',
            fullName: 'Carlos Souza',
            socialName: 'Carlos Souza',
            email: 'carlos.souza@exemplo.com',
            phone: '+55 21 97777-2233',
            document: '222.333.444-55',
            rg: '22.334.445-2',
            nis: '321.65498.76-0',
            birthDate: new Date('1988-11-08'),
            sex: 'Masculino',
            gender: 'Homem',
            raceColor: 'Parda',
            maritalStatus: 'Casado',
            nationality: 'Brasileira',
            status: 'Ativo',
            personType: 'Familiar',
            tags: ['Analisar mudanca de ciclo'],
        },
        {
            id: 'c9e5539e-242a-4ef2-b5b7-3e9bd4c2dacf',
            fullName: 'Marina Lima',
            socialName: 'Marina Lima',
            email: 'marina.lima@exemplo.com',
            phone: '+55 31 96666-8899',
            document: '333.444.555-66',
            rg: '33.445.556-3',
            nis: '987.65432.10-9',
            birthDate: new Date('1979-07-27'),
            sex: 'Feminino',
            gender: 'Mulher',
            raceColor: 'Preta',
            maritalStatus: 'Divorciada',
            nationality: 'Brasileira',
            status: 'Em espera',
            tags: ['Entrevista de acompanhamento'],
        },
        {
            id: 'c9fd7f0b-faf7-4cad-a38a-58b566e7e623',
            fullName: 'Beatriz Almeida',
            socialName: 'Bia Almeida',
            email: 'beatriz.almeida@exemplo.com',
            phone: '+55 11 97777-1212',
            document: '444.555.666-77',
            rg: '55.667.788-4',
            nis: '456.98765.43-2',
            birthDate: new Date('1992-08-20'),
            sex: 'Feminino',
            gender: 'Mulher',
            raceColor: 'Branca',
            maritalStatus: 'Solteira',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: 'cadb7788-7849-42f8-9be7-1d99ff793f00',
            fullName: 'Lucas Martins',
            socialName: 'Lucas Martins',
            email: 'lucas.martins@exemplo.com',
            phone: '+55 11 98888-3344',
            document: '555.666.777-88',
            rg: '66.778.899-5',
            nis: '567.12345.67-8',
            birthDate: new Date('1985-02-18'),
            sex: 'Masculino',
            gender: 'Homem',
            raceColor: 'Parda',
            maritalStatus: 'Casado',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: '7b4c445f-7009-4b73-a97e-a9468f2c1777',
            fullName: 'Fernanda Costa',
            socialName: 'Fernanda Costa',
            email: 'fernanda.costa@exemplo.com',
            phone: '+55 11 95555-3344',
            document: '666.777.888-99',
            rg: '77.889.900-6',
            nis: '678.54321.09-3',
            birthDate: new Date('1990-05-05'),
            sex: 'Feminino',
            gender: 'Mulher',
            raceColor: 'Branca',
            maritalStatus: 'Solteira',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: '829f8d60-e82c-42b3-a6dd-97b60e508ad6',
            fullName: 'Diego Santos',
            socialName: 'Diego Santos',
            email: 'diego.santos@exemplo.com',
            phone: '+55 21 94444-5566',
            document: '777.888.999-00',
            rg: '88.990.011-7',
            nis: '789.65432.10-4',
            birthDate: new Date('1987-11-30'),
            sex: 'Masculino',
            gender: 'Homem',
            raceColor: 'Preta',
            maritalStatus: 'Casado',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: '4ae2c2df-8220-4234-86ed-43da9cea9025',
            fullName: 'Paula Ribeiro',
            socialName: 'Paula Ribeiro',
            email: 'paula.ribeiro@exemplo.com',
            phone: '+55 31 97777-8899',
            document: '888.999.000-11',
            rg: '99.001.122-8',
            nis: '890.76543.21-5',
            birthDate: new Date('1991-09-14'),
            sex: 'Feminino',
            gender: 'Mulher',
            raceColor: 'Parda',
            maritalStatus: 'Divorciada',
            nationality: 'Brasileira',
            status: 'Em espera',
        },
        {
            id: '76a90a40-2a7a-40c4-9b0f-9cee5a56d96a',
            fullName: 'Rafael Oliveira',
            socialName: 'Rafael Oliveira',
            email: 'rafael.oliveira@exemplo.com',
            phone: '+55 21 96666-1122',
            document: '999.000.111-22',
            rg: '10.112.233-9',
            nis: '901.87654.32-6',
            birthDate: new Date('1983-03-10'),
            sex: 'Masculino',
            gender: 'Homem',
            raceColor: 'Branca',
            maritalStatus: 'Casado',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: 'ac006735-d04b-4259-8025-86cd3fd6030c',
            fullName: 'Juliana Freitas',
            socialName: 'Juliana Freitas',
            email: 'juliana.freitas@exemplo.com',
            phone: '+55 41 98888-2211',
            document: '111.000.222-33',
            rg: '11.223.344-0',
            nis: '012.98765.43-7',
            birthDate: new Date('1996-07-22'),
            sex: 'Feminino',
            gender: 'Mulher',
            raceColor: 'Branca',
            maritalStatus: 'Solteira',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: 'b10ebb06-5f02-4e2e-ba20-197e1596570f',
            fullName: 'Gustavo Lima',
            socialName: 'Gustavo Lima',
            email: 'gustavo.lima@exemplo.com',
            phone: '+55 41 97777-3344',
            document: '222.111.333-44',
            rg: '22.334.455-1',
            nis: '123.09876.54-8',
            birthDate: new Date('1989-12-12'),
            sex: 'Masculino',
            gender: 'Homem',
            raceColor: 'Parda',
            maritalStatus: 'Casado',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: 'cc184af4-e7cb-4235-9155-96accf0725e4',
            fullName: 'Patricia Ramos',
            socialName: 'Patricia Ramos',
            email: 'patricia.ramos@exemplo.com',
            phone: '+55 51 99999-5522',
            document: '333.222.444-55',
            rg: '33.445.566-2',
            nis: '234.10987.65-9',
            birthDate: new Date('1993-04-08'),
            sex: 'Feminino',
            gender: 'Mulher',
            raceColor: 'Branca',
            maritalStatus: 'Solteira',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: '88006fc9-7db6-4e39-8e65-2c63ff0eb798',
            fullName: 'Henrique Duarte',
            socialName: 'Henrique Duarte',
            email: 'henrique.duarte@exemplo.com',
            phone: '+55 51 98888-6644',
            document: '444.333.555-66',
            rg: '44.556.677-3',
            nis: '345.21098.76-0',
            birthDate: new Date('1984-06-17'),
            sex: 'Masculino',
            gender: 'Homem',
            raceColor: 'Preta',
            maritalStatus: 'Casado',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: '583145fa-138e-47d0-a758-9732a9653172',
            fullName: 'Camila Torres',
            socialName: 'Camila Torres',
            email: 'camila.torres@exemplo.com',
            phone: '+55 61 97777-6655',
            document: '555.444.666-77',
            rg: '55.667.788-4',
            nis: '456.32109.87-1',
            birthDate: new Date('1997-01-30'),
            sex: 'Feminino',
            gender: 'Mulher',
            raceColor: 'Branca',
            maritalStatus: 'Solteira',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: 'bafaf3f1-1b66-4dfa-a78b-40e3d6799652',
            fullName: 'Leonardo Lopes',
            socialName: 'Leonardo Lopes',
            email: 'leonardo.lopes@exemplo.com',
            phone: '+55 61 98888-7788',
            document: '666.555.777-88',
            rg: '66.778.899-5',
            nis: '567.43210.98-2',
            birthDate: new Date('1982-10-05'),
            sex: 'Masculino',
            gender: 'Homem',
            raceColor: 'Parda',
            maritalStatus: 'Casado',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: '39b8f1ad-d8aa-41b4-9757-ad33b35b2314',
            fullName: 'Larissa Rocha',
            socialName: 'Larissa Rocha',
            email: 'larissa.rocha@exemplo.com',
            phone: '+55 71 97777-8899',
            document: '777.666.888-99',
            rg: '77.889.900-6',
            nis: '678.54321.09-3',
            birthDate: new Date('1995-09-09'),
            sex: 'Feminino',
            gender: 'Mulher',
            raceColor: 'Branca',
            maritalStatus: 'Solteira',
            nationality: 'Brasileira',
            status: 'Em espera',
        },
        {
            id: 'd79704f6-378f-439f-b40d-9eea794fbd5b',
            fullName: 'Ricardo Nunes',
            socialName: 'Ricardo Nunes',
            email: 'ricardo.nunes@exemplo.com',
            phone: '+55 71 98888-9900',
            document: '888.777.999-00',
            rg: '88.990.011-7',
            nis: '789.65432.10-4',
            birthDate: new Date('1978-11-11'),
            sex: 'Masculino',
            gender: 'Homem',
            raceColor: 'Preta',
            maritalStatus: 'Divorciado',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: 'c466a73a-503c-45ba-8d97-4c09e9f6c66d',
            fullName: 'Sabrina Melo',
            socialName: 'Sabrina Melo',
            email: 'sabrina.melo@exemplo.com',
            phone: '+55 81 97777-1122',
            document: '999.888.000-11',
            rg: '99.001.122-8',
            nis: '890.76543.21-5',
            birthDate: new Date('1999-04-15'),
            sex: 'Feminino',
            gender: 'Mulher',
            raceColor: 'Branca',
            maritalStatus: 'Solteira',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: '722bbc89-d6b9-4931-b741-9e010c9a38ff',
            fullName: 'Felipe Araujo',
            socialName: 'Felipe Araujo',
            email: 'felipe.araujo@exemplo.com',
            phone: '+55 81 98888-2233',
            document: '101.111.222-33',
            rg: '11.223.344-9',
            nis: '901.87654.32-6',
            birthDate: new Date('1986-05-28'),
            sex: 'Masculino',
            gender: 'Homem',
            raceColor: 'Parda',
            maritalStatus: 'Casado',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: '2e48d425-9f09-4cd1-bb32-4934ad5c07ee',
            fullName: 'Renata Vieira',
            socialName: 'Renata Vieira',
            email: 'renata.vieira@exemplo.com',
            phone: '+55 91 97777-4455',
            document: '212.222.333-44',
            rg: '22.334.455-0',
            nis: '012.98765.43-7',
            birthDate: new Date('1998-06-06'),
            sex: 'Feminino',
            gender: 'Mulher',
            raceColor: 'Branca',
            maritalStatus: 'Solteira',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: '10f1e22d-1111-4a44-8c44-111111111111',
            fullName: 'Daniel Cruz',
            socialName: 'Daniel Cruz',
            email: 'daniel.cruz@exemplo.com',
            phone: '+55 11 96666-7788',
            document: '313.333.444-55',
            rg: '33.445.566-1',
            nis: '123.45678.90-1',
            birthDate: new Date('1991-02-02'),
            sex: 'Masculino',
            gender: 'Homem',
            raceColor: 'Parda',
            maritalStatus: 'Solteiro',
            nationality: 'Brasileira',
            status: 'Ativo',
        },
        {
            id: '20f2e33d-2222-4b55-8d55-222222222222',
            fullName: 'Isabela Castro',
            socialName: 'Isabela Castro',
            email: 'isabela.castro@exemplo.com',
            phone: '+55 11 95555-6677',
            document: '414.444.555-66',
            rg: '44.556.677-2',
            nis: '234.56789.01-2',
            birthDate: new Date('1990-12-18'),
            sex: 'Feminino',
            gender: 'Mulher',
            raceColor: 'Branca',
            maritalStatus: 'Casada',
            nationality: 'Brasileira',
            status: 'Em espera',
        },
    ];
    for (const person of people) {
        await prisma.person.upsert({
            where: {
                id: person.id,
            },
            update: {
                fullName: person.fullName,
                socialName: person.socialName,
                email: person.email,
                phone: person.phone,
                document: person.document,
                rg: person.rg,
                nis: person.nis,
                birthDate: person.birthDate,
                sex: person.sex,
                gender: person.gender,
                raceColor: person.raceColor,
                maritalStatus: person.maritalStatus,
                nationality: person.nationality,
                status: person.status,
                personType: person.personType ?? 'Atendido',
                departureReason: person.departureReason,
                notes: person.notes,
                profileSummary: person.profileSummary,
                avatarUrl: person.avatarUrl,
                tags: person.tags ? JSON.stringify(person.tags) : null,
            },
            create: {
                id: person.id,
                tenantId: tenant.id,
                fullName: person.fullName,
                socialName: person.socialName,
                email: person.email,
                phone: person.phone,
                document: person.document,
                rg: person.rg,
                nis: person.nis,
                birthDate: person.birthDate,
                sex: person.sex,
                gender: person.gender,
                raceColor: person.raceColor,
                maritalStatus: person.maritalStatus,
                nationality: person.nationality,
                status: person.status,
                personType: person.personType ?? 'Atendido',
                departureReason: person.departureReason ?? null,
                notes: person.notes ?? 'Cadastro inicial.',
                profileSummary: person.profileSummary ?? '<p>Cadastro base para testes.</p>',
                avatarUrl: person.avatarUrl ?? defaultAvatarUrl,
                tags: person.tags ? JSON.stringify(person.tags) : null,
            },
        });
    }
    const householdIds = {
        ana: "11111111-1111-1111-1111-111111111110",
        carlos: "22222222-2222-2222-2222-222222222220",
        ricardo: "33333333-3333-3333-3333-333333333330",
    };
    const householdSeeds = [
        {
            id: householdIds.ana,
            name: "Residencia Ana Pereira",
        },
        {
            id: householdIds.carlos,
            name: "Residencia Carlos Souza",
        },
        {
            id: householdIds.ricardo,
            name: "Residencia Ricardo Nunes",
        },
    ];
    for (const household of householdSeeds) {
        await prisma.household.upsert({
            where: { id: household.id },
            update: { name: household.name, tenantId: tenant.id },
            create: {
                id: household.id,
                tenantId: tenant.id,
                name: household.name,
            },
        });
    }
    const householdProfiles = [
        {
            id: "e2c8a7d6-1a7b-4fdd-9d8a-1df6b1c0a111",
            householdId: householdIds.ana,
            type: "Alvenaria",
            condition: "Rebocada",
            ownership: "Cedida",
            areaM2: 75,
            rooms: 3,
            bathrooms: 1,
            notes: "Residencia em bom estado.",
        },
        {
            id: "4b5e1c3a-0c2f-4b66-9a7d-4f74a3b7c222",
            householdId: householdIds.carlos,
            type: "Madeira",
            condition: "Parcial",
            ownership: "Alugada",
            areaM2: 58,
            rooms: 2,
            bathrooms: 1,
            notes: "Moradia com manutencao pendente.",
        },
        {
            id: "5c3f2d4a-1b2c-4c77-9f1d-5d21a7b8c333",
            householdId: householdIds.ricardo,
            type: "Alvenaria",
            condition: "Reformada",
            ownership: "Financiada",
            areaM2: 92,
            rooms: 3,
            bathrooms: 2,
            notes: "Residencia em boas condicoes.",
        },
    ];
    for (const profile of householdProfiles) {
        await prisma.householdProfile.upsert({
            where: { householdId: profile.householdId },
            update: {
                type: profile.type,
                condition: profile.condition,
                ownership: profile.ownership,
                areaM2: profile.areaM2,
                rooms: profile.rooms,
                bathrooms: profile.bathrooms,
                notes: profile.notes,
            },
            create: {
                id: profile.id,
                tenantId: tenant.id,
                householdId: profile.householdId,
                type: profile.type,
                condition: profile.condition,
                ownership: profile.ownership,
                areaM2: profile.areaM2,
                rooms: profile.rooms,
                bathrooms: profile.bathrooms,
                notes: profile.notes,
            },
        });
    }
    const upsertHouseholdMember = async (data) => {
        await prisma.householdMember.upsert({
            where: {
                householdId_personId: {
                    householdId: data.householdId,
                    personId: data.personId,
                },
            },
            update: {
                role: data.role ?? null,
                isLegalGuardian: data.isLegalGuardian ?? false,
                isHouseholdHead: data.isHouseholdHead ?? false,
                isIncomeContributor: data.isIncomeContributor ?? false,
                isProvider: data.isProvider ?? false,
                isDependent: data.isDependent ?? false,
                notes: data.notes ?? null,
            },
            create: {
                tenantId: tenant.id,
                householdId: data.householdId,
                personId: data.personId,
                role: data.role ?? null,
                isLegalGuardian: data.isLegalGuardian ?? false,
                isHouseholdHead: data.isHouseholdHead ?? false,
                isIncomeContributor: data.isIncomeContributor ?? false,
                isProvider: data.isProvider ?? false,
                isDependent: data.isDependent ?? false,
                notes: data.notes ?? null,
            },
        });
    };
    const upsertRelation = async (data) => {
        await prisma.personRelation.upsert({
            where: {
                tenantId_personId_relatedPersonId_type: {
                    tenantId: tenant.id,
                    personId: data.personId,
                    relatedPersonId: data.relatedPersonId,
                    type: data.type,
                },
            },
            update: {
                livesTogether: data.livesTogether ?? false,
                isLegalGuardian: data.isLegalGuardian ?? false,
                notes: data.notes ?? null,
            },
            create: {
                tenantId: tenant.id,
                personId: data.personId,
                relatedPersonId: data.relatedPersonId,
                type: data.type,
                livesTogether: data.livesTogether ?? false,
                isLegalGuardian: data.isLegalGuardian ?? false,
                notes: data.notes ?? null,
            },
        });
    };
    await upsertHouseholdMember({
        householdId: householdIds.ana,
        personId: "675d3227-da20-4e40-ab70-4b2a1011d728",
        role: "Dependente",
        isDependent: true,
    });
    await upsertHouseholdMember({
        householdId: householdIds.ana,
        personId: "c9e5539e-242a-4ef2-b5b7-3e9bd4c2dacf",
        role: "Responsavel",
        isLegalGuardian: true,
        isHouseholdHead: true,
        isProvider: true,
        isIncomeContributor: true,
    });
    await upsertHouseholdMember({
        householdId: householdIds.ana,
        personId: "c9fd7f0b-faf7-4cad-a38a-58b566e7e623",
        role: "Dependente",
        isDependent: true,
    });
    await upsertRelation({
        personId: "675d3227-da20-4e40-ab70-4b2a1011d728",
        relatedPersonId: "c9e5539e-242a-4ef2-b5b7-3e9bd4c2dacf",
        type: "Mae",
        livesTogether: true,
        isLegalGuardian: true,
    });
    await upsertRelation({
        personId: "675d3227-da20-4e40-ab70-4b2a1011d728",
        relatedPersonId: "c9fd7f0b-faf7-4cad-a38a-58b566e7e623",
        type: "Irmao(a)",
        livesTogether: true,
    });
    await upsertRelation({
        personId: "675d3227-da20-4e40-ab70-4b2a1011d728",
        relatedPersonId: "d79704f6-378f-439f-b40d-9eea794fbd5b",
        type: "Pai",
        livesTogether: false,
        isLegalGuardian: true,
    });
    await upsertRelation({
        personId: "c9e5539e-242a-4ef2-b5b7-3e9bd4c2dacf",
        relatedPersonId: "675d3227-da20-4e40-ab70-4b2a1011d728",
        type: "Filho(a)",
        livesTogether: true,
        isLegalGuardian: true,
    });
    await upsertRelation({
        personId: "c9fd7f0b-faf7-4cad-a38a-58b566e7e623",
        relatedPersonId: "675d3227-da20-4e40-ab70-4b2a1011d728",
        type: "Irmao(a)",
        livesTogether: true,
    });
    await upsertRelation({
        personId: "d79704f6-378f-439f-b40d-9eea794fbd5b",
        relatedPersonId: "675d3227-da20-4e40-ab70-4b2a1011d728",
        type: "Filho(a)",
        livesTogether: false,
        isLegalGuardian: true,
    });
    await upsertHouseholdMember({
        householdId: householdIds.ricardo,
        personId: "d79704f6-378f-439f-b40d-9eea794fbd5b",
        role: "Responsavel",
        isLegalGuardian: true,
        isHouseholdHead: true,
        isProvider: true,
        isIncomeContributor: true,
    });
    await upsertHouseholdMember({
        householdId: householdIds.ricardo,
        personId: "39b8f1ad-d8aa-41b4-9757-ad33b35b2314",
        role: "Conjuge",
        isIncomeContributor: true,
    });
    await upsertHouseholdMember({
        householdId: householdIds.ricardo,
        personId: "10f1e22d-1111-4a44-8c44-111111111111",
        role: "Dependente",
        isDependent: true,
    });
    await upsertRelation({
        personId: "d79704f6-378f-439f-b40d-9eea794fbd5b",
        relatedPersonId: "39b8f1ad-d8aa-41b4-9757-ad33b35b2314",
        type: "Conjuge",
        livesTogether: true,
    });
    await upsertRelation({
        personId: "39b8f1ad-d8aa-41b4-9757-ad33b35b2314",
        relatedPersonId: "d79704f6-378f-439f-b40d-9eea794fbd5b",
        type: "Conjuge",
        livesTogether: true,
    });
    await upsertRelation({
        personId: "d79704f6-378f-439f-b40d-9eea794fbd5b",
        relatedPersonId: "10f1e22d-1111-4a44-8c44-111111111111",
        type: "Filho(a)",
        livesTogether: true,
        isLegalGuardian: true,
    });
    await upsertRelation({
        personId: "10f1e22d-1111-4a44-8c44-111111111111",
        relatedPersonId: "d79704f6-378f-439f-b40d-9eea794fbd5b",
        type: "Pai",
        livesTogether: true,
        isLegalGuardian: true,
    });
    await upsertHouseholdMember({
        householdId: householdIds.carlos,
        personId: "5a6afec4-5165-4f20-b394-d95b4d603fdd",
        role: "Morador",
        isHouseholdHead: true,
        isProvider: true,
        isIncomeContributor: true,
    });
    await upsertHouseholdMember({
        householdId: householdIds.carlos,
        personId: "4ae2c2df-8220-4234-86ed-43da9cea9025",
        role: "Conjuge",
        isLegalGuardian: true,
        isIncomeContributor: true,
    });
    await upsertHouseholdMember({
        householdId: householdIds.carlos,
        personId: "583145fa-138e-47d0-a758-9732a9653172",
        role: "Dependente",
        isDependent: true,
    });
    await upsertRelation({
        personId: "5a6afec4-5165-4f20-b394-d95b4d603fdd",
        relatedPersonId: "4ae2c2df-8220-4234-86ed-43da9cea9025",
        type: "Conjuge",
        livesTogether: true,
    });
    await upsertRelation({
        personId: "5a6afec4-5165-4f20-b394-d95b4d603fdd",
        relatedPersonId: "583145fa-138e-47d0-a758-9732a9653172",
        type: "Filho(a)",
        livesTogether: true,
        isLegalGuardian: true,
    });
    await upsertRelation({
        personId: "4ae2c2df-8220-4234-86ed-43da9cea9025",
        relatedPersonId: "5a6afec4-5165-4f20-b394-d95b4d603fdd",
        type: "Conjuge",
        livesTogether: true,
    });
    await upsertRelation({
        personId: "4ae2c2df-8220-4234-86ed-43da9cea9025",
        relatedPersonId: "583145fa-138e-47d0-a758-9732a9653172",
        type: "Filho(a)",
        livesTogether: true,
        isLegalGuardian: true,
    });
    await upsertRelation({
        personId: "583145fa-138e-47d0-a758-9732a9653172",
        relatedPersonId: "4ae2c2df-8220-4234-86ed-43da9cea9025",
        type: "Mae",
        livesTogether: true,
        isLegalGuardian: true,
    });
    await upsertRelation({
        personId: "583145fa-138e-47d0-a758-9732a9653172",
        relatedPersonId: "5a6afec4-5165-4f20-b394-d95b4d603fdd",
        type: "Pai",
        livesTogether: true,
        isLegalGuardian: true,
    });
    const incomeSeeds = [
        {
            id: "7f2e9b7b-3f05-4e6c-9e6b-1d6b1c0a3001",
            householdId: householdIds.ana,
            personId: "c9e5539e-242a-4ef2-b5b7-3e9bd4c2dacf",
            type: "Salario",
            amount: 2500,
            frequency: "MONTHLY",
            contractType: "CLT",
            isHouseholdContribution: true,
            notes: "Renda principal da residencia.",
        },
        {
            id: "7f2e9b7b-3f05-4e6c-9e6b-1d6b1c0a3002",
            householdId: householdIds.ana,
            personId: "c9e5539e-242a-4ef2-b5b7-3e9bd4c2dacf",
            type: "Bolsa Familia",
            amount: 400,
            frequency: "MONTHLY",
            isHouseholdContribution: true,
            notes: "Beneficio mensal.",
        },
        {
            id: "7f2e9b7b-3f05-4e6c-9e6b-1d6b1c0a3003",
            householdId: householdIds.ricardo,
            personId: "d79704f6-378f-439f-b40d-9eea794fbd5b",
            type: "Salario",
            amount: 4500,
            frequency: "MONTHLY",
            contractType: "PJ",
            isHouseholdContribution: true,
            notes: "Renda do responsavel.",
        },
        {
            id: "7f2e9b7b-3f05-4e6c-9e6b-1d6b1c0a3004",
            householdId: householdIds.ricardo,
            personId: "39b8f1ad-d8aa-41b4-9757-ad33b35b2314",
            type: "Salario",
            amount: 1800,
            frequency: "MONTHLY",
            contractType: "CLT",
            isHouseholdContribution: true,
        },
        {
            id: "7f2e9b7b-3f05-4e6c-9e6b-1d6b1c0a3005",
            householdId: householdIds.carlos,
            personId: "5a6afec4-5165-4f20-b394-d95b4d603fdd",
            type: "Salario",
            amount: 3200,
            frequency: "MONTHLY",
            contractType: "CLT",
            isHouseholdContribution: true,
        },
        {
            id: "7f2e9b7b-3f05-4e6c-9e6b-1d6b1c0a3006",
            householdId: householdIds.carlos,
            personId: "4ae2c2df-8220-4234-86ed-43da9cea9025",
            type: "Auxilio",
            amount: 400,
            frequency: "MONTHLY",
            isHouseholdContribution: true,
        },
    ];
    for (const income of incomeSeeds) {
        await prisma.personIncome.upsert({
            where: { id: income.id },
            update: {
                householdId: income.householdId,
                type: income.type,
                amount: income.amount,
                frequency: income.frequency,
                contractType: income.contractType ?? null,
                isHouseholdContribution: income.isHouseholdContribution,
                notes: income.notes ?? null,
            },
            create: {
                id: income.id,
                tenantId: tenant.id,
                personId: income.personId,
                householdId: income.householdId,
                type: income.type,
                amount: income.amount,
                frequency: income.frequency,
                contractType: income.contractType ?? null,
                isHouseholdContribution: income.isHouseholdContribution,
                notes: income.notes ?? null,
            },
        });
    }
    const expenseSeeds = [
        {
            id: "6f2e9b7b-3f05-4e6c-9e6b-1d6b1c0a3101",
            householdId: householdIds.ana,
            personId: "c9e5539e-242a-4ef2-b5b7-3e9bd4c2dacf",
            type: "Aluguel",
            amount: 900,
            frequency: "MONTHLY",
            isHouseholdExpense: true,
            notes: "Aluguel da residencia.",
        },
        {
            id: "6f2e9b7b-3f05-4e6c-9e6b-1d6b1c0a3102",
            householdId: householdIds.ana,
            personId: "c9e5539e-242a-4ef2-b5b7-3e9bd4c2dacf",
            type: "Alimentacao",
            amount: 650,
            frequency: "MONTHLY",
            isHouseholdExpense: true,
        },
        {
            id: "6f2e9b7b-3f05-4e6c-9e6b-1d6b1c0a3103",
            householdId: householdIds.ricardo,
            personId: "d79704f6-378f-439f-b40d-9eea794fbd5b",
            type: "Aluguel",
            amount: 1200,
            frequency: "MONTHLY",
            isHouseholdExpense: true,
        },
        {
            id: "6f2e9b7b-3f05-4e6c-9e6b-1d6b1c0a3104",
            householdId: householdIds.carlos,
            personId: "5a6afec4-5165-4f20-b394-d95b4d603fdd",
            type: "Aluguel",
            amount: 1100,
            frequency: "MONTHLY",
            isHouseholdExpense: true,
        },
        {
            id: "6f2e9b7b-3f05-4e6c-9e6b-1d6b1c0a3105",
            householdId: householdIds.carlos,
            personId: "5a6afec4-5165-4f20-b394-d95b4d603fdd",
            type: "Energia",
            amount: 260,
            frequency: "MONTHLY",
            isHouseholdExpense: true,
        },
    ];
    for (const expense of expenseSeeds) {
        await prisma.personExpense.upsert({
            where: { id: expense.id },
            update: {
                householdId: expense.householdId,
                type: expense.type,
                amount: expense.amount,
                frequency: expense.frequency,
                isHouseholdExpense: expense.isHouseholdExpense,
                notes: expense.notes ?? null,
            },
            create: {
                id: expense.id,
                tenantId: tenant.id,
                personId: expense.personId,
                householdId: expense.householdId,
                type: expense.type,
                amount: expense.amount,
                frequency: expense.frequency,
                isHouseholdExpense: expense.isHouseholdExpense,
                notes: expense.notes ?? null,
            },
        });
    }
    const transferSeeds = [
        {
            id: "9f2e9b7b-3f05-4e6c-9e6b-1d6b1c0a3201",
            personId: "d79704f6-378f-439f-b40d-9eea794fbd5b",
            fromHouseholdId: householdIds.ricardo,
            toHouseholdId: householdIds.ana,
            type: "PENSION",
            amount: 600,
            frequency: "MONTHLY",
            notes: "Pensao paga para a familia da Ana.",
        },
    ];
    for (const transfer of transferSeeds) {
        await prisma.householdTransfer.upsert({
            where: { id: transfer.id },
            update: {
                fromHouseholdId: transfer.fromHouseholdId,
                toHouseholdId: transfer.toHouseholdId,
                type: transfer.type,
                amount: transfer.amount,
                frequency: transfer.frequency,
                notes: transfer.notes ?? null,
            },
            create: {
                id: transfer.id,
                tenantId: tenant.id,
                personId: transfer.personId,
                fromHouseholdId: transfer.fromHouseholdId,
                toHouseholdId: transfer.toHouseholdId,
                type: transfer.type,
                amount: transfer.amount,
                frequency: transfer.frequency,
                notes: transfer.notes ?? null,
            },
        });
    }
    const householdAssets = [
        {
            id: "8a2f1c7b-0a32-4a8d-9a1c-1d6b1c0a4001",
            householdId: householdIds.ana,
            category: "Eletrodomesticos",
            item: "Geladeira",
            quantity: 1,
            condition: "Bom",
        },
        {
            id: "8a2f1c7b-0a32-4a8d-9a1c-1d6b1c0a4002",
            householdId: householdIds.ana,
            category: "Moveis",
            item: "Sofa",
            quantity: 1,
            condition: "Usado",
        },
        {
            id: "8a2f1c7b-0a32-4a8d-9a1c-1d6b1c0a4005",
            householdId: householdIds.ana,
            category: "Moveis",
            item: "Mesa",
            quantity: 1,
            condition: "Bom",
        },
        {
            id: "8a2f1c7b-0a32-4a8d-9a1c-1d6b1c0a4003",
            householdId: householdIds.carlos,
            category: "Servicos",
            item: "Internet",
            quantity: 1,
            condition: "Ativo",
        },
        {
            id: "8a2f1c7b-0a32-4a8d-9a1c-1d6b1c0a4004",
            householdId: householdIds.carlos,
            category: "Aparelhos",
            item: "Televisao",
            quantity: 1,
            condition: "Bom",
        },
        {
            id: "8a2f1c7b-0a32-4a8d-9a1c-1d6b1c0a4006",
            householdId: householdIds.ricardo,
            category: "Eletrodomesticos",
            item: "Maquina de lavar",
            quantity: 1,
            condition: "Bom",
        },
    ];
    for (const asset of householdAssets) {
        await prisma.householdAsset.upsert({
            where: { id: asset.id },
            update: {
                category: asset.category,
                item: asset.item,
                quantity: asset.quantity,
                condition: asset.condition ?? null,
            },
            create: {
                id: asset.id,
                tenantId: tenant.id,
                householdId: asset.householdId,
                category: asset.category,
                item: asset.item,
                quantity: asset.quantity,
                condition: asset.condition ?? null,
            },
        });
    }
    const personAssets = [
        {
            id: "9b2f1c7b-0a32-4a8d-9a1c-1d6b1c0a5001",
            personId: "c9e5539e-242a-4ef2-b5b7-3e9bd4c2dacf",
            category: "Pessoal",
            item: "Celular",
            quantity: 1,
            condition: "Bom",
        },
        {
            id: "9b2f1c7b-0a32-4a8d-9a1c-1d6b1c0a5002",
            personId: "5a6afec4-5165-4f20-b394-d95b4d603fdd",
            category: "Veiculo",
            item: "Moto",
            quantity: 1,
            condition: "Usado",
        },
        {
            id: "9b2f1c7b-0a32-4a8d-9a1c-1d6b1c0a5003",
            personId: "4ae2c2df-8220-4234-86ed-43da9cea9025",
            category: "Pessoal",
            item: "Notebook",
            quantity: 1,
            condition: "Bom",
        },
        {
            id: "9b2f1c7b-0a32-4a8d-9a1c-1d6b1c0a5004",
            personId: "d79704f6-378f-439f-b40d-9eea794fbd5b",
            category: "Veiculo",
            item: "Carro",
            quantity: 1,
            condition: "Bom",
        },
        {
            id: "9b2f1c7b-0a32-4a8d-9a1c-1d6b1c0a5005",
            personId: "39b8f1ad-d8aa-41b4-9757-ad33b35b2314",
            category: "Pessoal",
            item: "Celular",
            quantity: 1,
            condition: "Bom",
        },
    ];
    for (const asset of personAssets) {
        await prisma.personAsset.upsert({
            where: { id: asset.id },
            update: {
                category: asset.category,
                item: asset.item,
                quantity: asset.quantity,
                condition: asset.condition ?? null,
            },
            create: {
                id: asset.id,
                tenantId: tenant.id,
                personId: asset.personId,
                category: asset.category,
                item: asset.item,
                quantity: asset.quantity,
                condition: asset.condition ?? null,
            },
        });
    }
    const healthConditions = [
        {
            id: "c820b9b1-3b58-4f1a-b0e0-4dfc0c5d9001",
            personId: "675d3227-da20-4e40-ab70-4b2a1011d728",
            type: "Deficiencia Auditiva",
            description: "Perda de 70% da audicao.",
            severity: "Moderada",
            diagnosisDate: new Date("2012-06-10"),
            documentUrl: "/uploads/health/parecer-medico-auditivo.pdf",
            notes: "Acompanhamento com fonoaudiologia.",
        },
        {
            id: "c820b9b1-3b58-4f1a-b0e0-4dfc0c5d9002",
            personId: "5a6afec4-5165-4f20-b394-d95b4d603fdd",
            type: "Deficiencia Visual",
            description: "Perda parcial da visao.",
            severity: "Leve",
            diagnosisDate: new Date("2018-03-12"),
            documentUrl: "/uploads/health/parecer-medico-visao.pdf",
            notes: "Uso de oculos com atualizacao anual.",
        },
    ];
    for (const condition of healthConditions) {
        await prisma.personHealthCondition.upsert({
            where: { id: condition.id },
            update: {
                type: condition.type,
                description: condition.description ?? null,
                severity: condition.severity ?? null,
                diagnosisDate: condition.diagnosisDate ?? null,
                documentUrl: condition.documentUrl ?? null,
                notes: condition.notes ?? null,
            },
            create: {
                id: condition.id,
                tenantId: tenant.id,
                personId: condition.personId,
                type: condition.type,
                description: condition.description ?? null,
                severity: condition.severity ?? null,
                diagnosisDate: condition.diagnosisDate ?? null,
                documentUrl: condition.documentUrl ?? null,
                notes: condition.notes ?? null,
            },
        });
    }
    const medications = [
        {
            id: "d920b9b1-3b58-4f1a-b0e0-4dfc0c5d9101",
            personId: "675d3227-da20-4e40-ab70-4b2a1011d728",
            reason: "TDAH",
            medication: "Ritalina",
            dosage: "10 mg",
            schedule: "08h/08h",
            startDate: new Date("2024-01-15"),
            prescribingDoctor: "Dr. Gustavo Almeida",
            permissionDocumentUrl: "/uploads/health/autorizacao-pais.pdf",
            notes: "Uso somente em dias de atendimento.",
        },
        {
            id: "d920b9b1-3b58-4f1a-b0e0-4dfc0c5d9102",
            personId: "5a6afec4-5165-4f20-b394-d95b4d603fdd",
            reason: "Hipertensao",
            medication: "Losartana",
            dosage: "50 mg",
            schedule: "1 vez ao dia",
            startDate: new Date("2022-05-20"),
            prescribingDoctor: "Dra. Marcia Silveira",
            documentUrl: "/uploads/health/receita-losartana.pdf",
            notes: "Monitorar pressao semanalmente.",
        },
    ];
    for (const medication of medications) {
        await prisma.personMedication.upsert({
            where: { id: medication.id },
            update: {
                reason: medication.reason ?? null,
                medication: medication.medication,
                dosage: medication.dosage ?? null,
                schedule: medication.schedule ?? null,
                startDate: medication.startDate ?? null,
                endDate: medication.endDate ?? null,
                prescribingDoctor: medication.prescribingDoctor ?? null,
                permissionDocumentUrl: medication.permissionDocumentUrl ?? null,
                documentUrl: medication.documentUrl ?? null,
                notes: medication.notes ?? null,
            },
            create: {
                id: medication.id,
                tenantId: tenant.id,
                personId: medication.personId,
                reason: medication.reason ?? null,
                medication: medication.medication,
                dosage: medication.dosage ?? null,
                schedule: medication.schedule ?? null,
                startDate: medication.startDate ?? null,
                endDate: medication.endDate ?? null,
                prescribingDoctor: medication.prescribingDoctor ?? null,
                permissionDocumentUrl: medication.permissionDocumentUrl ?? null,
                documentUrl: medication.documentUrl ?? null,
                notes: medication.notes ?? null,
            },
        });
    }
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map
