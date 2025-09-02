export enum Role {
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT',
  GUEST = 'GUEST'
}

export interface User {
  id: string
  email: string
  name: string | null
  role: Role
  organizationId?: string | null
}

export interface Session {
  user: User
  expires: string
  accessToken: string
}

export interface SignInCredentials {
  email: string
  password?: string
  magicToken?: string
}

export interface AuthProvider {
  signIn(credentials: SignInCredentials): Promise<Session>
  signOut(session: Session): Promise<void>
  getSession(token: string): Promise<Session | null>
  getUserRoles(userId: string): Promise<Role[]>
  refreshToken(token: string): Promise<Session>
  handleSSOCallback?(params: any): Promise<Session>
  sendMagicLink?(email: string): Promise<void>
  verifyMagicToken?(token: string): Promise<Session>
}