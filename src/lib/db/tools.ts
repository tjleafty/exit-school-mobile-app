import { Tool, UserToolAccess, ToolUsageStats } from '@/types/tools';

export const tools: Tool[] = [
  {
    id: '1',
    name: 'Business Valuation Calculator',
    description: 'Calculate the estimated value of a business using multiple valuation methods',
    category: 'financial',
    icon: 'Calculator',
    url: '/tools/valuation-calculator',
    isPremium: true,
    isActive: true,
    features: [
      'DCF Analysis',
      'Comparable Company Analysis',
      'Asset-based Valuation',
      'Export Reports'
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Due Diligence Checklist',
    description: 'Comprehensive checklist for business acquisition due diligence',
    category: 'operations',
    icon: 'ClipboardCheck',
    url: '/tools/due-diligence',
    isPremium: false,
    isActive: true,
    features: [
      'Customizable Templates',
      'Progress Tracking',
      'Team Collaboration',
      'Document Upload'
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '3',
    name: 'Market Research Tool',
    description: 'Analyze market trends and competitor landscape',
    category: 'research',
    icon: 'TrendingUp',
    url: '/tools/market-research',
    isPremium: true,
    isActive: true,
    features: [
      'Industry Reports',
      'Competitor Analysis',
      'Market Sizing',
      'Growth Projections'
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '4',
    name: 'Financial Statement Analyzer',
    description: 'Analyze and compare financial statements with industry benchmarks',
    category: 'financial',
    icon: 'FileText',
    url: '/tools/financial-analyzer',
    isPremium: true,
    isActive: true,
    features: [
      'Ratio Analysis',
      'Trend Analysis',
      'Peer Comparison',
      'Red Flag Detection'
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '5',
    name: 'Deal Structure Simulator',
    description: 'Model different deal structures and payment terms',
    category: 'financial',
    icon: 'Layers',
    url: '/tools/deal-simulator',
    isPremium: true,
    isActive: false,
    features: [
      'Earn-out Calculations',
      'Seller Financing Models',
      'Tax Impact Analysis',
      'ROI Projections'
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '6',
    name: 'Legal Document Templates',
    description: 'Access to standard acquisition legal documents and templates',
    category: 'legal',
    icon: 'FileSignature',
    url: '/tools/legal-templates',
    isPremium: false,
    isActive: true,
    features: [
      'LOI Templates',
      'NDA Templates',
      'Purchase Agreements',
      'Customizable Clauses'
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

export const userToolAccess: UserToolAccess[] = [
  {
    userId: '1',
    toolId: '1',
    hasAccess: true,
    grantedBy: 'admin',
    grantedAt: new Date('2024-01-01')
  },
  {
    userId: '1',
    toolId: '2',
    hasAccess: true,
    grantedBy: 'admin',
    grantedAt: new Date('2024-01-01')
  },
  {
    userId: '2',
    toolId: '2',
    hasAccess: true,
    grantedBy: 'admin',
    grantedAt: new Date('2024-01-01')
  }
];

export function getToolsForUser(userId: string): Tool[] {
  const userAccess = userToolAccess.filter(access => access.userId === userId && access.hasAccess);
  const accessibleToolIds = userAccess.map(access => access.toolId);
  
  // For demo purposes, show all active tools (both free and premium)
  // In production, uncomment the line below for proper access control
  return tools.filter(tool => tool.isActive);
  
  // Production access control (commented out for demo):
  // return tools.filter(tool => 
  //   tool.isActive && 
  //   (!tool.isPremium || accessibleToolIds.includes(tool.id))
  // );
}

export function getAllTools(): Tool[] {
  return tools;
}

export function getToolById(id: string): Tool | undefined {
  return tools.find(tool => tool.id === id);
}

export function updateToolAccess(userId: string, toolId: string, hasAccess: boolean, grantedBy: string): void {
  const existingAccess = userToolAccess.find(
    access => access.userId === userId && access.toolId === toolId
  );
  
  if (existingAccess) {
    existingAccess.hasAccess = hasAccess;
    existingAccess.grantedBy = grantedBy;
    existingAccess.grantedAt = new Date();
  } else {
    userToolAccess.push({
      userId,
      toolId,
      hasAccess,
      grantedBy,
      grantedAt: new Date()
    });
  }
}

export function toggleToolStatus(toolId: string): void {
  const tool = tools.find(t => t.id === toolId);
  if (tool) {
    tool.isActive = !tool.isActive;
    tool.updatedAt = new Date();
  }
}