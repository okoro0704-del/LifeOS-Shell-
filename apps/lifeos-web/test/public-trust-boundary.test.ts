import { describe, expect, it } from 'vitest';
import { canConsumePublicCapability, trustLevelForPath, trustStateFor } from '../src/lib/trustBoundary';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
describe('public trust boundary', () => {
  it('allows guest public consumption but not identity/step-up capability classes', () => {
    expect(trustStateFor()).toBe('GUEST');
    expect(trustStateFor('TD-ONE')).toBe('IDENTIFIED');
    expect(trustStateFor('TD-ONE', true)).toBe('STEP_UP_VERIFIED');
    expect(canConsumePublicCapability('PUBLIC')).toBe(true);
    expect(canConsumePublicCapability('IDENTITY_REQUIRED')).toBe(false);
    expect(canConsumePublicCapability('STEP_UP_REQUIRED')).toBe(false);
  });
  it('keeps public LifeOS paths open and reserves TrustID for identity and authority', () => {
    expect(trustLevelForPath('/app/personal/post')).toBe('PUBLIC');
    expect(trustLevelForPath('/app/personal/offline')).toBe('PUBLIC');
    expect(trustLevelForPath('/app/live')).toBe('PUBLIC');
    expect(trustLevelForPath('/app/discover')).toBe('PUBLIC');
    expect(trustLevelForPath('/app/profile')).toBe('IDENTITY_REQUIRED');
    expect(trustLevelForPath('/app/wallet')).toBe('AUTHORITY_REQUIRED');
    const welcome = readFileSync(join(root, 'src/pages/Welcome.tsx'), 'utf8');
    expect(welcome).toContain('PUBLIC_LIFEOS_ENTRY');
    expect(welcome).not.toContain('Navigate to="/login"');
    const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
    expect(app.indexOf('path="/app"')).toBeLessThan(app.indexOf('<Route element={<RequireAuth />}>'));
  });
  it('does not gate public Space entry on TrustID', () => {
    const src = readFileSync(join(root, 'src/components/NavigationDockGestures.tsx'), 'utf8');
    expect(src).toContain("owner: user?.trustId || 'guest'");
    expect(src).toContain("mode === 'PERSONAL' ? <button");
    expect(src).not.toContain("mode === 'PERSONAL' && user?.trustId ? <button");
  });
});
