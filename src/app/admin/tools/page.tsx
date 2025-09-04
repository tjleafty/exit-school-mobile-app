'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calculator, 
  ClipboardCheck, 
  TrendingUp, 
  FileText, 
  Layers, 
  FileSignature,
  Plus,
  Settings,
  Power,
  PowerOff,
  Edit,
  Trash2,
  Users,
  BarChart3,
  Search
} from 'lucide-react';
import { getAllTools, toggleToolStatus } from '@/lib/db/tools';
import { Tool } from '@/types/tools';

const iconMap: { [key: string]: any } = {
  Calculator,
  ClipboardCheck,
  TrendingUp,
  FileText,
  Layers,
  FileSignature
};

export default function AdminToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    const allTools = getAllTools();
    setTools(allTools);
  }, []);

  const handleToggleStatus = (toolId: string) => {
    toggleToolStatus(toolId);
    const updatedTools = getAllTools();
    setTools(updatedTools);
  };

  const categories = [
    { id: 'all', name: 'All Tools', count: tools.length },
    { id: 'financial', name: 'Financial', count: tools.filter(t => t.category === 'financial').length },
    { id: 'research', name: 'Research', count: tools.filter(t => t.category === 'research').length },
    { id: 'operations', name: 'Operations', count: tools.filter(t => t.category === 'operations').length },
    { id: 'legal', name: 'Legal', count: tools.filter(t => t.category === 'legal').length },
    { id: 'marketing', name: 'Marketing', count: tools.filter(t => t.category === 'marketing').length },
    { id: 'analysis', name: 'Analysis', count: tools.filter(t => t.category === 'analysis').length },
  ];

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tools Administration</h1>
          <p className="text-gray-600">
            Manage all business acquisition tools and control access across the platform
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Tool
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tools</CardDescription>
            <CardTitle className="text-2xl">{tools.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Tools</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {tools.filter(t => t.isActive).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive Tools</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {tools.filter(t => !t.isActive).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Premium Tools</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {tools.filter(t => t.isPremium).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Free Tools</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {tools.filter(t => !t.isPremium).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mb-6 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search tools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category.id)}
              className="flex items-center gap-2"
            >
              {category.name}
              <Badge variant="secondary" className="ml-1">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tools</CardTitle>
          <CardDescription>
            Manage tool status, access permissions, and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Tool</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Users</th>
                  <th className="text-left py-3 px-4">Last Updated</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTools.map((tool) => {
                  const Icon = iconMap[tool.icon] || Calculator;
                  return (
                    <tr key={tool.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-1 bg-gray-100 rounded">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{tool.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {tool.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{tool.category}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={tool.isPremium ? 'default' : 'secondary'}>
                          {tool.isPremium ? 'Premium' : 'Free'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={tool.isActive ? 'default' : 'destructive'}>
                            {tool.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStatus(tool.id)}
                            className="h-6 w-6 p-0"
                          >
                            {tool.isActive ? 
                              <PowerOff className="h-3 w-3" /> : 
                              <Power className="h-3 w-3" />
                            }
                          </Button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Users className="h-4 w-4 mr-1" />
                          245
                        </Button>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(tool.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {showCreateForm && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Add New Tool</CardTitle>
                <CardDescription>
                  Create a new business acquisition tool for students
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="toolName">Tool Name</Label>
                  <Input id="toolName" placeholder="Business Valuation Calculator" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select 
                    id="category" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="financial">Financial</option>
                    <option value="research">Research</option>
                    <option value="operations">Operations</option>
                    <option value="legal">Legal</option>
                    <option value="marketing">Marketing</option>
                    <option value="analysis">Analysis</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Describe what this tool does and how it helps students..."
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Tool URL</Label>
                  <Input id="url" placeholder="/tools/new-tool" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <select 
                    id="icon" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Calculator">Calculator</option>
                    <option value="ClipboardCheck">Clipboard Check</option>
                    <option value="TrendingUp">Trending Up</option>
                    <option value="FileText">File Text</option>
                    <option value="Layers">Layers</option>
                    <option value="FileSignature">File Signature</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  <span className="text-sm">Premium Tool</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked />
                  <span className="text-sm">Active by Default</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit">
                  Create Tool
                </Button>
                <Button type="button" variant="outline">
                  Save as Draft
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}