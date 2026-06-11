export interface Equation {
  id: string;
  expression: string;
  color: string;
  visible: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  equations: Equation[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
}
