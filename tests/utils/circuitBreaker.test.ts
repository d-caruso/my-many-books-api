// ================================================================
// tests/utils/circuitBreaker.test.ts
// ================================================================

import { CircuitBreaker, CircuitBreakerState } from '@/utils/circuitBreaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let mockOperation: jest.Mock;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      monitoringPeriod: 500,
    });
    mockOperation = jest.fn();
  });

  describe('CLOSED state', () => {
    it('should execute operation successfully', async () => {
      mockOperation.mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockOperation);

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should move to OPEN after failure threshold', async () => {
      mockOperation.mockRejectedValue(new Error('failure'));

      // Fail 3 times to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      // Force circuit breaker to OPEN state
      mockOperation.mockRejectedValue(new Error('failure'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected
        }
      }
      // Reset mock call count after setup
      mockOperation.mockClear();
    });

    it('should reject operations immediately', async () => {
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'Circuit breaker is OPEN'
      );
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should move to HALF_OPEN after reset timeout', async () => {
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      mockOperation.mockResolvedValue('success');
      const result = await circuitBreaker.execute(mockOperation);

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      // Force to OPEN state
      mockOperation.mockRejectedValue(new Error('failure'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected
        }
      }

      // Wait for reset timeout and make successful call to reach HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 1100));
      mockOperation.mockResolvedValue('success');
      await circuitBreaker.execute(mockOperation);
      
      // Verify we're in HALF_OPEN state
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });

    it('should move to CLOSED after successful operations', async () => {
      mockOperation.mockResolvedValue('success');

      // The exact number of successes needed depends on your implementation
      // This might need adjustment based on your CircuitBreaker logic
      await circuitBreaker.execute(mockOperation);
      await circuitBreaker.execute(mockOperation);

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should move back to OPEN on failure', async () => {
      // Ensure we start in HALF_OPEN state
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
      
      mockOperation.mockRejectedValue(new Error('failure'));

      try {
        await circuitBreaker.execute(mockOperation);
      } catch (error) {
        // Expected
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('stats and reset', () => {
    it('should provide accurate statistics', () => {
      const stats = circuitBreaker.getStats();

      expect(stats).toEqual({
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        lastFailureTime: null,
        successCount: 0,
      });
    });

    it('should reset to initial state', async () => {
      // Force to OPEN state
      mockOperation.mockRejectedValue(new Error('failure'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected
        }
      }

      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(circuitBreaker.getStats().failureCount).toBe(0);
    });
  });
});