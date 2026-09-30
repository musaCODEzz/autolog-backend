/**
 * Smart Service Interval & Predictive Maintenance Calculator
 * Tailored for Kenyan driving conditions and vehicle maintenance schedules.
 */

export type ServiceUrgency = 'HEALTHY' | 'DUE_SOON' | 'OVERDUE';

export interface IServiceScheduleRule {
  key: string;
  name: string;
  intervalKm: number;
  estimatedCostKes: number;
  description: string;
}

export interface IServiceHistoryEntry {
  mileageAtService: number;
  serviceDate?: Date;
  serviceType?: string[];
  garageName?: string;
}

export interface IServicePrediction {
  key: string;
  name: string;
  intervalKm: number;
  lastServiceMileage?: number;
  lastServiceDate?: Date;
  nextDueMileage: number;
  kmRemaining: number;
  daysRemaining: number;
  estimatedDueDate: Date;
  estimatedCostKes: number;
  urgency: ServiceUrgency;
  description: string;
  alertMessage: string;
}

export interface IPredictionsSummary {
  currentMileage: number;
  estDailyKm: number;
  overallStatus: ServiceUrgency;
  nextUpcomingService: IServicePrediction;
  predictions: IServicePrediction[];
}

export interface IRawServiceRecord {
  serviceType: string[];
  mileageAtService: number;
  serviceDate: Date;
  partsReplaced?: Array<{ partName: string }>;
  description?: string;
  garageName?: string;
}

/**
 * Standard Kenyan Automotive Service Intervals
 */
export const STANDARD_SERVICE_RULES: IServiceScheduleRule[] = [
  {
    key: 'ENGINE_OIL',
    name: 'Engine Oil & Oil Filter Replacement',
    intervalKm: 5000,
    estimatedCostKes: 6500,
    description: 'Routine minor service with synthetic 5W-30 / 0W-20 oil and OEM filter.',
  },
  {
    key: 'AIR_FILTER',
    name: 'Engine Air & Cabin AC Filters',
    intervalKm: 10000,
    estimatedCostKes: 3000,
    description: 'Essential in dusty Nairobi traffic and upcountry driving.',
  },
  {
    key: 'BRAKE_PADS',
    name: 'Front & Rear Brake Pads Inspection',
    intervalKm: 20000,
    estimatedCostKes: 7500,
    description: 'Inspect friction material thickness, calipers, and brake fluid boiling point.',
  },
  {
    key: 'TRANSMISSION_FLUID',
    name: 'Automatic / CVT Gearbox Fluid Flush',
    intervalKm: 40000,
    estimatedCostKes: 14500,
    description: 'Crucial for Subaru Lineartronic CVTs, Toyota Super CVT-i, and automatic transmissions.',
  },
  {
    key: 'SPARK_PLUGS',
    name: 'Iridium / Platinum Spark Plugs',
    intervalKm: 50000,
    estimatedCostKes: 8500,
    description: 'Prevents engine misfires and restores fuel economy.',
  },
  {
    key: 'TIMING_BELT',
    name: 'Timing Belt / Water Pump & Serpentine Belts',
    intervalKm: 100000,
    estimatedCostKes: 32000,
    description: 'Critical preventative replacement to avoid catastrophic engine valve damage.',
  },
];

/**
 * Maps vehicle service records from MongoDB to the latest known service per rule
 */
export const mapServiceRecordsToRuleHistory = (
  serviceRecords: IRawServiceRecord[]
): Record<string, IServiceHistoryEntry> => {
  const history: Record<string, IServiceHistoryEntry> = {};

  const sorted = [...serviceRecords].sort((a, b) => {
    if (b.mileageAtService !== a.mileageAtService) {
      return b.mileageAtService - a.mileageAtService;
    }
    return new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime();
  });

  for (const record of sorted) {
    const types = record.serviceType || [];
    const parts = (record.partsReplaced || []).map((p) => p.partName.toLowerCase()).join(' ');
    const desc = (record.description || '').toLowerCase();
    const fullText = `${parts} ${desc}`;

    // ENGINE_OIL
    if (
      !history['ENGINE_OIL'] &&
      (types.includes('OIL_CHANGE') || types.includes('MAJOR_SERVICE') || /oil.*filter|engine.*oil/i.test(fullText))
    ) {
      history['ENGINE_OIL'] = {
        mileageAtService: record.mileageAtService,
        serviceDate: record.serviceDate,
        serviceType: types,
        garageName: record.garageName,
      };
    }

    // AIR_FILTER
    if (
      !history['AIR_FILTER'] &&
      (types.includes('MAJOR_SERVICE') || /air.*filter|cabin.*filter/i.test(fullText))
    ) {
      history['AIR_FILTER'] = {
        mileageAtService: record.mileageAtService,
        serviceDate: record.serviceDate,
        serviceType: types,
        garageName: record.garageName,
      };
    }

    // BRAKE_PADS
    if (
      !history['BRAKE_PADS'] &&
      (types.includes('BRAKES') || /brake.*pad|caliper|rotor|disc/i.test(fullText))
    ) {
      history['BRAKE_PADS'] = {
        mileageAtService: record.mileageAtService,
        serviceDate: record.serviceDate,
        serviceType: types,
        garageName: record.garageName,
      };
    }

    // TRANSMISSION_FLUID
    if (
      !history['TRANSMISSION_FLUID'] &&
      (types.includes('TRANSMISSION') || /transmission|gearbox|cvt|atf/i.test(fullText))
    ) {
      history['TRANSMISSION_FLUID'] = {
        mileageAtService: record.mileageAtService,
        serviceDate: record.serviceDate,
        serviceType: types,
        garageName: record.garageName,
      };
    }

    // SPARK_PLUGS
    if (
      !history['SPARK_PLUGS'] &&
      (types.includes('MAJOR_SERVICE') || /spark.*plug|ignition/i.test(fullText))
    ) {
      history['SPARK_PLUGS'] = {
        mileageAtService: record.mileageAtService,
        serviceDate: record.serviceDate,
        serviceType: types,
        garageName: record.garageName,
      };
    }

    // TIMING_BELT
    if (
      !history['TIMING_BELT'] &&
      (types.includes('MAJOR_SERVICE') || /timing.*belt|cambelt|serpentine/i.test(fullText))
    ) {
      history['TIMING_BELT'] = {
        mileageAtService: record.mileageAtService,
        serviceDate: record.serviceDate,
        serviceType: types,
        garageName: record.garageName,
      };
    }
  }

  return history;
};

/**
 * Calculates predictive maintenance intervals and due dates based on current mileage, burn rate, and actual service logs
 * @param currentMileage - The vehicle's verified odometer reading in KM
 * @param estDailyKm - The vehicle's observed daily driving rate (default 35 km/day)
 * @param serviceHistoryByRule - Optional map of latest logged services by rule key
 * @returns Comprehensive prediction report sorted by urgency
 */
export const calculateServicePredictions = (
  currentMileage: number,
  estDailyKm: number = 35,
  serviceHistoryByRule?: Record<string, IServiceHistoryEntry>
): IPredictionsSummary => {
  const safeDailyKm = Math.max(1, estDailyKm);

  const predictions: IServicePrediction[] = STANDARD_SERVICE_RULES.map((rule) => {
    const history = serviceHistoryByRule ? serviceHistoryByRule[rule.key] : undefined;

    let nextDueMileage: number;
    let lastServiceMileage: number | undefined;
    let lastServiceDate: Date | undefined;

    if (history && typeof history.mileageAtService === 'number') {
      lastServiceMileage = history.mileageAtService;
      lastServiceDate = history.serviceDate;
      nextDueMileage = history.mileageAtService + rule.intervalKm;
    } else {
      // Baseline calculation without specific service log: find next interval milestone
      const cycleCount = Math.floor(currentMileage / rule.intervalKm);
      nextDueMileage = (cycleCount + 1) * rule.intervalKm;
    }

    const rawKmDiff = nextDueMileage - currentMileage;
    const kmRemaining = Math.max(0, rawKmDiff);
    const daysRemaining = rawKmDiff <= 0 ? 0 : Math.max(1, Math.round(kmRemaining / safeDailyKm));

    const estimatedDueDate = rawKmDiff <= 0
      ? new Date(Date.now() - Math.round(Math.abs(rawKmDiff) / safeDailyKm) * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);

    let urgency: ServiceUrgency = 'HEALTHY';
    let alertMessage = '';

    if (rawKmDiff <= 0) {
      urgency = 'OVERDUE';
      const overdueKm = Math.abs(rawKmDiff);
      alertMessage = `${rule.name} is OVERDUE by ${overdueKm.toLocaleString()} km (target was ${nextDueMileage.toLocaleString()} km)!`;
    } else if (kmRemaining <= 500 || daysRemaining <= 14) {
      urgency = 'DUE_SOON';
      alertMessage = `${rule.name} Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} / ${kmRemaining.toLocaleString()} km (target: ${nextDueMileage.toLocaleString()} km)`;
    } else {
      urgency = 'HEALTHY';
      alertMessage = `${rule.name} is healthy. Next due at ${nextDueMileage.toLocaleString()} km (in ${kmRemaining.toLocaleString()} km / ~${daysRemaining} days)`;
    }

    // Special advisory: If cambelt has no logged replacement and vehicle is high mileage (>= 90,000 km)
    if (rule.key === 'TIMING_BELT' && !history && currentMileage >= 90000) {
      if (currentMileage >= 100000) {
        urgency = 'OVERDUE';
        alertMessage = `Cambelt replacement overdue! Vehicle has reached ${currentMileage.toLocaleString()} km with no logged timing belt replacement.`;
      } else {
        urgency = 'DUE_SOON';
        alertMessage = `Cambelt inspection required. Vehicle is at ${currentMileage.toLocaleString()} km without logged cambelt replacement.`;
      }
    }

    return {
      key: rule.key,
      name: rule.name,
      intervalKm: rule.intervalKm,
      lastServiceMileage,
      lastServiceDate,
      nextDueMileage,
      kmRemaining,
      daysRemaining,
      estimatedDueDate,
      estimatedCostKes: rule.estimatedCostKes,
      urgency,
      description: rule.description,
      alertMessage,
    };
  });

  // Urgency priority: OVERDUE (0), DUE_SOON (1), HEALTHY (2)
  const urgencyWeight: Record<ServiceUrgency, number> = {
    OVERDUE: 0,
    DUE_SOON: 1,
    HEALTHY: 2,
  };

  predictions.sort((a, b) => {
    if (urgencyWeight[a.urgency] !== urgencyWeight[b.urgency]) {
      return urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
    }
    return a.kmRemaining - b.kmRemaining;
  });

  const nextUpcomingService = predictions[0];

  let overallStatus: ServiceUrgency = 'HEALTHY';
  if (predictions.some((p) => p.urgency === 'OVERDUE')) {
    overallStatus = 'OVERDUE';
  } else if (predictions.some((p) => p.urgency === 'DUE_SOON')) {
    overallStatus = 'DUE_SOON';
  }

  return {
    currentMileage,
    estDailyKm: safeDailyKm,
    overallStatus,
    nextUpcomingService,
    predictions,
  };
};

export default {
  STANDARD_SERVICE_RULES,
  mapServiceRecordsToRuleHistory,
  calculateServicePredictions,
};
