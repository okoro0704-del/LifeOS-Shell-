import { describe, expect, it } from 'vitest';
import { canConsumePublicCapability, trustStateFor } from '../src/lib/trustBoundary';
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
  it('does not gate public Space entry on TrustID', () => {
    const src = readFileSync(join(root, 'src/components/NavigationDockGestures.tsx'), 'utf8');
    expect(src).toContain("owner: user?.trustId || 'guest'");
    expect(src).toContain("mode === 'PERSONAL' ? <button");
    expect(src).not.toContain("mode === 'PERSONAL' && user?.trustId ? <button");
  });
});
