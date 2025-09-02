# Exit School - Business Acquisitions Platform MVP Roadmap

## 1. Architecture Overview

### Component Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        CDN (Cloudflare)                          │
└─────────────────────────────────────────────────────────────────┘
                                 │
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js App (Vercel)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐         │
│  │  App Router │  │Server Actions│  │   Middleware   │         │
│  │   /app/*    │  │   /actions   │  │  Auth/RBAC     │         │
│  └─────────────┘  └──────────────┘  └────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   Postgres   │        │  Mux Video   │        │   S3/R2      │
│   (Neon.db)  │        │   Streaming  │        │   Storage    │
│              │        │              │        │              │
│ • Users      │        │ • Upload API │        │ • Documents  │
│ • Courses    │        │ • Webhooks   │        │ • Thumbnails │
│ • Progress   │        │ • Playback   │        │ • Assets     │
└──────────────┘        └──────────────┘        └──────────────┘
        │                        │                        │
┌─────────────────────────────────────────────────────────────────┐
│                    Analytics (PostHog)                           │
│                  Audit Logs (Database)                           │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architecture Decisions

| Decision | Choice | Trade-off |
|----------|--------|-----------|
| Rendering | ISR for catalog, SSR for admin | Speed vs freshness |
| Data Fetching | Server Actions primary, API routes for webhooks | Simplicity vs flexibility |
| Video | Mux (primary), Cloudflare Stream (backup) | Features vs cost |
| Database | Postgres with Prisma ORM | Type safety vs raw SQL performance |
| Auth | Adapter pattern with NextAuth base | Current simplicity vs future SSO |
| File Storage | S3-compatible (R2/Backblaze) | Cost vs AWS ecosystem |
| State | Server-first, minimal client state | SEO/performance vs interactivity |

## 2. Data Model & RBAC

### Entity Relationship Diagram
```
User ──────< Enrollment >────── Course
  │                                │
  │                                │
  └──< Progress                    └──< Module
  │                                      │
  └──< AuditLog                          └──< Lesson
  │                                           │
  └──< Role                                   ├──< VideoAsset
                                             │
                                             └──< ResourceFile
                                             │
                                             └──< ReleaseSchedule

Organization ──< User (optional cohort support)
```

### Prisma Schema Outline
```prisma
model User {
  id              String       @id @default(cuid())
  email           String       @unique
  name            String?
  role            Role         @default(STUDENT)
  organizationId  String?
  organization    Organization? @relation(fields: [organizationId])
  enrollments     Enrollment[]
  progress        Progress[]
  auditLogs       AuditLog[]
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model Role {
  ADMIN
  INSTRUCTOR
  STUDENT
  GUEST
}

model Course {
  id              String       @id @default(cuid())
  title           String
  description     String
  thumbnail       String?
  status          CourseStatus @default(DRAFT)
  authorId        String
  author          User         @relation(fields: [authorId])
  modules         Module[]
  enrollments     Enrollment[]
  tags            String[]
  createdAt       DateTime     @default(now())
  publishedAt     DateTime?
}

model Module {
  id              String       @id @default(cuid())
  courseId        String
  course          Course       @relation(fields: [courseId])
  title           String
  description     String?
  order           Int
  lessons         Lesson[]
}

model Lesson {
  id              String       @id @default(cuid())
  moduleId        String
  module          Module       @relation(fields: [moduleId])
  title           String
  type            LessonType   // VIDEO | ARTICLE
  content         Json?        // For articles
  order           Int
  duration        Int?         // seconds
  videoAsset      VideoAsset?
  resources       ResourceFile[]
  progress        Progress[]
  releaseSchedule ReleaseSchedule?
  version         Int          @default(1)
}

model VideoAsset {
  id              String       @id @default(cuid())
  lessonId        String       @unique
  lesson          Lesson       @relation(fields: [lessonId])
  muxAssetId      String?
  muxPlaybackId   String?
  status          VideoStatus  // UPLOADING | PROCESSING | READY | ERROR
  duration        Float?
  thumbnailUrl    String?
  captionsUrl     String?
}

model Progress {
  id              String       @id @default(cuid())
  userId          String
  user            User         @relation(fields: [userId])
  lessonId        String
  lesson          Lesson       @relation(fields: [lessonId])
  completed       Boolean      @default(false)
  percentWatched  Int          @default(0)
  lastPosition    Float        @default(0)
  updatedAt       DateTime     @updatedAt
  
  @@unique([userId, lessonId])
}
```

### RBAC Matrix

| Feature | Admin | Instructor | Student | Guest |
|---------|-------|------------|---------|-------|
| **Users** |
| View all users | ✓ | Own cohort | - | - |
| Create/edit users | ✓ | - | - | - |
| Assign roles | ✓ | - | - | - |
| **Courses** |
| View all courses | ✓ | ✓ | Enrolled | Public only |
| Create courses | ✓ | ✓ | - | - |
| Edit any course | ✓ | Own only | - | - |
| Delete courses | ✓ | - | - | - |
| Publish courses | ✓ | Own + approval | - | - |
| **Content** |
| Upload videos | ✓ | ✓ | - | - |
| View drafts | ✓ | Own only | - | - |
| Download resources | ✓ | ✓ | Enrolled | - |
| **Analytics** |
| View all analytics | ✓ | Own courses | Own progress | - |
| Export data | ✓ | Own courses | - | - |
| **Audit Logs** |
| View logs | ✓ | - | - | - |

## 3. Feature Breakdown with Acceptance Criteria

### Student Features

#### Browse Catalog
**User Story**: As a student, I want to browse available courses so I can find relevant training.

**Acceptance Criteria**:
```gherkin
Given I am logged in as a student
When I navigate to /courses
Then I should see all published courses
And I can filter by tags
And I can search by title/description
And I see enrollment status for each course
```

#### Video Playback
**User Story**: As a student, I want to watch lesson videos with resume capability.

**Acceptance Criteria**:
```gherkin
Given I am enrolled in a course
When I click on a video lesson
Then the video should load with Mux player
And my last position should be restored
And progress should save every 10 seconds
And I can use keyboard controls (space, arrows)
```

#### Download Resources
**User Story**: As a student, I want to download course materials.

**Acceptance Criteria**:
```gherkin
Given I am viewing an enrolled course lesson
When I click on a resource file
Then it should download with proper filename
And the download should be tracked in analytics
```

### Instructor Features

#### Course Creation
**User Story**: As an instructor, I want to create structured courses.

**Acceptance Criteria**:
```gherkin
Given I am logged in as an instructor
When I create a new course
Then I can add modules with drag-drop ordering
And I can add video/article lessons to modules
And I can save as draft before publishing
And I can schedule future release dates
```

#### Video Upload
**User Story**: As an instructor, I want to upload and manage video content.

**Acceptance Criteria**:
```gherkin
Given I am editing a lesson
When I upload a video file
Then it should show upload progress
And trigger Mux processing
And generate thumbnail automatically
And allow caption file upload
And notify when processing completes
```

### Admin Features

#### User Management
**User Story**: As an admin, I want to manage platform users.

**Acceptance Criteria**:
```gherkin
Given I am logged in as admin
When I access /admin/users
Then I can view all users with filters
And I can change user roles
And I can disable/enable accounts
And all changes are audit logged
```

## 4. Admin CMS Flow

### Content Publishing Pipeline
```
1. Upload Video
   ├─> Chunked upload to Mux
   ├─> Receive upload.asset_created webhook
   └─> Store muxAssetId in database

2. Process Video
   ├─> Mux transcodes video
   ├─> Generate multiple qualities
   ├─> Extract thumbnail
   └─> Receive video.asset.ready webhook

3. Add Metadata
   ├─> Title, description
   ├─> Upload captions (VTT)
   ├─> Attach resource files
   └─> Set module/lesson order

4. Review & Publish
   ├─> Preview in draft mode
   ├─> Set release schedule (optional)
   ├─> Publish immediately or scheduled
   └─> Trigger cache invalidation

5. Version Control
   ├─> Keep previous version accessible
   ├─> Track change history
   └─> Allow rollback within 30 days
```

### Mux Integration Details
```typescript
// Upload flow
1. Request upload URL from Mux
2. Direct upload from browser
3. Poll for asset status
4. Store playback_id when ready

// Webhook handlers
POST /api/webhooks/mux
- video.upload.asset_created
- video.asset.ready
- video.asset.errored

// Signed playback URLs
- 24-hour expiry
- User-specific tokens
- IP restriction optional
```

## 5. Security & Auth Adapter

### AuthProvider Interface
```typescript
interface AuthProvider {
  signIn(credentials: SignInCredentials): Promise<Session>
  signOut(session: Session): Promise<void>
  getSession(token: string): Promise<Session | null>
  getUserRoles(userId: string): Promise<Role[]>
  refreshToken(token: string): Promise<Session>
  handleSSOCallback?(params: any): Promise<Session>
}

interface Session {
  user: {
    id: string
    email: string
    name: string
    role: Role
    organizationId?: string
  }
  expires: string
  accessToken: string
}

// Implementation for MVP (email magic links)
class EmailAuthProvider implements AuthProvider {
  // Passwordless email authentication
  // Ready to swap for SAML/OIDC later
}
```

### Security Checklist
- [x] Session cookies: httpOnly, secure, sameSite=lax
- [x] CSRF protection via double-submit cookies
- [x] Rate limiting: 10 requests/minute for auth endpoints
- [x] Audit logging: all auth events, role changes, content modifications
- [x] Content Security Policy headers
- [x] SQL injection prevention via Prisma parameterized queries
- [x] XSS prevention via React auto-escaping
- [x] File upload validation: type, size, virus scan
- [x] Signed URLs for private content
- [x] Role-based middleware on all routes

## 6. API/Routes & UI Map

### Route Structure
```
/                           - Landing page
/courses                    - Course catalog
/courses/[id]              - Course detail
/courses/[id]/modules/[moduleId]/lessons/[lessonId] - Lesson view
/dashboard                 - Student dashboard
/my-courses                - Enrolled courses
/profile                   - User profile

/instructor                - Instructor dashboard
/instructor/courses        - Manage courses
/instructor/courses/[id]/edit - Course editor
/instructor/analytics      - Course analytics

/admin                     - Admin dashboard
/admin/users              - User management
/admin/courses            - All courses oversight
/admin/settings           - Platform settings
/admin/audit-logs         - Security audit trail

/api/webhooks/mux         - Mux webhooks
/api/auth/*               - Auth endpoints
/api/upload/presigned     - Get S3 presigned URLs
```

### Server Actions vs API Routes

| Use Server Actions For | Use API Routes For |
|------------------------|-------------------|
| Form submissions | Webhook endpoints |
| Data mutations | File uploads |
| Real-time validation | Third-party integrations |
| Direct DB operations | Public API (future) |

### Sample Zod Schemas
```typescript
// Course creation
const CreateCourseSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  modules: z.array(z.object({
    title: z.string(),
    order: z.number(),
    lessons: z.array(z.object({
      title: z.string(),
      type: z.enum(['VIDEO', 'ARTICLE']),
      content: z.string().optional(),
    }))
  }))
})

// Video upload
const VideoUploadSchema = z.object({
  lessonId: z.string().cuid(),
  muxUploadId: z.string(),
  duration: z.number().positive(),
})
```

## 7. Video & Assets Pipeline

### Technical Specifications
| Aspect | Specification |
|--------|--------------|
| Max upload size | 5GB per video |
| Supported formats | MP4, MOV, AVI, WebM |
| Chunking | 10MB chunks |
| Processing queue | Bull/BullMQ with Redis |
| Thumbnail generation | Auto at 10% duration |
| Captions | VTT format, multi-language |
| Playback quality | Adaptive (360p to 1080p) |
| CDN | Cloudflare with 24hr cache |
| Mobile optimization | HLS streaming |

### Accessibility Checklist
- [x] Closed captions for all videos
- [x] Transcript availability
- [x] Keyboard navigation (J/K/L, Space, arrows)
- [x] High contrast mode support
- [x] Screen reader announcements
- [x] Focus indicators
- [x] ARIA labels on controls
- [x] Playback speed controls (0.5x - 2x)

## 8. DevEx, CI/CD, and Environments

### Local Development Setup
```bash
# Initial setup script
npm install
cp .env.example .env.local
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

### Environment Variables
```env
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_WEBHOOK_SECRET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=
S3_REGION=
POSTHOG_KEY=
```

### CI/CD Pipeline
```yaml
# .github/workflows/main.yml
- Typecheck (tsc --noEmit)
- Lint (ESLint + Prettier)
- Unit tests (Vitest)
- Build verification
- E2E smoke tests (Playwright)
- Deploy preview (Vercel)
- Production deploy (on main merge)
```

### Release Checklist
- [ ] All tests passing
- [ ] Database migrations reviewed
- [ ] Environment variables updated
- [ ] Feature flags configured
- [ ] Monitoring alerts set
- [ ] Rollback plan documented
- [ ] Changelog updated

## 9. Analytics & Telemetry

### Event Model
```typescript
interface AnalyticsEvent {
  event: string
  userId: string
  properties: Record<string, any>
  timestamp: Date
}

// Core events for MVP
events = {
  // Student events
  'course_viewed': { courseId, source },
  'lesson_started': { lessonId, courseId, moduleId },
  'video_progress': { lessonId, percent: 25|50|75|95 },
  'resource_downloaded': { resourceId, lessonId },
  'course_enrolled': { courseId, method },
  
  // Instructor events
  'course_created': { courseId },
  'lesson_published': { lessonId, courseId },
  'video_uploaded': { size, duration },
  
  // Admin events
  'user_role_changed': { userId, oldRole, newRole },
  'course_approved': { courseId, instructorId },
}
```

## 10. Testing Plan

### Test Coverage Strategy
| Type | Coverage | Tools | Focus |
|------|----------|-------|-------|
| Unit | 80% | Vitest | Business logic, utils |
| Integration | 60% | Vitest + MSW | API, database |
| E2E | Critical paths | Playwright | User journeys |

### Critical E2E Test Scenarios
1. Student enrollment and video playback
2. Instructor course creation and publish
3. Admin user management flow
4. Video upload and processing
5. Progress tracking accuracy

### Test Data Seeding
```typescript
// seed.ts
const seedData = {
  users: [
    { email: 'admin@exitschool.com', role: 'ADMIN' },
    { email: 'instructor@exitschool.com', role: 'INSTRUCTOR' },
    { email: 'student@exitschool.com', role: 'STUDENT' },
  ],
  courses: [
    {
      title: 'Business Acquisitions 101',
      modules: [
        { title: 'Finding Opportunities', lessons: 3 },
        { title: 'Due Diligence', lessons: 5 },
        { title: 'Closing Deals', lessons: 4 },
      ]
    }
  ]
}
```

## 11. Milestones & Timeline

### Sprint 1: Foundations (Week 1-2)
**Goal**: Core infrastructure and basic viewing

**Deliverables**:
- [x] Database schema and Prisma setup
- [x] Auth adapter with email magic links
- [x] Course catalog read path
- [x] Basic video playback (single test video)
- [x] Student dashboard shell
- [x] Responsive layout

**Acceptance Criteria**:
- Can log in via email link
- Can view course catalog
- Can play a test video
- Mobile responsive

**Demo**: Login → Browse catalog → Play video

### Sprint 2: Authoring & Admin (Week 3-4)
**Goal**: Content management system

**Deliverables**:
- [ ] Admin dashboard
- [ ] Course CRUD operations
- [ ] Video upload pipeline with Mux
- [ ] Module/lesson management
- [ ] Draft/publish workflow
- [ ] Resource file uploads

**Acceptance Criteria**:
- Instructors can create courses
- Videos process successfully
- Can publish/unpublish content
- Drag-drop ordering works

**Demo**: Create course → Upload video → Publish → View as student

### Sprint 3: Polish & Demo (Week 5-6)
**Goal**: Production readiness

**Deliverables**:
- [ ] Progress tracking
- [ ] Search functionality
- [ ] Audit logging
- [ ] Analytics integration
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Demo data and script

**Acceptance Criteria**:
- Progress saves and resumes
- Search returns relevant results
- Meets WCAG 2.1 AA standards
- Loads under 3s on 3G

**Demo**: Full walkthrough with progress tracking

## 12. Demo Script & Sample Content

### 15-Minute Demo Walkthrough

**Act 1: Student Experience (5 min)**
1. Land on homepage - show professional design
2. Browse course catalog - filter by category
3. View "Business Acquisitions 101" details
4. Enroll with code "DEMO2024"
5. Start Module 1, Lesson 1 video
6. Skip to 50% to show progress tracking
7. Download supplementary PDF
8. Return to dashboard - show progress

**Act 2: Instructor Tools (5 min)**
1. Switch to instructor account
2. Show instructor dashboard with analytics
3. Create new lesson in existing course
4. Upload video file - show progress bar
5. Add downloadable worksheet
6. Preview in draft mode
7. Publish with immediate effect
8. Show version history

**Act 3: Admin Control (5 min)**
1. Switch to admin account
2. Review user list with filters
3. Promote user to instructor role
4. View audit log of changes
5. Check course approval queue
6. Review platform analytics
7. Demonstrate cohort assignment

### Sample Seed Content

**Course: Business Acquisitions 101**
```
Module 1: Finding Opportunities
├── Lesson 1: Market Research Fundamentals (Video: 12 min)
├── Lesson 2: Identifying Target Companies (Video: 18 min)
└── Lesson 3: Initial Outreach Strategies (Article + Template)

Module 2: Due Diligence Process
├── Lesson 1: Financial Analysis (Video: 25 min)
├── Lesson 2: Legal Considerations (Video: 20 min)
├── Lesson 3: Operational Assessment (Video: 15 min)
├── Lesson 4: Risk Evaluation (Article + Checklist)
└── Lesson 5: Valuation Methods (Video: 30 min)

Module 3: Deal Structuring
├── Lesson 1: Negotiation Tactics (Video: 22 min)
├── Lesson 2: Financing Options (Video: 28 min)
├── Lesson 3: Legal Documentation (Article + Examples)
└── Lesson 4: Closing Process (Video: 15 min)
```

## 13. Risks, Assumptions, and Cut/Defer List

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mux processing delays | High | Implement Cloudflare Stream fallback |
| SSO integration unknown | Medium | Auth adapter pattern for easy swap |
| Video storage costs | Medium | Implement retention policies |
| Mobile video playback | High | Use HLS adaptive streaming |
| GDPR compliance | High | Build data export/deletion from start |

### Assumptions
1. Max 1000 concurrent users for MVP
2. Average video length 20 minutes
3. 100GB monthly bandwidth allowance
4. English-only for MVP
5. Desktop-first, mobile-optimized

### Deferred Features (Post-MVP)
- Discussion forums
- Live streaming capabilities
- Advanced quiz/assessment engine
- Gamification (badges, leaderboards)
- Native mobile apps
- Multi-language support
- Advanced analytics dashboards
- AI-powered content recommendations
- Bulk import/export tools
- API for third-party integrations

## 14. Open Questions for Stakeholders

1. **Authentication**: Which SSO provider(s) must we support? (SAML, OIDC, specific vendors?)

2. **Compliance**: Are there specific compliance requirements? (FERPA, GDPR, SOC2?)

3. **Scale**: Expected user count at launch? Peak concurrent users?

4. **Content**: Will you provide videos or should we use placeholders? Format requirements?

5. **Integrations**: Any existing LMS/CRM systems to integrate with?

6. **Analytics**: Specific KPIs to track beyond basic engagement?

7. **Accessibility**: Any requirements beyond WCAG 2.1 AA?

8. **Localization**: Future language requirements?

9. **Pricing**: Will there be paid tiers? Payment processing needed?

10. **Support**: How will user support be handled? In-app chat needed?

---

## Quick Start Commands

```bash
# Development
npm run dev              # Start development server
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed demo data

# Testing
npm run test            # Run unit tests
npm run test:e2e        # Run E2E tests
npm run test:coverage   # Generate coverage report

# Production
npm run build           # Build for production
npm run start           # Start production server
npm run db:migrate      # Run migrations
```

## Success Metrics for MVP Demo

- [ ] 5-second initial load time
- [ ] Zero critical accessibility issues
- [ ] 100% of critical user paths tested
- [ ] Video playback works on all major browsers
- [ ] Admin can complete all CRUD operations
- [ ] Progress tracking accuracy >95%
- [ ] Demo completes in under 15 minutes
- [ ] Stakeholders can self-navigate post-demo

---

*This roadmap is a living document. Update based on stakeholder feedback and technical discoveries during implementation.*