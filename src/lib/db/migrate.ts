import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function migrateDatabase() {
  console.log('Starting database migration...')
  
  try {
    // Use Prisma's built-in migration capability
    await prisma.$executeRawUnsafe(`
      -- Create User table
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "name" TEXT,
        "password" TEXT,
        "role" TEXT NOT NULL DEFAULT 'STUDENT',
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "isSuperUser" BOOLEAN NOT NULL DEFAULT false,
        "organizationId" TEXT,
        "lastLoginAt" DATETIME,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create Session table
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "expiresAt" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create Permission table
      CREATE TABLE IF NOT EXISTS "Permission" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "description" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create UserPermission table
      CREATE TABLE IF NOT EXISTS "UserPermission" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "permissionId" TEXT NOT NULL,
        "granted" BOOLEAN NOT NULL DEFAULT true,
        "grantedBy" TEXT,
        "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" DATETIME,
        UNIQUE("userId", "permissionId")
      );

      -- Create AuditLog table
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "metadata" TEXT,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create Course table
      CREATE TABLE IF NOT EXISTS "Course" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "thumbnail" TEXT,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "authorId" TEXT NOT NULL,
        "tags" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "publishedAt" DATETIME,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create Organization table
      CREATE TABLE IF NOT EXISTS "Organization" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "domain" TEXT UNIQUE,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    console.log('Database migration completed successfully')
    return true
  } catch (error) {
    console.error('Database migration failed:', error)
    throw error
  }
}