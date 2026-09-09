export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

let currentUser: CurrentUser | null = null;
let accessToken: string | null = null;

export function setAccessToken(providedAccessToken: string): void {
  accessToken = providedAccessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getCurrentUser(): CurrentUser | null {
  return currentUser;
}

export function setCurrentUser(user: CurrentUser): void {
  currentUser = user;
}

export function clearCurrentUser(): void {
  currentUser = null;
}
