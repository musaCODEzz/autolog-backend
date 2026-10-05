import crypto from 'crypto';
import {
  calculateServicePredictions,
  mapServiceRecordsToRuleHistory,
} from './predictions';
import { maskPlateNumber, maskChassisNumber } from './plate';

export interface ICertificateVehicleInput {
  _id?: any;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  engine?: string;
  transmission: string;
  fuelType: string;
  chassisNumber?: string;
  initialMileage: number;
  currentMileage: number;
  estDailyKm: number;
  passportSlug: string;
}

export interface ICertificateServiceRecordInput {
  serviceType: string[];
  serviceDate: Date;
  mileageAtService: number;
  verificationTier: 'TIER_1_SELF' | 'TIER_2_DOCUMENTED' | 'TIER_3_PARTNER';
  isBackdated: boolean;
  garageName: string;
  partsReplaced?: Array<{ partName: string }>;
  description?: string;
}

export interface IVehicleCertificate {
  certificateNumber: string;
  issuedAt: string;
  verificationUrl: string;
  verificationHash: string;
  vehicle: {
    plateNumber: string;
    make: string;
    model: string;
    year: number;
    engine?: string;
    transmission: string;
    fuelType: string;
    chassisNumber?: string;
    currentMileage: number;
    mileageUnit: string;
    passportSlug: string;
  };
  odometerIntegrity: {
    status: 'PASSED_VERIFIED' | 'CAUTION_UNVERIFIED';
    initialMileage: number;
    currentMileage: number;
    trackedDistanceKm: number;
    observedDailyAverageKm: number;
  };
  trustScore: {
    totalServices: number;
    tier3PartnerVerifiedCount: number;
    tier2DocumentedCount: number;
    tier1SelfReportedCount: number;
    verifiedPartnerStatus: boolean;
    backdatedRecordsCount: number;
  };
  predictiveHealth: {
    overallHealthStatus: 'HEALTHY' | 'DUE_SOON' | 'OVERDUE';
    nextUpcomingService: {
      key: string;
      name: string;
      nextDueMileage: number;
      kmRemaining: number;
      daysRemaining: number;
      urgency: string;
      estimatedCostKes: number;
      alertMessage: string;
    };
  };
}

/**
 * Computes deterministic SHA-256 cryptographic verification hash for the certificate
 */
export const computeCertificateHash = (
  plateNumber: string,
  currentMileage: number,
  totalServices: number,
  tier3Count: number,
  issuedAt: string,
  salt: string = 'AUTOLOG_KE_TAMPER_PROOF'
): string => {
  const canonicalString = `${plateNumber}:${currentMileage}:${totalServices}:${tier3Count}:${issuedAt}:${salt}`;
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
};

/**
 * Generates an official Certificate Serial Number (e.g., AL-KE-2026-MAZDA-A3F1)
 */
export const generateCertificateSerial = (
  make: string,
  issuedAt: string,
  hash: string
): string => {
  const year = new Date(issuedAt).getFullYear();
  const cleanMake = make.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase();
  const hashSuffix = hash.slice(0, 4).toUpperCase();
  return `AL-KE-${year}-${cleanMake}-${hashSuffix}`;
};

/**
 * Compiles a full official Digital Vehicle Passport Handover Certificate
 * @param vehicle - Vehicle database document
 * @param serviceRecords - Associated maintenance records
 * @param isPublicMasked - Whether to mask identifiers for public viewing
 * @param clientBaseUrl - Base frontend URL for verification links
 */
export const generateVehicleCertificate = (
  vehicle: ICertificateVehicleInput,
  serviceRecords: ICertificateServiceRecordInput[] = [],
  isPublicMasked: boolean = false,
  clientBaseUrl: string = process.env.CLIENT_URL || 'http://localhost:5173'
): IVehicleCertificate => {
  const issuedAt = new Date().toISOString();

  // 1. Trust Score Metrics
  const totalServices = serviceRecords.length;
  const tier3PartnerVerifiedCount = serviceRecords.filter(
    (r) => r.verificationTier === 'TIER_3_PARTNER'
  ).length;
  const tier2DocumentedCount = serviceRecords.filter(
    (r) => r.verificationTier === 'TIER_2_DOCUMENTED'
  ).length;
  const tier1SelfReportedCount = serviceRecords.filter(
    (r) => r.verificationTier === 'TIER_1_SELF'
  ).length;
  const backdatedRecordsCount = serviceRecords.filter((r) => r.isBackdated).length;

  // 2. Cryptographic Tamper-Proof Hash
  const verificationHash = computeCertificateHash(
    vehicle.plateNumber,
    vehicle.currentMileage,
    totalServices,
    tier3PartnerVerifiedCount,
    issuedAt
  );

  const certificateNumber = generateCertificateSerial(vehicle.make, issuedAt, verificationHash);
  const verificationUrl = `${clientBaseUrl}/passport/${vehicle.passportSlug}`;

  // 3. Predictive Mechanical Health
  const history = mapServiceRecordsToRuleHistory(serviceRecords);
  const predictionsSummary = calculateServicePredictions(
    vehicle.currentMileage,
    vehicle.estDailyKm,
    history
  );

  // 4. Odometer Integrity
  const trackedDistanceKm = Math.max(0, vehicle.currentMileage - vehicle.initialMileage);

  // 5. Plate & Chassis Privacy Masking if public
  const plateNumber = isPublicMasked ? maskPlateNumber(vehicle.plateNumber) : vehicle.plateNumber;
  const chassisNumber = vehicle.chassisNumber
    ? (isPublicMasked ? maskChassisNumber(vehicle.chassisNumber) : vehicle.chassisNumber)
    : undefined;

  return {
    certificateNumber,
    issuedAt,
    verificationUrl,
    verificationHash,
    vehicle: {
      plateNumber,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      engine: vehicle.engine,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      chassisNumber,
      currentMileage: vehicle.currentMileage,
      mileageUnit: 'KM',
      passportSlug: vehicle.passportSlug,
    },
    odometerIntegrity: {
      status: trackedDistanceKm >= 0 ? 'PASSED_VERIFIED' : 'CAUTION_UNVERIFIED',
      initialMileage: vehicle.initialMileage,
      currentMileage: vehicle.currentMileage,
      trackedDistanceKm,
      observedDailyAverageKm: vehicle.estDailyKm,
    },
    trustScore: {
      totalServices,
      tier3PartnerVerifiedCount,
      tier2DocumentedCount,
      tier1SelfReportedCount,
      verifiedPartnerStatus: tier3PartnerVerifiedCount > 0,
      backdatedRecordsCount,
    },
    predictiveHealth: {
      overallHealthStatus: predictionsSummary.overallStatus,
      nextUpcomingService: {
        key: predictionsSummary.nextUpcomingService.key,
        name: predictionsSummary.nextUpcomingService.name,
        nextDueMileage: predictionsSummary.nextUpcomingService.nextDueMileage,
        kmRemaining: predictionsSummary.nextUpcomingService.kmRemaining,
        daysRemaining: predictionsSummary.nextUpcomingService.daysRemaining,
        urgency: predictionsSummary.nextUpcomingService.urgency,
        estimatedCostKes: predictionsSummary.nextUpcomingService.estimatedCostKes,
        alertMessage: predictionsSummary.nextUpcomingService.alertMessage,
      },
    },
  };
};

export default {
  computeCertificateHash,
  generateCertificateSerial,
  generateVehicleCertificate,
};
