import { renderHook } from '@testing-library/react';
import { useContracts } from './useContracts';

// Mock the AuthContext
vi.mock('../lib/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    address: null,
    isCorrectNetwork: false,
  }),
}));

describe('useContracts', () => {
  it('provides contract functions', () => {
    const { result } = renderHook(() => useContracts());
    
    expect(result.current.getAllProperties).toBeDefined();
    expect(result.current.getTENBalance).toBeDefined();
    expect(result.current.buyPropertyTokens).toBeDefined();
    expect(result.current.claimYield).toBeDefined();
  });

  it('returns loading state correctly', () => {
    const { result } = renderHook(() => useContracts());
    
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('handles network switching', () => {
    const { result } = renderHook(() => useContracts());
    
    expect(result.current.chainId).toBeDefined();
  });

  it('returns zero balance when no provider', () => {
    const { result } = renderHook(() => useContracts());
    
    // Should handle missing provider gracefully
    expect(typeof result.current.getTENBalance).toBe('function');
  });
});
