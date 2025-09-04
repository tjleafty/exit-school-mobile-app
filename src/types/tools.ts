export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'research' | 'financial' | 'marketing' | 'operations' | 'legal';
  icon: string;
  url: string;
  isPremium: boolean;
  isActive: boolean;
  requiredRole?: 'student' | 'instructor' | 'admin';
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserToolAccess {
  userId: string;
  toolId: string;
  hasAccess: boolean;
  grantedBy?: string;
  grantedAt?: Date;
  expiresAt?: Date;
}

export interface ToolUsageStats {
  toolId: string;
  userId: string;
  lastUsed: Date;
  totalUsageTime: number;
  usageCount: number;
}