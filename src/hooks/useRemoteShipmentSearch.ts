import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shipment } from '../types';
import { getExactShipmentCn, normalizeShipmentCn } from '../lib/shipmentSearch';

export { getExactShipmentCn, normalizeShipmentCn } from '../lib/shipmentSearch';

/**
 * Hydrates an exact ARM consignment-number search from Supabase when that
 * parcel is not present in the role-scoped client list.
 */
export const useRemoteShipmentSearch = (
  query: string,
  visibleShipments: Shipment[],
  enabled = true
) => {
  const { lookupShipmentByCnNumber } = useApp();
  const lookupRef = useRef(lookupShipmentByCnNumber);
  const lastRequestedCnRef = useRef('');
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [remoteSearchError, setRemoteSearchError] = useState('');
  const exactCn = useMemo(() => getExactShipmentCn(query), [query]);
  const hasVisibleMatch = useMemo(
    () => !!exactCn && visibleShipments.some(shipment => normalizeShipmentCn(shipment.cnNumber) === normalizeShipmentCn(exactCn)),
    [exactCn, visibleShipments]
  );

  useEffect(() => {
    lookupRef.current = lookupShipmentByCnNumber;
  }, [lookupShipmentByCnNumber]);

  useEffect(() => {
    if (!enabled || !exactCn) {
      lastRequestedCnRef.current = '';
      setIsSearchingRemote(false);
      setRemoteSearchError('');
      return;
    }
    if (hasVisibleMatch) {
      lastRequestedCnRef.current = exactCn;
      setIsSearchingRemote(false);
      setRemoteSearchError('');
      return;
    }
    if (lastRequestedCnRef.current === exactCn) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      lastRequestedCnRef.current = exactCn;
      setIsSearchingRemote(true);
      setRemoteSearchError('');
      try {
        await lookupRef.current(exactCn);
      } catch (error) {
        if (!cancelled) {
          setRemoteSearchError(error instanceof Error ? error.message : 'Unable to search Supabase right now.');
        }
      } finally {
        if (!cancelled) setIsSearchingRemote(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, exactCn, hasVisibleMatch]);

  return { exactCn, isSearchingRemote, remoteSearchError };
};
