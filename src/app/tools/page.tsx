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
  Lock,
  ExternalLink
} from 'lucide-react';
import { getToolsForUser } from '@/lib/db/tools';
import { Tool } from '@/types/tools';

const iconMap: { [key: string]: any } = {
  Calculator,
  ClipboardCheck,
  TrendingUp,
  FileText,
  Layers,
  FileSignature
};

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const userId = '1';
    const userTools = getToolsForUser(userId);
    setTools(userTools);
  }, []);

  const categories = [
    { id: 'all', name: 'All Tools', count: tools.length },
    { id: 'financial', name: 'Financial', count: tools.filter(t => t.category === 'financial').length },
    { id: 'research', name: 'Research', count: tools.filter(t => t.category === 'research').length },
    { id: 'operations', name: 'Operations', count: tools.filter(t => t.category === 'operations').length },
    { id: 'legal', name: 'Legal', count: tools.filter(t => t.category === 'legal').length },
  ];

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Business Acquisition Tools</h1>
        <p className="text-gray-600">
          Access powerful tools to help you analyze, evaluate, and execute business acquisitions
        </p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => {
          const Icon = iconMap[tool.icon] || Calculator;
          return (
            <Card key={tool.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">
                        {tool.category}
                      </Badge>
                    </div>
                  </div>
                  {tool.isPremium && (
                    <Badge variant="default" className="bg-yellow-500">
                      Premium
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {tool.description}
                </CardDescription>
                
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2">Features:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {tool.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button 
                  className="w-full"
                  onClick={() => window.location.href = tool.url}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Launch Tool
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No tools found matching your criteria.</p>
        </div>
      )}

      <Card className="mt-8 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle>Need Access to More Tools?</CardTitle>
          <CardDescription>
            Some tools require premium access or instructor approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline">
              <Lock className="h-4 w-4 mr-2" />
              Request Access
            </Button>
            <Button>
              Upgrade to Premium
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}