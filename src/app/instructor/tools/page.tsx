'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calculator, 
  ClipboardCheck, 
  TrendingUp, 
  FileText, 
  Layers, 
  FileSignature,
  Users,
  BarChart3,
  Settings,
  ExternalLink,
  Eye
} from 'lucide-react';
import { getAllTools } from '@/lib/db/tools';
import { Tool } from '@/types/tools';

const iconMap: { [key: string]: any } = {
  Calculator,
  ClipboardCheck,
  TrendingUp,
  FileText,
  Layers,
  FileSignature
};

interface ToolStats {
  totalUsers: number;
  activeUsers: number;
  avgUsageTime: string;
  lastAccessed: string;
}

export default function InstructorToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  useEffect(() => {
    const allTools = getAllTools();
    setTools(allTools);
  }, []);

  const mockStats: { [key: string]: ToolStats } = {
    '1': { totalUsers: 145, activeUsers: 89, avgUsageTime: '23 min', lastAccessed: '2 hours ago' },
    '2': { totalUsers: 234, activeUsers: 156, avgUsageTime: '45 min', lastAccessed: '30 min ago' },
    '3': { totalUsers: 98, activeUsers: 45, avgUsageTime: '15 min', lastAccessed: '1 day ago' },
    '4': { totalUsers: 167, activeUsers: 102, avgUsageTime: '38 min', lastAccessed: '5 hours ago' },
    '5': { totalUsers: 0, activeUsers: 0, avgUsageTime: 'N/A', lastAccessed: 'Never' },
    '6': { totalUsers: 289, activeUsers: 201, avgUsageTime: '12 min', lastAccessed: '1 hour ago' },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tools Management</h1>
        <p className="text-gray-600">
          Monitor tool usage and manage student access to business acquisition tools
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tools</CardDescription>
            <CardTitle className="text-2xl">{tools.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Tools</CardDescription>
            <CardTitle className="text-2xl">
              {tools.filter(t => t.isActive).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Premium Tools</CardDescription>
            <CardTitle className="text-2xl">
              {tools.filter(t => t.isPremium).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Active Users</CardDescription>
            <CardTitle className="text-2xl">547</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tool Usage Overview</CardTitle>
          <CardDescription>
            Click on any tool to view detailed statistics and manage access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Tool</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Total Users</th>
                  <th className="text-left py-3 px-4">Active Users</th>
                  <th className="text-left py-3 px-4">Avg. Usage</th>
                  <th className="text-left py-3 px-4">Last Accessed</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => {
                  const Icon = iconMap[tool.icon] || Calculator;
                  const stats = mockStats[tool.id];
                  return (
                    <tr key={tool.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{tool.name}</span>
                          {tool.isPremium && (
                            <Badge variant="default" className="bg-yellow-500 text-xs">
                              Premium
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{tool.category}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={tool.isActive ? 'default' : 'secondary'}>
                          {tool.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{stats.totalUsers}</td>
                      <td className="py-3 px-4">{stats.activeUsers}</td>
                      <td className="py-3 px-4">{stats.avgUsageTime}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {stats.lastAccessed}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedTool(tool)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedTool && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedTool.name} - Detailed View</CardTitle>
                <CardDescription>{selectedTool.description}</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedTool(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Features</h3>
                <ul className="space-y-2">
                  {selectedTool.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Usage Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Weekly Growth</span>
                    <span className="font-medium text-green-600">+12%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Student Satisfaction</span>
                    <span className="font-medium">4.7/5.0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Support Tickets</span>
                    <span className="font-medium">3 open</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-3">Student Feedback</h3>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    "This tool has been incredibly helpful for understanding valuation methods."
                  </p>
                  <p className="text-xs text-gray-400 mt-1">- Student, 2 days ago</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    "Would love to see more export options for the reports."
                  </p>
                  <p className="text-xs text-gray-400 mt-1">- Student, 1 week ago</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Configure Tool
              </Button>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Manage Access
              </Button>
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Full Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}