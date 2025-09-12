import { PrismaClient, Role, UserStatus, PermissionType, CourseStatus, LessonType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createSuperUser() {
  const email = 'admin@theexitschool.com'
  const password = 'password'
  const hashedPassword = await bcrypt.hash(password, 12)

  // Check if super user already exists
  const existingSuperUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingSuperUser) {
    console.log('Super user already exists, updating...')
    
    // Update existing user to ensure it's a super user
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        name: 'Exit School Admin',
        password: hashedPassword,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        isSuperUser: true,
        isActive: true
      }
    })

    console.log('Super user updated:', updatedUser.email)
    return updatedUser
  }

  // Create new super user
  const superUser = await prisma.user.create({
    data: {
      email,
      name: 'Exit School Admin',
      password: hashedPassword,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      isSuperUser: true,
      isActive: true
    }
  })

  console.log('Super user created:', superUser.email)
  return superUser
}

async function createDefaultPermissions() {
  const permissions = [
    {
      name: PermissionType.COURSE_CREATE,
      description: 'Create new courses'
    },
    {
      name: PermissionType.COURSE_EDIT,
      description: 'Edit existing courses'
    },
    {
      name: PermissionType.COURSE_DELETE,
      description: 'Delete courses'
    },
    {
      name: PermissionType.COURSE_VIEW,
      description: 'View courses'
    },
    {
      name: PermissionType.USER_CREATE,
      description: 'Create new users'
    },
    {
      name: PermissionType.USER_EDIT,
      description: 'Edit user accounts'
    },
    {
      name: PermissionType.USER_DELETE,
      description: 'Delete user accounts'
    },
    {
      name: PermissionType.USER_VIEW,
      description: 'View user information'
    },
    {
      name: PermissionType.TOOL_ACCESS,
      description: 'Access platform tools'
    },
    {
      name: PermissionType.TOOL_RESULTS_VIEW,
      description: 'View tool usage results'
    },
    {
      name: PermissionType.ADMIN_PANEL_ACCESS,
      description: 'Access administrative panel'
    },
    {
      name: PermissionType.SYSTEM_SETTINGS,
      description: 'Modify system settings'
    }
  ]

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: { description: permission.description },
      create: permission
    })
  }

  console.log('Default permissions created/updated')
}

async function createRolePermissions() {
  // Get all permissions
  const allPermissions = await prisma.permission.findMany()

  // Define role-based permissions
  const instructorPermissions: PermissionType[] = [
    PermissionType.COURSE_CREATE,
    PermissionType.COURSE_EDIT,
    PermissionType.COURSE_VIEW,
    PermissionType.USER_VIEW,
    PermissionType.TOOL_ACCESS,
    PermissionType.TOOL_RESULTS_VIEW
  ]

  const studentPermissions: PermissionType[] = [
    PermissionType.COURSE_VIEW,
    PermissionType.TOOL_ACCESS
  ]

  const guestPermissions: PermissionType[] = [
    PermissionType.COURSE_VIEW
  ]

  const rolePermissions = {
    [Role.ADMIN]: allPermissions.map(p => p.id),
    [Role.INSTRUCTOR]: allPermissions.filter(p => 
      instructorPermissions.includes(p.name)
    ).map(p => p.id),
    [Role.STUDENT]: allPermissions.filter(p => 
      studentPermissions.includes(p.name)
    ).map(p => p.id),
    [Role.GUEST]: allPermissions.filter(p => 
      guestPermissions.includes(p.name)
    ).map(p => p.id)
  }

  // Create role permissions
  for (const [role, permissionIds] of Object.entries(rolePermissions)) {
    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: role as Role,
            permissionId
          }
        },
        update: {},
        create: {
          role: role as Role,
          permissionId
        }
      })
    }
  }

  console.log('Role permissions created/updated')
}

async function createSampleUsers() {
  const users = [
    {
      email: 'instructor@theexitschool.com',
      name: 'John Smith',
      role: Role.INSTRUCTOR,
      password: 'password123'
    },
    {
      email: 'student@theexitschool.com', 
      name: 'Jane Doe',
      role: Role.STUDENT,
      password: 'password123'
    }
  ]

  const createdUsers = []
  
  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 12)
    
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        password: hashedPassword,
        role: userData.role,
        status: UserStatus.ACTIVE,
        isActive: true
      },
      create: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role,
        status: UserStatus.ACTIVE,
        isActive: true
      }
    })
    
    createdUsers.push(user)
    console.log(`Sample user created/updated: ${user.email}`)
  }
  
  return createdUsers
}

async function createSampleCourses() {
  // Find instructor user
  const instructor = await prisma.user.findFirst({
    where: { role: Role.INSTRUCTOR }
  })
  
  if (!instructor) {
    console.log('No instructor found, skipping course creation')
    return []
  }

  const courses = [
    {
      title: 'Business Acquisitions 101',
      description: 'Learn the fundamentals of finding, evaluating, and acquiring profitable businesses. This comprehensive course covers market research, financial analysis, due diligence, and deal structuring.',
      status: CourseStatus.PUBLISHED,
      tags: ['Beginner', 'Fundamentals', 'Due Diligence'],
      modules: [
        {
          title: 'Introduction to Business Acquisitions',
          description: 'Understanding the landscape of business acquisitions',
          order: 1,
          lessons: [
            {
              title: 'What is Business Acquisition?',
              description: 'Overview of business acquisition concepts',
              type: LessonType.VIDEO,
              content: 'Introduction to business acquisitions...',
              order: 1,
              duration: 600 // 10 minutes
            },
            {
              title: 'Types of Acquisitions',
              description: 'Different acquisition strategies and approaches',
              type: LessonType.ARTICLE,
              content: '# Types of Acquisitions\n\n## Asset Purchase vs Stock Purchase...',
              order: 2,
              duration: 480 // 8 minutes
            }
          ]
        },
        {
          title: 'Financial Analysis',
          description: 'Evaluating the financial health of target businesses',
          order: 2,
          lessons: [
            {
              title: 'Reading Financial Statements',
              description: 'Understanding income statements, balance sheets, and cash flow',
              type: LessonType.VIDEO,
              content: 'Financial statement analysis...',
              order: 1,
              duration: 900 // 15 minutes
            },
            {
              title: 'Valuation Methods',
              description: 'Different approaches to valuing a business',
              type: LessonType.ARTICLE,
              content: '# Business Valuation Methods\n\n## Discounted Cash Flow...',
              order: 2,
              duration: 720 // 12 minutes
            }
          ]
        }
      ]
    },
    {
      title: 'Advanced Business Valuation',
      description: 'Master complex valuation methods and financial modeling for acquisitions. Deep dive into DCF modeling, comparable analysis, and precedent transactions.',
      status: CourseStatus.PUBLISHED,
      tags: ['Advanced', 'Finance', 'Valuation', 'Modeling'],
      modules: [
        {
          title: 'DCF Modeling',
          description: 'Building comprehensive discounted cash flow models',
          order: 1,
          lessons: [
            {
              title: 'Building a DCF Model',
              description: 'Step-by-step DCF model construction',
              type: LessonType.VIDEO,
              content: 'DCF modeling fundamentals...',
              order: 1,
              duration: 1200 // 20 minutes
            }
          ]
        }
      ]
    },
    {
      title: 'Due Diligence Masterclass',
      description: 'Comprehensive guide to conducting thorough due diligence on target companies. Learn to identify risks and opportunities before making acquisition decisions.',
      status: CourseStatus.PUBLISHED,
      tags: ['Intermediate', 'Due Diligence', 'Risk Management'],
      modules: [
        {
          title: 'Legal Due Diligence',
          description: 'Understanding legal aspects of due diligence',
          order: 1,
          lessons: [
            {
              title: 'Contract Review',
              description: 'Reviewing key contracts and agreements',
              type: LessonType.ARTICLE,
              content: '# Contract Due Diligence\n\n## Key Contracts to Review...',
              order: 1,
              duration: 600
            }
          ]
        }
      ]
    }
  ]

  const createdCourses = []

  for (const courseData of courses) {
    const course = await prisma.course.create({
      data: {
        title: courseData.title,
        description: courseData.description,
        status: courseData.status,
        tags: JSON.stringify(courseData.tags),
        authorId: instructor.id,
        publishedAt: new Date(),
        modules: {
          create: courseData.modules.map(moduleData => ({
            title: moduleData.title,
            description: moduleData.description,
            order: moduleData.order,
            lessons: {
              create: moduleData.lessons.map(lessonData => ({
                title: lessonData.title,
                description: lessonData.description,
                type: lessonData.type,
                content: lessonData.content,
                order: lessonData.order,
                duration: lessonData.duration
              }))
            }
          }))
        }
      },
      include: {
        modules: {
          include: {
            lessons: true
          }
        }
      }
    })
    
    createdCourses.push(course)
    console.log(`Course created: ${course.title}`)
  }

  return createdCourses
}

async function createSampleEnrollments() {
  // Find student user
  const student = await prisma.user.findFirst({
    where: { role: Role.STUDENT }
  })
  
  if (!student) {
    console.log('No student found, skipping enrollment creation')
    return
  }

  // Find published courses
  const courses = await prisma.course.findMany({
    where: { status: CourseStatus.PUBLISHED },
    take: 2 // Enroll in first 2 courses
  })

  for (const course of courses) {
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: student.id,
          courseId: course.id
        }
      },
      update: {},
      create: {
        userId: student.id,
        courseId: course.id
      }
    })
    
    console.log(`Student enrolled in: ${course.title}`)
  }

  // Create some sample progress
  const firstCourse = courses[0]
  if (firstCourse) {
    const lessons = await prisma.lesson.findMany({
      where: {
        module: {
          courseId: firstCourse.id
        }
      },
      take: 2 // Complete first 2 lessons
    })

    for (const lesson of lessons) {
      await prisma.progress.upsert({
        where: {
          userId_lessonId: {
            userId: student.id,
            lessonId: lesson.id
          }
        },
        update: {},
        create: {
          userId: student.id,
          lessonId: lesson.id,
          completed: true,
          percentWatched: 100,
          lastPosition: lesson.duration || 0,
          completedAt: new Date()
        }
      })
    }
    
    console.log('Sample progress created')
  }
}

async function main() {
  console.log('Starting database seed...')

  try {
    // Create default permissions
    await createDefaultPermissions()

    // Create role-based permissions
    await createRolePermissions()

    // Create super user
    const superUser = await createSuperUser()

    // Create sample users
    await createSampleUsers()

    // Create sample courses
    await createSampleCourses()

    // Create sample enrollments and progress
    await createSampleEnrollments()

    console.log('Database seed completed successfully!')
    console.log('')
    console.log('=== LOGIN CREDENTIALS ===')
    console.log('Admin:')
    console.log('  Email: admin@theexitschool.com')
    console.log('  Password: password')
    console.log('')
    console.log('Instructor:')
    console.log('  Email: instructor@theexitschool.com')
    console.log('  Password: password123')
    console.log('')
    console.log('Student:')
    console.log('  Email: student@theexitschool.com')
    console.log('  Password: password123')
    console.log('')
    console.log('Note: Please change all passwords after first login')

  } catch (error) {
    console.error('Error during database seed:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })