import { Branch } from '../types';

/**
 * Escapes a cell value for standard CSV (RFC 4180) compliance.
 */
function escapeCsvValue(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates an Excel-compatible CSV string with UTF-8 BOM (\uFEFF)
 * ensuring non-Latin characters (Dari, Pashto, Arabic) and ID numbers render flawlessly.
 */
export function exportBranchesToCsv(branches: Branch[], usersMap: Map<string, any> = new Map()): void {
  const headers = [
    'Branch Code',
    'Branch Name (English)',
    'Branch Name (Dari / Farsi)',
    'Branch Name (Pashto)',
    'Province',
    'City',
    'Full Terminal Address',
    'Official Phone / WhatsApp',
    'Terminal Email',
    'Branch Officer / Manager Name',
    'Manager CNIC / Tazkira ID',
    'CNIC / Tazkira Status',
    'Is Head Office',
    'Active Shipments In-Transit',
    'Total Dispatched Parcels',
    'Total Received Parcels',
    'Total Revenue (AFN)',
    'Registration Date'
  ];

  const rows: string[] = [];
  rows.push(headers.map(escapeCsvValue).join(','));

  branches.forEach(branch => {
    const user = usersMap.get(branch.id);
    const cleanDigits = (branch.tazkiraNumber || '').replace(/[\s-]/g, '');
    const is13Digits = cleanDigits.length === 13 && /^\d{13}$/.test(cleanDigits);
    const tazkiraStatus = is13Digits ? '13-Digit Verified ID' : 'Pending 13-Digit Verification';

    const row = [
      branch.code || '',
      branch.name || '',
      branch.nameFa || branch.name || '',
      branch.namePs || branch.name || '',
      branch.province || '',
      branch.city || '',
      branch.address || '',
      branch.phone || '',
      branch.email || '',
      user?.name || branch.managerName || '',
      branch.tazkiraNumber || '',
      tazkiraStatus,
      branch.isHeadOffice ? 'Yes' : 'No',
      branch.activeShipmentsCount || 0,
      branch.totalParcelsDispatched || 0,
      branch.totalParcelsReceived || 0,
      branch.totalRevenueAfn || 0,
      branch.createdAt || ''
    ];

    rows.push(row.map(escapeCsvValue).join(','));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `Armaghan_Sadeq_Transfers_Branch_Directory_${dateStr}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
