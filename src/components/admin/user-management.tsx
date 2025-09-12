'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Users, 
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Calendar,
  Shield,
  Ban,
  Edit,
  Trash,
  Settings,
  Eye,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { Role, UserStatus, PermissionType } from '@prisma/client'

interface UserWithPermissions {
  id: string
  name: string | null
  email: string
  role: Role
  status: UserStatus
  isActive: boolean
  isSuperUser: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
  organizationId: string | null
  _count: {
    enrollments: number
    courses: number
    permissions: number
  }
  permissions: {
    permission: {
      name: PermissionType
      description: string | null
    }
    granted: boolean
    expiresAt: Date | null
  }[]
  courseAccess: {
    courseId: string
    canView: boolean
    canEdit: boolean
    course: {
      title: string
    }
  }[]
  toolAccess: {
    toolName: string
    canAccess: boolean
    expiresAt: Date | null
  }[]
}

interface UserManagementProps {
  users: UserWithPermissions[]
}

export default function UserManagement({ users: initialUsers }: UserManagementProps) {
  const [users, setUsers] = useState<UserWithPermissions[]>(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL')
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === UserStatus.ACTIVE).length,
    admins: users.filter(u => u.role === Role.ADMIN).length,
    instructors: users.filter(u => u.role === Role.INSTRUCTOR).length,
    students: users.filter(u => u.role === Role.STUDENT).length,
    newThisWeek: users.filter(u => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(u.createdAt) > weekAgo
    }).length
  }

  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.ADMIN: return 'bg-red-100 text-red-800'
      case Role.INSTRUCTOR: return 'bg-blue-100 text-blue-800'
      case Role.STUDENT: return 'bg-green-100 text-green-800'
      case Role.GUEST: return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE: return <CheckCircle className="h-4 w-4 text-green-500" />
      case UserStatus.INACTIVE: return <XCircle className="h-4 w-4 text-gray-500" />
      case UserStatus.SUSPENDED: return <Ban className="h-4 w-4 text-red-500" />
      case UserStatus.PENDING: return <Clock className="h-4 w-4 text-yellow-500" />
      default: return <XCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const updateUserStatus = async (userId: string, newStatus: UserStatus) => {
    // This would be an API call in a real application
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ))
  }

  const updateUserRole = async (userId: string, newRole: Role) => {
    // This would be an API call in a real application
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, role: newRole } : user
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage platform users, roles, and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateUser(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.active} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">Full access</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Instructors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.instructors}</div>
            <p className="text-xs text-muted-foreground">Content creators</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.students}</div>
            <p className="text-xs text-muted-foreground">Learners</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newThisWeek}</div>
            <p className="text-xs text-muted-foreground">Recent signups</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as Role | 'ALL')}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="GUEST">Guest</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as UserStatus | 'ALL')}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 hover:bg-muted/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{user.name || 'Unnamed User'}</h3>
                        <Badge className={getRoleColor(user.role)}>
                          {user.role.toLowerCase()}
                        </Badge>
                        {user.isSuperUser && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            Super User
                          </Badge>
                        )}
                        {getStatusIcon(user.status)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{user.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                          Last login: {user.lastLoginAt 
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : 'Never'
                          }
                        </div>
                        <div>
                          {user.role === Role.INSTRUCTOR 
                            ? `${user._count.courses} courses created`
                            : `${user._count.enrollments} enrollments`
                          }
                        </div>
                        <div>
                          {user._count.permissions} custom permissions
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(user)
                        setShowPermissions(true)
                      }}
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!user.isSuperUser && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className={user.status === UserStatus.SUSPENDED ? "text-green-600" : "text-red-600"}
                        onClick={() => updateUserStatus(
                          user.id, 
                          user.status === UserStatus.SUSPENDED ? UserStatus.ACTIVE : UserStatus.SUSPENDED
                        )}
                      >
                        {user.status === UserStatus.SUSPENDED ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
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

      {/* Create User Dialog */}
      <CreateUserDialog 
        open={showCreateUser} 
        onOpenChange={setShowCreateUser}
        onUserCreated={(newUser) => {
          setUsers(prev => [...prev, newUser])
          setShowCreateUser(false)
        }}
      />

      {/* Permissions Dialog */}
      <PermissionsDialog
        user={selectedUser}
        open={showPermissions}
        onOpenChange={setShowPermissions}
        onPermissionsUpdated={(updatedUser) => {
          setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))
        }}
      />
    </div>
  )
}

// Placeholder components - these would be implemented separately
function CreateUserDialog({ open, onOpenChange, onUserCreated }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserCreated: (user: UserWithPermissions) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Add a new user to the platform</DialogDescription>
        </DialogHeader>
        {/* Form implementation would go here */}
        <div className="text-center py-8 text-muted-foreground">
          User creation form will be implemented here
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PermissionsDialog({ user, open, onOpenChange, onPermissionsUpdated }: {
  user: UserWithPermissions | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPermissionsUpdated: (user: UserWithPermissions) => void
}) {
  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Permissions: {user.name}</DialogTitle>
          <DialogDescription>
            Configure user permissions and access controls
          </DialogDescription>
        </DialogHeader>
        {/* Permissions management UI would go here */}
        <div className="text-center py-8 text-muted-foreground">
          Permission management interface will be implemented here
        </div>
      </DialogContent>
    </Dialog>
  )
}