import { Role, PermissionType, User } from '@prisma/client'

export interface PermissionCheck {
  userId: string
  role: Role
  permissions: PermissionType[]
  courseAccess?: { courseId: string; canView: boolean; canEdit: boolean }[]
  toolAccess?: { toolName: string; canAccess: boolean }[]
}

// Default role-based permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, PermissionType[]> = {
  ADMIN: [
    PermissionType.COURSE_CREATE,
    PermissionType.COURSE_EDIT,
    PermissionType.COURSE_DELETE,
    PermissionType.COURSE_VIEW,
    PermissionType.USER_CREATE,
    PermissionType.USER_EDIT,
    PermissionType.USER_DELETE,
    PermissionType.USER_VIEW,
    PermissionType.TOOL_ACCESS,
    PermissionType.TOOL_RESULTS_VIEW,
    PermissionType.ADMIN_PANEL_ACCESS,
    PermissionType.SYSTEM_SETTINGS,
  ],
  INSTRUCTOR: [
    PermissionType.COURSE_CREATE,
    PermissionType.COURSE_EDIT,
    PermissionType.COURSE_VIEW,
    PermissionType.USER_VIEW,
    PermissionType.TOOL_ACCESS,
    PermissionType.TOOL_RESULTS_VIEW,
  ],
  STUDENT: [
    PermissionType.COURSE_VIEW,
    PermissionType.TOOL_ACCESS,
  ],
  GUEST: [
    PermissionType.COURSE_VIEW,
  ],
}

export class PermissionManager {
  static hasPermission(
    userPermissions: PermissionCheck,
    requiredPermission: PermissionType
  ): boolean {
    // Check if user has the permission directly
    return userPermissions.permissions.includes(requiredPermission)
  }

  static hasRolePermission(role: Role, permission: PermissionType): boolean {
    return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) || false
  }

  static canAccessCourse(
    userPermissions: PermissionCheck,
    courseId: string,
    action: 'view' | 'edit' = 'view'
  ): boolean {
    // Admin can access everything
    if (userPermissions.role === Role.ADMIN) {
      return true
    }

    // Check course-specific permissions
    const courseAccess = userPermissions.courseAccess?.find(
      access => access.courseId === courseId
    )

    if (courseAccess) {
      return action === 'view' ? courseAccess.canView : courseAccess.canEdit
    }

    // Fall back to role-based permissions
    if (action === 'view') {
      return this.hasRolePermission(userPermissions.role, PermissionType.COURSE_VIEW)
    }

    return this.hasRolePermission(userPermissions.role, PermissionType.COURSE_EDIT)
  }

  static canAccessTool(
    userPermissions: PermissionCheck,
    toolName: string
  ): boolean {
    // Admin can access everything
    if (userPermissions.role === Role.ADMIN) {
      return true
    }

    // Check tool-specific permissions
    const toolAccess = userPermissions.toolAccess?.find(
      access => access.toolName === toolName
    )

    if (toolAccess) {
      return toolAccess.canAccess
    }

    // Fall back to role-based permissions
    return this.hasRolePermission(userPermissions.role, PermissionType.TOOL_ACCESS)
  }

  static canViewToolResults(userPermissions: PermissionCheck): boolean {
    return this.hasPermission(userPermissions, PermissionType.TOOL_RESULTS_VIEW)
  }

  static canManageUsers(userPermissions: PermissionCheck): boolean {
    return (
      this.hasPermission(userPermissions, PermissionType.USER_VIEW) &&
      (this.hasPermission(userPermissions, PermissionType.USER_EDIT) ||
        this.hasPermission(userPermissions, PermissionType.USER_CREATE) ||
        this.hasPermission(userPermissions, PermissionType.USER_DELETE))
    )
  }

  static canAccessAdminPanel(userPermissions: PermissionCheck): boolean {
    return this.hasPermission(userPermissions, PermissionType.ADMIN_PANEL_ACCESS)
  }

  static getUserPermissions(role: Role): PermissionType[] {
    return DEFAULT_ROLE_PERMISSIONS[role] || []
  }
}

// Route-based permission checks
export const ROUTE_PERMISSIONS: Record<string, PermissionType[]> = {
  '/admin': [PermissionType.ADMIN_PANEL_ACCESS],
  '/admin/users': [PermissionType.USER_VIEW, PermissionType.ADMIN_PANEL_ACCESS],
  '/admin/courses': [PermissionType.COURSE_VIEW, PermissionType.ADMIN_PANEL_ACCESS],
  '/admin/tools': [PermissionType.ADMIN_PANEL_ACCESS],
  '/instructor': [PermissionType.COURSE_CREATE, PermissionType.COURSE_EDIT],
  '/instructor/courses': [PermissionType.COURSE_CREATE, PermissionType.COURSE_EDIT],
  '/tools': [PermissionType.TOOL_ACCESS],
}

export function getRequiredPermissions(route: string): PermissionType[] {
  // Find the most specific route match
  const routes = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length)
  
  for (const routePattern of routes) {
    if (route.startsWith(routePattern)) {
      return ROUTE_PERMISSIONS[routePattern]
    }
  }
  
  return []
}