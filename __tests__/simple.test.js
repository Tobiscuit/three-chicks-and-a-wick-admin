import { vi } from 'vitest';

// Simple test to verify testing setup works
describe('Testing Setup', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2);
  });

  it('can test async functions', async () => {
    const mockAsyncFunction = vi.fn().mockResolvedValue('success');
    
    const result = await mockAsyncFunction();
    
    expect(result).toBe('success');
    expect(mockAsyncFunction).toHaveBeenCalledTimes(1);
  });

  it('can test feature flag logic', () => {
    // Test the logic without importing the component
    const mockFeatureFlag = { value: true };
    
    expect(mockFeatureFlag.value).toBe(true);
    
    // Test toggle logic
    const newValue = !mockFeatureFlag.value;
    expect(newValue).toBe(false);
  });
});
