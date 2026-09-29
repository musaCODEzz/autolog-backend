import { describe, it, expect } from 'vitest';
import {
  calculateServicePredictions,
  STANDARD_SERVICE_RULES,
} from '../src/utils/predictions';

describe('🧠 Smart Predictive Maintenance Engine (src/utils/predictions.ts)', () => {
  it('should calculate correct next due mileage and km remaining for Engine Oil (5,000 km interval)', () => {
    // Car at 82,000 km => Next 5,000 km interval is 85,000 km (3,000 km remaining)
    const result = calculateServicePredictions(82000, 35);

    const oilPrediction = result.predictions.find((p) => p.key === 'ENGINE_OIL');
    expect(oilPrediction).toBeDefined();
    expect(oilPrediction?.nextDueMileage).toBe(85000);
    expect(oilPrediction?.kmRemaining).toBe(3000);
    // 3,000 km / 35 km/day = ~86 days
    expect(oilPrediction?.daysRemaining).toBe(86);
    expect(oilPrediction?.urgency).toBe('HEALTHY');
  });

  it('🛡️ should flag DUE_SOON when vehicle is within 500 km or 14 days of service', () => {
    // Car at 84,700 km => Next oil is at 85,000 km (300 km remaining <= 500 km!)
    const result = calculateServicePredictions(84700, 35);

    const oilPrediction = result.predictions.find((p) => p.key === 'ENGINE_OIL');
    expect(oilPrediction?.urgency).toBe('DUE_SOON');
    expect(result.overallStatus).toBe('DUE_SOON');
    expect(result.nextUpcomingService.key).toBe('ENGINE_OIL');
  });

  it('📊 should correctly calculate Transmission Fluid interval (40,000 km)', () => {
    // Car at 75,000 km => Next ATF flush is at 80,000 km (5,000 km remaining)
    const result = calculateServicePredictions(75000, 50);

    const atfPrediction = result.predictions.find((p) => p.key === 'TRANSMISSION_FLUID');
    expect(atfPrediction?.nextDueMileage).toBe(80000);
    expect(atfPrediction?.kmRemaining).toBe(5000);
    // 5,000 km / 50 km/day = 100 days
    expect(atfPrediction?.daysRemaining).toBe(100);
    expect(atfPrediction?.estimatedCostKes).toBe(14500);
  });

  it('should sort predictions by urgency (ascending km remaining)', () => {
    const result = calculateServicePredictions(84900, 35);

    for (let i = 0; i < result.predictions.length - 1; i++) {
      expect(result.predictions[i].kmRemaining).toBeLessThanOrEqual(
        result.predictions[i + 1].kmRemaining
      );
    }
  });
});
