# Super User Setup Guide

This guide explains how to set up the super user account for the Exit School Mobile App.

## Super User Account Details

- **Email**: `admin@theexitschool.com`
- **Password**: `password`
- **Role**: Admin (cannot be changed)
- **Status**: Active (cannot be deleted or suspended)

## Database Setup

### Option 1: Using Prisma Migrations (Recommended)

1. Ensure your database is running and accessible
2. Apply the database migrations:
   ```bash
   npx prisma migrate dev
   ```

3. Run the seed script to create the super user and default permissions:
   ```bash
   npm run db:seed
   ```

### Option 2: Manual Database Setup

If you can't run the seed script, you'll need to manually insert the super user into your database:

1. **Apply schema changes**: First, make sure your database schema includes the new fields:
   - `User.password` (String, nullable)
   - `User.isSuperUser` (Boolean, default: false)

2. **Create permissions**: Insert the following permissions into the `Permission` table:
   ```sql
   INSERT INTO "Permission" (id, name, description) VALUES
   ('perm1', 'COURSE_CREATE', 'Create new courses'),
   ('perm2', 'COURSE_EDIT', 'Edit existing courses'),
   ('perm3', 'COURSE_DELETE', 'Delete courses'),
   ('perm4', 'COURSE_VIEW', 'View courses'),
   ('perm5', 'USER_CREATE', 'Create new users'),
   ('perm6', 'USER_EDIT', 'Edit user accounts'),
   ('perm7', 'USER_DELETE', 'Delete user accounts'),
   ('perm8', 'USER_VIEW', 'View user information'),
   ('perm9', 'TOOL_ACCESS', 'Access platform tools'),
   ('perm10', 'TOOL_RESULTS_VIEW', 'View tool usage results'),
   ('perm11', 'ADMIN_PANEL_ACCESS', 'Access administrative panel'),
   ('perm12', 'SYSTEM_SETTINGS', 'Modify system settings');
   ```

3. **Create super user**: Insert the super user into the `User` table:
   ```sql
   INSERT INTO "User" (
     id, 
     email, 
     name, 
     password, 
     role, 
     status, 
     "isSuperUser", 
     "isActive",
     "createdAt",
     "updatedAt"
   ) VALUES (
     'super_user_id',
     'admin@theexitschool.com',
     'Exit School Admin',
     '$2b$12$VFBWUuhVqhhV9UcjIxPpVuwfDCo6T813t/okgZ0W8GXHWigK.25PK',
     'ADMIN',
     'ACTIVE',
     true,
     true,
     NOW(),
     NOW()
   );
   ```

## Features

### Authentication System
- **Password-based login** at `/api/auth/login`
- **Session management** with secure cookies
- **Password hashing** using bcrypt with 12 salt rounds
- **Password strength validation** for new passwords

### Super User Protections
1. **Cannot be deleted**: API prevents deletion of super user accounts
2. **Cannot be suspended**: Admin interface hides suspension controls for super users
3. **Role protection**: Super user must remain an Admin
4. **Special indicator**: UI shows "Super User" badge

### Role-Based Permissions
- **Admin**: All permissions (12 total)
- **Instructor**: Course management + user viewing + tool access (6 permissions)
- **Student**: Course viewing + tool access (2 permissions)
- **Guest**: Course viewing only (1 permission)

## Login Process

1. Navigate to `/login`
2. Enter credentials:
   - Email: `admin@theexitschool.com`
   - Password: `password`
3. Upon successful login, you'll be redirected to the admin dashboard

## Changing the Super User Password

After initial login, it's recommended to change the password:

1. Log in as the super user
2. Navigate to user settings or profile
3. Use the password change functionality

Alternatively, you can use the AuthService programmatically:

```javascript
import { AuthService } from '@/lib/auth/auth-service'

// Change password for super user
await AuthService.changePassword(
  'super_user_id', 
  'password', 
  'new_secure_password'
)
```

## Security Considerations

1. **Change the default password** immediately after setup
2. **Use a strong password** with mixed case, numbers, and symbols
3. **Enable HTTPS** in production
4. **Monitor audit logs** for super user activities
5. **Regular password rotation** for enhanced security

## Troubleshooting

### Common Issues

1. **"User not found"**: Ensure the super user was created in the database
2. **"Invalid password"**: Check that the hashed password matches
3. **"Account is inactive"**: Ensure `isActive` is `true` and `status` is `'ACTIVE'`
4. **Permission errors**: Run the seed script to create default permissions

### Regenerating Password Hash

If you need to generate a new password hash:

```bash
node scripts/hash-password.js
```

This will output the hashed version of the password "password". Modify the script to hash different passwords as needed.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `DELETE /api/auth/login` - Logout

### User Management
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create new user
- `GET /api/admin/users/[id]` - Get user details
- `PATCH /api/admin/users/[id]` - Update user
- `DELETE /api/admin/users/[id]` - Delete user (blocked for super users)

### Permissions
- `GET /api/admin/users/[id]/permissions` - Get user permissions
- `POST /api/admin/users/[id]/permissions` - Grant permissions
- `DELETE /api/admin/users/[id]/permissions` - Revoke permissions

## Development Commands

- `npm run db:seed` - Create super user and default data
- `npm run db:reset` - Reset database and re-seed
- `npx prisma migrate dev` - Apply database migrations
- `npx prisma generate` - Regenerate Prisma client

## Production Deployment

1. Set strong environment variables
2. Apply database migrations
3. Run the seed script
4. Change the super user password
5. Enable HTTPS
6. Set up monitoring and logging

The super user account is now ready for use!