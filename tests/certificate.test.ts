import { describe, it, expect } from 'vitest';
import {
  computeCertificateHash,
  generateCertificateSerial,
  generateVehicleCertificate,
  ICertificateVehicleInput,
  ICertificateServiceRecordInput,
} from '../src/utils/certificate';

describe('📜 Vehicle Handover Certificate Engine (src/utils/certificate.ts)', () => {
  const mockVehicle: ICertificateVehicleInput = {
    _id: 'veh_123',
    plateNumber: 'KDA 123A',
    make: 'Toyota',
    model: 'Premio',
    year: 2018,
    engine: '1.8L 2ZR-FAE',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    chassisNumber: 'ZRT260-1234567',
    initialMileage: 65000,
    currentMileage: 82000,
    estDailyKm: 35,
    passportSlug: 'kda123a-toyota-premio-2018-7a8b9c',
  };

  const mockRecords: ICertificateServiceRecordInput[] = [
    {
      serviceType: ['OIL_CHANGE'],
      serviceDate: new Date('2026-08-10'),
      mileageAtService: 79000,
      verificationTier: 'TIER_3_PARTNER',
      isBackdated: false,
      garageName: 'AutoXpress Westlands',
    },
    {
      serviceType: ['BRAKES'],
      serviceDate: new Date('2026-05-15'),
      mileageAtService: 70000,
      verificationTier: 'TIER_2_DOCUMENTED',
      isBackdated: false,
      garageName: 'Total Rubis Express',
    },
  ];

  it('🔐 should compute a deterministic, 64-char SHA-256 tamper-evident hash', () => {
    const timestamp = '2026-10-05T20:00:00.000Z';
    const hash1 = computeCertificateHash('KDA 123A', 82000, 2, 1, timestamp);
    const hash2 = computeCertificateHash('KDA 123A', 82000, 2, 1, timestamp);
    const tamperedHash = computeCertificateHash('KDA 123A', 82001, 2, 1, timestamp);

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(tamperedHash);
  });

  it('🏷️ should generate an official serial number formatted as AL-KE-YYYY-MAKE-HASH', () => {
    const timestamp = '2026-10-05T20:00:00.000Z';
    const hash = 'a3f1b4c9e8d7';
    const serial = generateCertificateSerial('Mazda', timestamp, hash);

    expect(serial).toBe('AL-KE-2026-MAZDA-A3F1');
  });

  it('📄 should generate a complete certificate with owner unmasked identifiers', () => {
    const certificate = generateVehicleCertificate(mockVehicle, mockRecords, false);

    expect(certificate.certificateNumber).toMatch(/^AL-KE-\d{4}-TOYOT-[A-Z0-9]{4}$/);
    expect(certificate.verificationHash).toHaveLength(64);
    expect(certificate.vehicle.plateNumber).toBe('KDA 123A');
    expect(certificate.vehicle.chassisNumber).toBe('ZRT260-1234567');
    expect(certificate.vehicle.currentMileage).toBe(82000);
    expect(certificate.verificationUrl).toContain('/passport/kda123a-toyota-premio-2018-7a8b9c');

    // Odometer integrity
    expect(certificate.odometerIntegrity.status).toBe('PASSED_VERIFIED');
    expect(certificate.odometerIntegrity.initialMileage).toBe(65000);
    expect(certificate.odometerIntegrity.trackedDistanceKm).toBe(17000);
    expect(certificate.odometerIntegrity.observedDailyAverageKm).toBe(35);

    // Trust Score
    expect(certificate.trustScore.totalServices).toBe(2);
    expect(certificate.trustScore.tier3PartnerVerifiedCount).toBe(1);
    expect(certificate.trustScore.tier2DocumentedCount).toBe(1);
    expect(certificate.trustScore.verifiedPartnerStatus).toBe(true);

    // Predictive Health
    expect(certificate.predictiveHealth.overallHealthStatus).toBeDefined();
    expect(certificate.predictiveHealth.nextUpcomingService).toBeDefined();
    expect(certificate.predictiveHealth.nextUpcomingService.name).toBeDefined();
  });

  it('🛡️ should mask plate and chassis numbers when generating a public certificate', () => {
    const certPublic = generateVehicleCertificate(mockVehicle, mockRecords, true);

    expect(certPublic.vehicle.plateNumber).not.toBe('KDA 123A');
    expect(certPublic.vehicle.plateNumber).toBe('KD* ***A');
    expect(certPublic.vehicle.chassisNumber).not.toBe('ZRT260-1234567');
    expect(certPublic.vehicle.chassisNumber).toContain('...4567');
  });
});
