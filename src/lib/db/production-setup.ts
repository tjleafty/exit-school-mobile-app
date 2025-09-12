import { PrismaClient, Role, PermissionType, CourseStatus, LessonType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { migrateDatabase } from './migrate'

const prisma = new PrismaClient()

// This will run on Vercel to set up the database with initial data
export async function setupProductionDatabase() {
  try {
    console.log('Setting up production database...')
    console.log('Database URL:', process.env.DATABASE_URL)
    
    // Test database connection first
    try {
      await prisma.$connect()
      console.log('Database connection successful')
    } catch (connectionError) {
      console.error('Database connection failed:', connectionError)
      throw new Error(`Database connection failed: ${connectionError instanceof Error ? connectionError.message : 'Unknown error'}`)
    }

    // For in-memory or new databases, we need to apply the schema
    if (process.env.DATABASE_URL?.includes(':memory:') || process.env.VERCEL) {
      console.log('Serverless environment detected, ensuring schema exists...')
      try {
        await migrateDatabase()
        console.log('Database schema applied successfully')
      } catch (migrateError) {
        console.error('Database migration failed:', migrateError)
        throw new Error(`Database migration failed: ${migrateError instanceof Error ? migrateError.message : 'Unknown error'}`)
      }
    }

    // Test basic database functionality
    try {
      const userCount = await prisma.user.count()
      console.log(`Database query test successful - found ${userCount} users`)
    } catch (queryError) {
      console.error('Database query test failed:', queryError)
      throw new Error(`Database query failed: ${queryError instanceof Error ? queryError.message : 'Unknown error'}`)
    }

    // Create default permissions first
    console.log('Creating permissions...')
    const permissions = [
      { name: PermissionType.COURSE_CREATE, description: 'Create new courses' },
      { name: PermissionType.COURSE_EDIT, description: 'Edit existing courses' },
      { name: PermissionType.COURSE_DELETE, description: 'Delete courses' },
      { name: PermissionType.COURSE_VIEW, description: 'View courses' },
      { name: PermissionType.USER_CREATE, description: 'Create new users' },
      { name: PermissionType.USER_EDIT, description: 'Edit user accounts' },
      { name: PermissionType.USER_DELETE, description: 'Delete user accounts' },
      { name: PermissionType.USER_VIEW, description: 'View user information' },
      { name: PermissionType.TOOL_ACCESS, description: 'Access platform tools' },
      { name: PermissionType.TOOL_RESULTS_VIEW, description: 'View tool usage results' },
      { name: PermissionType.ADMIN_PANEL_ACCESS, description: 'Access administrative panel' },
      { name: PermissionType.SYSTEM_SETTINGS, description: 'Modify system settings' }
    ]

    for (const permission of permissions) {
      try {
        await prisma.permission.upsert({
          where: { name: permission.name },
          update: { description: permission.description },
          create: permission
        })
      } catch (permError) {
        console.error(`Failed to create permission ${permission.name}:`, permError)
        throw new Error(`Permission creation failed: ${permError instanceof Error ? permError.message : 'Unknown error'}`)
      }
    }
    console.log('Permissions created successfully')

    // Create admin user
    console.log('Creating admin user...')
    const adminPassword = await bcrypt.hash('password', 12)
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@theexitschool.com' },
      update: {
        name: 'Exit School Admin',
        password: adminPassword,
        role: Role.ADMIN,
        isSuperUser: true,
        isActive: true
      },
      create: {
        email: 'admin@theexitschool.com',
        name: 'Exit School Admin',
        password: adminPassword,
        role: Role.ADMIN,
        isSuperUser: true,
        isActive: true
      }
    })

    // Create instructor user
    const instructorPassword = await bcrypt.hash('password123', 12)
    const instructorUser = await prisma.user.upsert({
      where: { email: 'instructor@theexitschool.com' },
      update: {
        name: 'John Smith',
        password: instructorPassword,
        role: Role.INSTRUCTOR,
        isActive: true
      },
      create: {
        email: 'instructor@theexitschool.com',
        name: 'John Smith', 
        password: instructorPassword,
        role: Role.INSTRUCTOR,
        isActive: true
      }
    })

    // Create student user
    const studentPassword = await bcrypt.hash('password123', 12)
    const studentUser = await prisma.user.upsert({
      where: { email: 'student@theexitschool.com' },
      update: {
        name: 'Jane Doe',
        password: studentPassword,
        role: Role.STUDENT,
        isActive: true
      },
      create: {
        email: 'student@theexitschool.com',
        name: 'Jane Doe',
        password: studentPassword,
        role: Role.STUDENT,
        isActive: true
      }
    })

    // Create sample course
    const sampleCourse = await prisma.course.upsert({
      where: { id: 'business-acquisitions-101' },
      update: {
        title: 'Business Acquisitions 101',
        description: 'Learn the fundamentals of finding, evaluating, and acquiring profitable businesses.',
        status: CourseStatus.PUBLISHED,
        tags: JSON.stringify(['Beginner', 'Fundamentals', 'Due Diligence']),
        authorId: instructorUser.id,
        publishedAt: new Date()
      },
      create: {
        id: 'business-acquisitions-101',
        title: 'Business Acquisitions 101',
        description: 'Learn the fundamentals of finding, evaluating, and acquiring profitable businesses.',
        status: CourseStatus.PUBLISHED,
        tags: JSON.stringify(['Beginner', 'Fundamentals', 'Due Diligence']),
        authorId: instructorUser.id,
        publishedAt: new Date()
      }
    })

    console.log('Production database setup complete!')
    return { adminUser, instructorUser, studentUser, sampleCourse }

  } catch (error) {
    console.error('Production database setup failed:', error)
    throw error
  }
}

// Auto-run setup if this file is executed directly
if (require.main === module) {
  setupProductionDatabase()
    .then(() => {
      console.log('Database setup successful')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Database setup failed:', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}