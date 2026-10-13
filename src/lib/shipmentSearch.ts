/** Removes presentation characters so CN values can be compared consistently. */
export const normalizeShipmentCn = (value: string): string =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Converts every supported exact parcel-number input to its stored form.
 * For example: 1753, ARM1753, and ARM-1753 all become ARM-1753.
 */
export const getExactShipmentCn = (value: string): string | null => {
  const compact = normalizeShipmentCn(value);
  const match = compact.match(/^(?:ARM)?(\d+)$/);
  return match ? `ARM-${match[1]}` : null;
};

/** Matches a CN query without requiring the user to type its prefix or dash. */
export const shipmentCnMatches = (cnNumber: string, query: string): boolean => {
  const normalizedQuery = normalizeShipmentCn(query);
  if (!normalizedQuery) return true;

  const exactCn = getExactShipmentCn(query);
  if (exactCn) {
    return normalizeShipmentCn(cnNumber) === normalizeShipmentCn(exactCn);
  }

  return normalizeShipmentCn(cnNumber).includes(normalizedQuery);
};
