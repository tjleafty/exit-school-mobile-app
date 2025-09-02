import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Calendar,
  Shield,
  Ban
} from 'lucide-react'

// Mock data for user management
const adminUsers = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@exitschool.com',
    role: 'INSTRUCTOR',
    status: 'active',
    joinDate: '2024-01-15',
    lastLogin: '2 hours ago',
    coursesCreated: 2,
    studentsReached: 1801,
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@exitschool.com',
    role: 'INSTRUCTOR',
    status: 'active',
    joinDate: '2024-01-10',
    lastLogin: '1 day ago',
    coursesCreated: 1,
    studentsReached: 567,
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'mchen@example.com',
    role: 'STUDENT',
    status: 'active',
    joinDate: '2024-01-20',
    lastLogin: '3 hours ago',
    coursesEnrolled: 3,
    completionRate: 85,
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily.davis@exitschool.com',
    role: 'INSTRUCTOR',
    status: 'pending',
    joinDate: '2024-01-22',
    lastLogin: 'Never',
    coursesCreated: 0,
    studentsReached: 0,
  },
  {
    id: '5',
    name: 'Robert Wilson',
    email: 'rwilson@example.com',
    role: 'STUDENT',
    status: 'active',
    joinDate: '2024-01-18',
    lastLogin: '5 minutes ago',
    coursesEnrolled: 2,
    completionRate: 92,
  },
  {
    id: '6',
    name: 'Lisa Anderson',
    email: 'lisa.a@example.com',
    role: 'STUDENT',
    status: 'inactive',
    joinDate: '2024-01-05',
    lastLogin: '2 weeks ago',
    coursesEnrolled: 1,
    completionRate: 23,
  },
]

export default function AdminUsersPage() {
  const totalUsers = adminUsers.length
  const activeUsers = adminUsers.filter(u => u.status === 'active').length
  const instructors = adminUsers.filter(u => u.role === 'INSTRUCTOR').length
  const students = adminUsers.filter(u => u.role === 'STUDENT').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage platform users and their roles
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">{activeUsers} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Instructors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instructors}</div>
            <p className="text-xs text-muted-foreground">Content creators</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students}</div>
            <p className="text-xs text-muted-foreground">Active learners</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Recent signups</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            All Roles
          </Button>
          <Button variant="outline" size="sm">
            All Status
          </Button>
        </div>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Users</CardTitle>
          <CardDescription>
            All registered users and their account details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {adminUsers.map((user) => (
              <div key={user.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{user.name}</h3>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          user.role === 'ADMIN' ? 'default' : 
                          user.role === 'INSTRUCTOR' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {user.role.toLowerCase()}
                      </Badge>
                      <Badge 
                        variant={user.status === 'active' ? 'default' : 'secondary'}
                      >
                        {user.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground ml-13">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Joined {user.joinDate}</span>
                      </div>
                      <div>Last login: {user.lastLogin}</div>
                      {user.role === 'INSTRUCTOR' ? (
                        <div>{user.coursesCreated} courses • {user.studentsReached?.toLocaleString()} students</div>
                      ) : (
                        <div>{user.coursesEnrolled} courses • {user.completionRate}% completion</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Shield className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Mail className="h-4 w-4" />
                    </Button>
                    {user.status === 'active' && (
                      <Button size="sm" variant="outline" className="text-red-600">
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}