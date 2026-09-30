import { describe, it, expect } from 'vitest';
import {
  calculateServicePredictions,
  mapServiceRecordsToRuleHistory,
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
    expect(oilPrediction?.alertMessage).toContain('is healthy');
  });

  it('🛡️ should flag DUE_SOON when vehicle is within 500 km or 14 days of service', () => {
    // Car at 84,700 km => Next oil is at 85,000 km (300 km remaining <= 500 km!)
    const result = calculateServicePredictions(84700, 35);

    const oilPrediction = result.predictions.find((p) => p.key === 'ENGINE_OIL');
    expect(oilPrediction?.urgency).toBe('DUE_SOON');
    expect(result.overallStatus).toBe('DUE_SOON');
    expect(result.nextUpcomingService.key).toBe('ENGINE_OIL');
    expect(oilPrediction?.alertMessage).toContain('Due in');
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

  it('should sort predictions by urgency (OVERDUE first, then DUE_SOON, then ascending km remaining)', () => {
    const result = calculateServicePredictions(84900, 35);

    expect(result.predictions.length).toBe(STANDARD_SERVICE_RULES.length);
    expect(result.nextUpcomingService).toBeDefined();
  });

  it('🛠️ should correctly incorporate actual logged service records and flag OVERDUE services', () => {
    // Car is currently at 82,000 km
    // Last logged oil change was at 75,000 km (interval 5,000 km => was due at 80,000 km!)
    const history = {
      ENGINE_OIL: {
        mileageAtService: 75000,
        serviceDate: new Date('2026-06-01'),
        serviceType: ['OIL_CHANGE'],
        garageName: 'AutoXpress Westlands',
      },
    };

    const result = calculateServicePredictions(82000, 35, history);

    const oilPrediction = result.predictions.find((p) => p.key === 'ENGINE_OIL');
    expect(oilPrediction).toBeDefined();
    expect(oilPrediction?.lastServiceMileage).toBe(75000);
    expect(oilPrediction?.nextDueMileage).toBe(80000);
    expect(oilPrediction?.kmRemaining).toBe(0);
    expect(oilPrediction?.urgency).toBe('OVERDUE');
    expect(oilPrediction?.alertMessage).toContain('OVERDUE by 2,000 km');
    expect(result.overallStatus).toBe('OVERDUE');
    expect(result.nextUpcomingService.key).toBe('ENGINE_OIL');
  });

  it('🔍 should correctly map raw MongoDB service records into rule history', () => {
    const rawRecords = [
      {
        serviceType: ['OIL_CHANGE'],
        mileageAtService: 79000,
        serviceDate: new Date('2026-08-10'),
        partsReplaced: [{ partName: 'Total Quartz 9000 5W-30' }],
        garageName: 'AutoXpress Westlands',
      },
      {
        serviceType: ['BRAKES'],
        mileageAtService: 70000,
        serviceDate: new Date('2026-05-15'),
        partsReplaced: [{ partName: 'Akebono Ceramic Brake Pads' }],
        garageName: 'Fundi Juma Ngara',
      },
    ];

    const history = mapServiceRecordsToRuleHistory(rawRecords);

    expect(history.ENGINE_OIL).toBeDefined();
    expect(history.ENGINE_OIL.mileageAtService).toBe(79000);
    expect(history.BRAKE_PADS).toBeDefined();
    expect(history.BRAKE_PADS.mileageAtService).toBe(70000);

    // Car at 80,000 km (1,000 km after oil change, 10,000 km after brake pads)
    const predictions = calculateServicePredictions(80000, 25, history);
    const oil = predictions.predictions.find((p) => p.key === 'ENGINE_OIL');
    expect(oil?.nextDueMileage).toBe(84000);
    expect(oil?.kmRemaining).toBe(4000);
    expect(oil?.urgency).toBe('HEALTHY');
  });

  it('⚠️ should trigger cambelt inspection advisory on high mileage vehicles without cambelt record', () => {
    // Car at 105,000 km with no logged timing belt replacement
    const result = calculateServicePredictions(105000, 30);
    const timingBelt = result.predictions.find((p) => p.key === 'TIMING_BELT');

    expect(timingBelt).toBeDefined();
    expect(timingBelt?.urgency).toBe('OVERDUE');
    expect(timingBelt?.alertMessage).toContain('Cambelt replacement overdue');
  });
});

