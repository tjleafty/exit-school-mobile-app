'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calculator, 
  ClipboardCheck, 
  TrendingUp, 
  FileText, 
  Layers, 
  FileSignature,
  Search,
  Users,
  Shield,
  UserCheck,
  UserX,
  Filter,
  Download,
  Mail
} from 'lucide-react';
import { getAllTools, userToolAccess, updateToolAccess } from '@/lib/db/tools';
import { getAllUsers } from '@/lib/db/users';
import { Tool } from '@/types/tools';
import { User } from '@/lib/db/users';

const iconMap: { [key: string]: any } = {
  Calculator,
  ClipboardCheck,
  TrendingUp,
  FileText,
  Layers,
  FileSignature
};

export default function ToolsAccessPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const allTools = getAllTools();
    const allUsers = getAllUsers();
    setTools(allTools);
    setUsers(allUsers);
    if (allTools.length > 0) {
      setSelectedTool(allTools[0]);
    }
  }, []);

  const handleToggleAccess = (userId: string, toolId: string, currentAccess: boolean) => {
    updateToolAccess(userId, toolId, !currentAccess, 'admin');
    triggerUpdate();
  };

  const [updateCounter, setUpdateCounter] = useState(0);
  const triggerUpdate = () => setUpdateCounter(prev => prev + 1);

  const getUserAccess = (userId: string, toolId: string): boolean => {
    const access = userToolAccess.find(
      acc => acc.userId === userId && acc.toolId === toolId
    );
    return access ? access.hasAccess : false;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getAccessSummary = (toolId: string) => {
    const totalUsers = users.length;
    const usersWithAccess = userToolAccess.filter(
      access => access.toolId === toolId && access.hasAccess
    ).length;
    return { total: totalUsers, withAccess: usersWithAccess };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tool Access Management</h1>
        <p className="text-gray-600">
          Manage individual user access to business acquisition tools
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Available Tools
            </CardTitle>
            <CardDescription>
              Select a tool to manage access permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tools.map((tool) => {
                const Icon = iconMap[tool.icon] || Calculator;
                const summary = getAccessSummary(tool.id);
                return (
                  <div
                    key={tool.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTool?.id === tool.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedTool(tool)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {tool.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {tool.category}
                          </Badge>
                          {tool.isPremium && (
                            <Badge variant="default" className="bg-yellow-500 text-xs">
                              Premium
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {summary.withAccess}/{summary.total} users have access
                        </div>
                      </div>
                      <Badge variant={tool.isActive ? 'default' : 'secondary'}>
                        {tool.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {selectedTool ? `${selectedTool.name} - User Access` : 'Select a Tool'}
                </CardTitle>
                <CardDescription>
                  Toggle access permissions for individual users
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Notify Users
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedTool ? (
              <div>
                <div className="mb-6 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">All Roles</option>
                      <option value="student">Students</option>
                      <option value="instructor">Instructors</option>
                      <option value="admin">Admins</option>
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Role</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Last Active</th>
                        <th className="text-left py-3 px-4">Access</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => {
                        const hasAccess = getUserAccess(user.id, selectedTool.id);
                        return (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium">
                                    {user.name.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{user.role}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={
                                user.status === 'active' ? 'default' :
                                user.status === 'inactive' ? 'secondary' : 'destructive'
                              }>
                                {user.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {new Date(user.lastActive).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={hasAccess ? 'default' : 'secondary'}>
                                {hasAccess ? (
                                  <>
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Granted
                                  </>
                                ) : (
                                  <>
                                    <UserX className="h-3 w-3 mr-1" />
                                    Denied
                                  </>
                                )}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                size="sm"
                                variant={hasAccess ? 'destructive' : 'default'}
                                onClick={() => handleToggleAccess(user.id, selectedTool.id, hasAccess)}
                                disabled={user.status === 'suspended'}
                              >
                                {hasAccess ? 'Revoke' : 'Grant'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No users found matching your criteria.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a tool from the left to manage user access</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}