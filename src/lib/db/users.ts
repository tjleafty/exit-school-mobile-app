export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  joinedAt: Date;
  lastActive: Date;
  avatar?: string;
}

export const users: User[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@student.com',
    role: 'student',
    status: 'active',
    joinedAt: new Date('2024-01-15'),
    lastActive: new Date('2024-01-20'),
    avatar: '/avatars/john.jpg'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@student.com',
    role: 'student',
    status: 'active',
    joinedAt: new Date('2024-01-10'),
    lastActive: new Date('2024-01-19'),
    avatar: '/avatars/sarah.jpg'
  },
  {
    id: '3',
    name: 'Michael Brown',
    email: 'michael.brown@student.com',
    role: 'student',
    status: 'inactive',
    joinedAt: new Date('2024-01-05'),
    lastActive: new Date('2024-01-15'),
    avatar: '/avatars/michael.jpg'
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily.davis@instructor.com',
    role: 'instructor',
    status: 'active',
    joinedAt: new Date('2023-12-01'),
    lastActive: new Date('2024-01-20'),
    avatar: '/avatars/emily.jpg'
  },
  {
    id: '5',
    name: 'David Wilson',
    email: 'david.wilson@instructor.com',
    role: 'instructor',
    status: 'active',
    joinedAt: new Date('2023-11-15'),
    lastActive: new Date('2024-01-18'),
    avatar: '/avatars/david.jpg'
  },
  {
    id: '6',
    name: 'Lisa Anderson',
    email: 'lisa.anderson@student.com',
    role: 'student',
    status: 'active',
    joinedAt: new Date('2024-01-12'),
    lastActive: new Date('2024-01-20'),
    avatar: '/avatars/lisa.jpg'
  },
  {
    id: '7',
    name: 'Robert Taylor',
    email: 'robert.taylor@student.com',
    role: 'student',
    status: 'suspended',
    joinedAt: new Date('2024-01-08'),
    lastActive: new Date('2024-01-14'),
    avatar: '/avatars/robert.jpg'
  },
  {
    id: '8',
    name: 'Jennifer Martinez',
    email: 'jennifer.martinez@student.com',
    role: 'student',
    status: 'active',
    joinedAt: new Date('2024-01-18'),
    lastActive: new Date('2024-01-20'),
    avatar: '/avatars/jennifer.jpg'
  },
  {
    id: '9',
    name: 'Christopher Lee',
    email: 'christopher.lee@instructor.com',
    role: 'instructor',
    status: 'active',
    joinedAt: new Date('2023-10-20'),
    lastActive: new Date('2024-01-19'),
    avatar: '/avatars/christopher.jpg'
  },
  {
    id: '10',
    name: 'Amanda White',
    email: 'amanda.white@student.com',
    role: 'student',
    status: 'active',
    joinedAt: new Date('2024-01-16'),
    lastActive: new Date('2024-01-20'),
    avatar: '/avatars/amanda.jpg'
  }
];

export function getAllUsers(): User[] {
  return users;
}

export function getUsersByRole(role: 'student' | 'instructor' | 'admin'): User[] {
  return users.filter(user => user.role === role);
}

export function getUserById(id: string): User | undefined {
  return users.find(user => user.id === id);
}