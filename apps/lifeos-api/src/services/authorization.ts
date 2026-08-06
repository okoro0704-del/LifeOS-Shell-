/**
 * Authorization boundary — TrustID remains the identity/security system.
 * LifeOS only asks whether an action/payment may proceed.
 */
export type AuthorizationRequest = {
  userId: string;
  trustId: string;
  action: string;
  offeringId?: string;
  amount?: number;
  currency?: string;
};

export type AuthorizationResult = {
  authorized: boolean;
  requiresStepUp: boolean;
  token?: string;
  message: string;
};

export interface AuthorizationProvider {
  authorizeAction(req: AuthorizationRequest): Promise<AuthorizationResult>;
  authorizePayment(req: AuthorizationRequest): Promise<AuthorizationResult>;
  authorizeDevice(req: { userId: string; trustId: string }): Promise<AuthorizationResult>;
}

/** Dev mock — always allows with a session token; never implements TrustID. */
export class MockAuthorizationProvider implements AuthorizationProvider {
  async authorizeAction(req: AuthorizationRequest): Promise<AuthorizationResult> {
    if (!req.userId || !req.trustId) {
      return { authorized: false, requiresStepUp: true, message: "Sign in required." };
    }
    return {
      authorized: true,
      requiresStepUp: false,
      token: `auth_${req.action}_${Date.now()}`,
      message: "Authorized (mock).",
    };
  }

  async authorizePayment(req: AuthorizationRequest): Promise<AuthorizationResult> {
    return this.authorizeAction({ ...req, action: `pay:${req.action}` });
  }

  async authorizeDevice(req: { userId: string; trustId: string }): Promise<AuthorizationResult> {
    return {
      authorized: Boolean(req.userId && req.trustId),
      requiresStepUp: false,
      token: `device_${Date.now()}`,
      message: "Device trusted for this session (mock).",
    };
  }
}

let authz: AuthorizationProvider | null = null;

export function getAuthorizationProvider(): AuthorizationProvider {
  if (!authz) authz = new MockAuthorizationProvider();
  return authz;
}
