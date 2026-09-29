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

export interface IServicePrediction {
  key: string;
  name: string;
  intervalKm: number;
  nextDueMileage: number;
  kmRemaining: number;
  daysRemaining: number;
  estimatedDueDate: Date;
  estimatedCostKes: number;
  urgency: ServiceUrgency;
  description: string;
}

export interface IPredictionsSummary {
  currentMileage: number;
  estDailyKm: number;
  overallStatus: ServiceUrgency;
  nextUpcomingService: IServicePrediction;
  predictions: IServicePrediction[];
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
 * Calculates predictive maintenance intervals and due dates based on current mileage and burn rate
 * @param currentMileage - The vehicle's verified odometer reading in KM
 * @param estDailyKm - The vehicle's observed daily driving rate (default 35 km/day)
 * @returns Comprehensive prediction report sorted by urgency
 */
export const calculateServicePredictions = (
  currentMileage: number,
  estDailyKm: number = 35
): IPredictionsSummary => {
  const safeDailyKm = Math.max(1, estDailyKm);

  const predictions: IServicePrediction[] = STANDARD_SERVICE_RULES.map((rule) => {
    // Calculate the next multiple of the interval
    const cycleCount = Math.floor(currentMileage / rule.intervalKm);
    const nextDueMileage = (cycleCount + 1) * rule.intervalKm;
    const kmRemaining = Math.max(0, nextDueMileage - currentMileage);

    const daysRemaining = Math.max(1, Math.round(kmRemaining / safeDailyKm));
    const estimatedDueDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);

    let urgency: ServiceUrgency = 'HEALTHY';
    if (kmRemaining <= 0) {
      urgency = 'OVERDUE';
    } else if (kmRemaining <= 500 || daysRemaining <= 14) {
      urgency = 'DUE_SOON';
    }

    return {
      key: rule.key,
      name: rule.name,
      intervalKm: rule.intervalKm,
      nextDueMileage,
      kmRemaining,
      daysRemaining,
      estimatedDueDate,
      estimatedCostKes: rule.estimatedCostKes,
      urgency,
      description: rule.description,
    };
  });

  // Sort by closest due (ascending km remaining)
  predictions.sort((a, b) => a.kmRemaining - b.kmRemaining);

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
  calculateServicePredictions,
};
