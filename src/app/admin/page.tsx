import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  DollarSign,
  Activity,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Wrench,
  Shield,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { PermissionType } from '@prisma/client'

// Mock data - replace with database fetch
const adminData = {
  stats: {
    totalUsers: 1247,
    activeCourses: 12,
    totalRevenue: 89420,
    monthlyGrowth: 23.5,
  },
  recentUsers: [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'STUDENT',
      joinDate: '2024-01-15',
      status: 'active',
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      role: 'INSTRUCTOR',
      joinDate: '2024-01-14',
      status: 'active',
    },
    {
      id: '3',
      name: 'Mike Wilson',
      email: 'mike@example.com',
      role: 'STUDENT',
      joinDate: '2024-01-13',
      status: 'inactive',
    },
  ],
  pendingCourses: [
    {
      id: '1',
      title: 'Advanced M&A Strategies',
      instructor: 'Dr. Emily Davis',
      status: 'PENDING_REVIEW',
      submittedDate: '2024-01-10',
    },
    {
      id: '2',
      title: 'International Acquisitions',
      instructor: 'Michael Chen',
      status: 'PENDING_REVIEW',
      submittedDate: '2024-01-08',
    },
  ],
  systemAlerts: [
    {
      id: '1',
      type: 'warning',
      message: 'High server load detected',
      timestamp: '5 minutes ago',
    },
    {
      id: '2',
      type: 'info',
      message: 'Database backup completed successfully',
      timestamp: '1 hour ago',
    },
    {
      id: '3',
      type: 'error',
      message: 'Payment processing issue resolved',
      timestamp: '2 hours ago',
    },
  ],
}

export default async function AdminDashboard() {
  // Get authentication debug info
  let debugInfo = null
  try {
    console.log('AdminDashboard: Starting session check...')
    const session = await SessionManager.getSession()
    console.log('AdminDashboard: Session result:', session ? 'found' : 'not found')
    
    if (session) {
      const canAccessAdmin = PermissionManager.canAccessAdminPanel(session.permissions)
      const hasUserView = PermissionManager.hasPermission(session.permissions, PermissionType.USER_VIEW)
      
      console.log('AdminDashboard: Permission checks:', { canAccessAdmin, hasUserView })
      
      debugInfo = {
        hasSession: true,
        user: {
          email: session.user.email,
          role: session.user.role,
          isActive: session.user.isActive,
          isSuperUser: session.user.isSuperUser
        },
        permissions: {
          total: session.permissions.permissions.length,
          list: session.permissions.permissions,
          canAccessAdmin,
          hasUserView,
          bothRequired: canAccessAdmin && hasUserView
        }
      }
    } else {
      console.log('AdminDashboard: No session found - checking cookies directly')
      // Try to get cookies directly for debugging
      try {
        const { cookies } = await import('next/headers')
        const cookieStore = cookies()
        const sessionToken = cookieStore.get('session-token')
        debugInfo = { 
          hasSession: false, 
          error: 'No session found',
          cookieDebug: {
            sessionTokenExists: !!sessionToken,
            sessionTokenLength: sessionToken?.value?.length || 0,
            allCookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
          }
        }
      } catch (cookieError) {
        debugInfo = { 
          hasSession: false, 
          error: 'No session found',
          cookieError: cookieError instanceof Error ? cookieError.message : 'Unknown cookie error'
        }
      }
    }
  } catch (error) {
    console.error('AdminDashboard: Error during authentication:', error)
    debugInfo = { 
      hasSession: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }
  }
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your platform and monitor system health
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users">
            <Button>Manage Users</Button>
          </Link>
          <Link href="/admin/courses">
            <Button variant="outline">Manage Courses</Button>
          </Link>
          <Link href="/admin/tools">
            <Button variant="outline">Manage Tools</Button>
          </Link>
        </div>
      </div>

      {/* Debug Info - Always show for troubleshooting */}
      {true && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              Authentication Debug Info
            </CardTitle>
            <CardDescription>
              Debug information for troubleshooting Manage Users issue | 
              DEBUG_AUTH: {process.env.DEBUG_AUTH || 'not set'} | 
              NODE_ENV: {process.env.NODE_ENV}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                {debugInfo?.hasSession ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-medium">
                  Session Status: {debugInfo?.hasSession ? 'Active' : 'None'}
                </span>
              </div>
              
              {debugInfo?.user && (
                <div className="ml-6 space-y-1 text-xs">
                  <p><strong>Email:</strong> {debugInfo.user.email}</p>
                  <p><strong>Role:</strong> {debugInfo.user.role}</p>
                  <p><strong>Active:</strong> {debugInfo.user.isActive ? 'Yes' : 'No'}</p>
                  <p><strong>Super User:</strong> {debugInfo.user.isSuperUser ? 'Yes' : 'No'}</p>
                </div>
              )}
              
              {debugInfo?.permissions && (
                <div className="space-y-2">
                  <p className="font-medium">Permissions ({debugInfo.permissions.total}):</p>
                  <div className="ml-6 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      {debugInfo.permissions.canAccessAdmin ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      <span>Admin Panel Access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {debugInfo.permissions.hasUserView ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      <span>User View Permission</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {debugInfo.permissions.bothRequired ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      <span>Can Access Manage Users</span>
                    </div>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer">All Permissions</summary>
                    <div className="mt-1 ml-4 space-y-1">
                      {debugInfo.permissions.list.map((perm, index) => (
                        <div key={index}>• {perm}</div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
              
              {debugInfo?.error && (
                <div className="text-red-600">
                  <p><strong>Error:</strong> {debugInfo.error}</p>
                  {debugInfo.cookieDebug && (
                    <div className="mt-2 text-xs">
                      <p><strong>Cookie Debug:</strong></p>
                      <div className="ml-4 space-y-1">
                        <p>Session Token Exists: {debugInfo.cookieDebug.sessionTokenExists ? 'Yes' : 'No'}</p>
                        <p>Token Length: {debugInfo.cookieDebug.sessionTokenLength}</p>
                        <p>All Cookies ({debugInfo.cookieDebug.allCookies.length}):</p>
                        <div className="ml-4">
                          {debugInfo.cookieDebug.allCookies.map((cookie, idx) => (
                            <div key={idx}>• {cookie.name}: {cookie.hasValue ? 'has value' : 'empty'}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {debugInfo.cookieError && (
                    <p className="mt-2 text-xs"><strong>Cookie Error:</strong> {debugInfo.cookieError}</p>
                  )}
                  {debugInfo.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer">Stack Trace</summary>
                      <pre className="text-xs mt-1 bg-red-100 p-2 rounded overflow-auto">
                        {debugInfo.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminData.stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminData.stats.activeCourses}</div>
            <p className="text-xs text-muted-foreground">
              2 pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${adminData.stats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +{adminData.stats.monthlyGrowth}% this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminData.stats.monthlyGrowth}%</div>
            <p className="text-xs text-muted-foreground">
              Monthly user growth
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Users */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Latest user registrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {adminData.recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <Badge 
                          variant={user.role === 'ADMIN' ? 'default' : 
                                  user.role === 'INSTRUCTOR' ? 'secondary' : 'outline'}
                        >
                          {user.role.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Joined {user.joinDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Course Approvals */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Course Approvals</CardTitle>
              <CardDescription>Courses awaiting review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {adminData.pendingCourses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{course.title}</p>
                      <p className="text-xs text-muted-foreground">
                        By {course.instructor} • Submitted {course.submittedDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Pending</Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Recent system notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {adminData.systemAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3">
                    <div className="mt-1">
                      {alert.type === 'warning' && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      {alert.type === 'info' && (
                        <Activity className="h-4 w-4 text-blue-500" />
                      )}
                      {alert.type === 'error' && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common admin tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/admin/users/new">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Add New User
                  </Button>
                </Link>
                <Link href="/admin/courses/new">
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Create Course
                  </Button>
                </Link>
                <Link href="/admin/settings">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </Link>
                <Link href="/admin/tools">
                  <Button variant="outline" className="w-full justify-start">
                    <Wrench className="h-4 w-4 mr-2" />
                    Manage Tools
                  </Button>
                </Link>
                <Link href="/admin/tools/access">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Tool Access Control
                  </Button>
                </Link>
                <Link href="/admin/audit-logs">
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="h-4 w-4 mr-2" />
                    Audit Logs
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}