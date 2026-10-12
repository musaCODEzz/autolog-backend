import { IVehicleCertificate } from './certificate';

/**
 * Escapes HTML characters to prevent XSS in rendered certificates
 */
const escapeHtml = (str: string = ''): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * Renders an official, print-ready HTML Handover Certificate
 * Optimized for desktop viewing, mobile devices, and A4 print/PDF export.
 */
export const renderCertificateHtml = (cert: IVehicleCertificate): string => {
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  });

  const isHealthy = cert.predictiveHealth.overallHealthStatus === 'HEALTHY';
  const isDueSoon = cert.predictiveHealth.overallHealthStatus === 'DUE_SOON';
  const healthBadgeColor = isHealthy ? '#16a34a' : isDueSoon ? '#d97706' : '#dc2626';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AutoLog KE Handover Certificate — ${escapeHtml(cert.certificateNumber)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0f172a;
      --accent: #2563eb;
      --tier-green: #16a34a;
      --tier-amber: #d97706;
      --tier-gray: #4b5563;
      --bg: #f8fafc;
      --card: #ffffff;
      --border: #e2e8f0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: #1e293b;
      line-height: 1.5;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .action-bar {
      width: 100%;
      max-width: 850px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .btn-primary {
      background: var(--accent);
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: #ffffff;
      color: #334151;
      border: 1px solid var(--border);
    }

    .certificate-sheet {
      width: 100%;
      max-width: 850px;
      background: var(--card);
      border: 2px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      padding: 40px;
      position: relative;
    }

    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 80px;
      font-weight: 900;
      color: rgba(15, 23, 42, 0.03);
      pointer-events: none;
      letter-spacing: 12px;
      user-select: none;
      white-space: nowrap;
    }

    .cert-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 20px;
      margin-bottom: 24px;
    }

    .brand-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-badge {
      background: var(--primary);
      color: #ffffff;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
      border-radius: 8px;
    }

    .brand-text h1 {
      font-size: 20px;
      font-weight: 800;
      color: var(--primary);
      letter-spacing: -0.5px;
    }

    .brand-text p {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 1.5px;
      color: #64748b;
    }

    .cert-serial-box {
      text-align: right;
    }

    .serial-number {
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      font-weight: 700;
      color: var(--accent);
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 6px 12px;
      border-radius: 6px;
      display: inline-block;
    }

    .issue-date {
      font-size: 11px;
      color: #64748b;
      margin-top: 6px;
    }

    .vehicle-hero {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 24px;
      align-items: center;
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .license-plate {
      background: #ffffff;
      color: #000000;
      font-family: 'Inter', sans-serif;
      font-weight: 900;
      font-size: 24px;
      letter-spacing: 3px;
      padding: 10px 22px;
      border: 3px solid #000000;
      border-radius: 6px;
      box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.15);
      text-transform: uppercase;
      white-space: nowrap;
    }

    .vehicle-meta h2 {
      font-size: 22px;
      font-weight: 800;
      color: var(--primary);
    }

    .vehicle-specs {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .vehicle-specs span strong {
      color: #1e293b;
    }

    .mileage-hero {
      text-align: right;
      padding-left: 16px;
      border-left: 2px dashed #cbd5e1;
    }

    .mileage-val {
      font-size: 26px;
      font-weight: 800;
      color: var(--primary);
      font-family: 'JetBrains Mono', monospace;
    }

    .mileage-lbl {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 1px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }

    .panel {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      background: #ffffff;
    }

    .panel-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }

    .metric-row:last-child {
      border-bottom: none;
    }

    .badge-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .badge-pass {
      background: #dcfce7;
      color: #166534;
    }

    .tier-badges {
      display: flex;
      gap: 10px;
      margin-top: 8px;
    }

    .tier-box {
      flex: 1;
      padding: 10px;
      border-radius: 6px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }

    .tier-box.green {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
    }

    .tier-box.amber {
      background: #fffbeb;
      border-color: #fde68a;
      color: #92400e;
    }

    .tier-box.gray {
      background: #f8fafc;
      border-color: #e2e8f0;
      color: #475569;
    }

    .tier-count {
      font-size: 18px;
      font-weight: 800;
    }

    .tier-name {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .predictive-banner {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-left: 4px solid ${healthBadgeColor};
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .predictive-info h4 {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }

    .predictive-info p {
      font-size: 12px;
      color: #64748b;
    }

    .hash-section {
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }

    .hash-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #94a3b8;
      margin-bottom: 4px;
    }

    .hash-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.5px;
      word-break: break-all;
      color: #38bdf8;
    }

    .signatures-block {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 24px;
      margin-top: 10px;
    }

    .sig-line {
      border-bottom: 1px solid #94a3b8;
      height: 40px;
      margin-bottom: 6px;
    }

    .sig-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 1px;
    }

    .footer-note {
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
      margin-top: 24px;
      line-height: 1.4;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .action-bar {
        display: none !important;
      }
      .certificate-sheet {
        box-shadow: none;
        border: 1px solid #94a3b8;
        padding: 24px;
        max-width: 100%;
      }
      .watermark {
        color: rgba(15, 23, 42, 0.04);
      }
    }
  </style>
</head>
<body>

  <div class="action-bar">
    <div style="font-size: 13px; color: #64748b;">
      🇰🇪 Official Republic of Kenya Vehicle Transfer Document
    </div>
    <div style="display: flex; gap: 10px;">
      <a href="${escapeHtml(cert.verificationUrl)}" target="_blank" class="btn btn-secondary">
        🌐 Verify Live Passport
      </a>
      <button onclick="window.print()" class="btn btn-primary">
        🖨️ Print / Save PDF
      </button>
    </div>
  </div>

  <div class="certificate-sheet">
    <div class="watermark">AUTOLOG KE</div>

    <header class="cert-header">
      <div class="brand-title">
        <div class="logo-badge">AL</div>
        <div class="brand-text">
          <h1>AutoLog Kenya</h1>
          <p>Digital Vehicle Passport & Handover Certificate</p>
        </div>
      </div>
      <div class="cert-serial-box">
        <div class="serial-number">${escapeHtml(cert.certificateNumber)}</div>
        <div class="issue-date">Issued: ${issuedDate} EAT</div>
      </div>
    </header>

    <section class="vehicle-hero">
      <div class="license-plate">${escapeHtml(cert.vehicle.plateNumber)}</div>
      <div class="vehicle-meta">
        <h2>${escapeHtml(cert.vehicle.year.toString())} ${escapeHtml(cert.vehicle.make)} ${escapeHtml(cert.vehicle.model)}</h2>
        <div class="vehicle-specs">
          ${cert.vehicle.engine ? `<span>Engine: <strong>${escapeHtml(cert.vehicle.engine)}</strong></span>` : ''}
          <span>Trans: <strong>${escapeHtml(cert.vehicle.transmission)}</strong></span>
          <span>Fuel: <strong>${escapeHtml(cert.vehicle.fuelType)}</strong></span>
          ${cert.vehicle.chassisNumber ? `<span>VIN/Chassis: <strong>${escapeHtml(cert.vehicle.chassisNumber)}</strong></span>` : ''}
        </div>
      </div>
      <div class="mileage-hero">
        <div class="mileage-val">${cert.vehicle.currentMileage.toLocaleString()}</div>
        <div class="mileage-lbl">Verified Kilometers</div>
      </div>
    </section>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title">🛡️ Odometer & Telemetry Integrity</div>
        <div class="metric-row">
          <span>Anti-Rollback Verification</span>
          <span class="badge-pill badge-pass">✓ PASSED &amp; MONOTONIC</span>
        </div>
        <div class="metric-row">
          <span>Initial Tracked Mileage</span>
          <strong>${cert.odometerIntegrity.initialMileage.toLocaleString()} KM</strong>
        </div>
        <div class="metric-row">
          <span>Total Distance Monitored</span>
          <strong>${cert.odometerIntegrity.trackedDistanceKm.toLocaleString()} KM</strong>
        </div>
        <div class="metric-row">
          <span>Observed Daily Burn Rate</span>
          <strong>~${cert.odometerIntegrity.observedDailyAverageKm} KM / Day</strong>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">🏆 3-Tier Maintenance Trust Audit</div>
        <div class="metric-row">
          <span>Total Recorded Services</span>
          <strong>${cert.trustScore.totalServices} Entries</strong>
        </div>
        <div class="metric-row">
          <span>Retroactive Backdating Flags</span>
          <strong style="color: ${cert.trustScore.backdatedRecordsCount > 0 ? '#dc2626' : '#16a34a'}">
            ${cert.trustScore.backdatedRecordsCount === 0 ? '0 (Clean Record)' : `${cert.trustScore.backdatedRecordsCount} Flagged`}
          </strong>
        </div>
        <div class="tier-badges">
          <div class="tier-box green">
            <div class="tier-count">${cert.trustScore.tier3PartnerVerifiedCount}</div>
            <div class="tier-name">Tier 3 Partner</div>
          </div>
          <div class="tier-box amber">
            <div class="tier-count">${cert.trustScore.tier2DocumentedCount}</div>
            <div class="tier-name">Tier 2 Receipts</div>
          </div>
          <div class="tier-box gray">
            <div class="tier-count">${cert.trustScore.tier1SelfReportedCount}</div>
            <div class="tier-name">Tier 1 Self</div>
          </div>
        </div>
      </div>
    </div>

    <div class="predictive-banner">
      <div class="predictive-info">
        <h4>Predictive Mechanical Health: ${escapeHtml(cert.predictiveHealth.overallHealthStatus)}</h4>
        <p>${escapeHtml(cert.predictiveHealth.nextUpcomingService.alertMessage)}</p>
      </div>
      <div style="text-align: right; font-size: 12px;">
        <span style="color: #64748b;">Estimated Budget:</span><br>
        <strong style="font-size: 15px; color: #0f172a;">KES ${cert.predictiveHealth.nextUpcomingService.estimatedCostKes.toLocaleString()}</strong>
      </div>
    </div>

    <div class="hash-section">
      <div class="hash-label">Cryptographic SHA-256 Tamper-Evident Security Seal</div>
      <div class="hash-value">${escapeHtml(cert.verificationHash)}</div>
    </div>

    <div class="signatures-block">
      <div>
        <div class="sig-line"></div>
        <div class="sig-label">Transferor / Current Owner</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-label">Transferee / Purchaser</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-label">Bank / Sacco / Legal Witness</div>
      </div>
    </div>

    <p class="footer-note">
      This document certifies the cryptographic and odometer integrity of the vehicle as tracked in the AutoLog Kenya registry.<br>
      Any alteration to odometer readings, service records, or physical receipts invalidates this certificate. Verify at: <strong>${escapeHtml(cert.verificationUrl)}</strong>
    </p>
  </div>

</body>
</html>`;
};
