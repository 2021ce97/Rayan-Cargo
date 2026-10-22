import { Branch, Language } from '../types';

const clean = (value?: string | null): string => (value || '').trim();

const uniqueParts = (values: Array<string | undefined | null>): string[] => {
  const seen = new Set<string>();

  return values.reduce<string[]>((parts, value) => {
    const part = clean(value);
    const key = part.toLocaleLowerCase();
    if (part && !seen.has(key)) {
      seen.add(key);
      parts.push(part);
    }
    return parts;
  }, []);
};

/** The exact branch name saved by an administrator, localized when available. */
export const getBranchDisplayName = (
  branch?: Branch | null,
  language: Language = 'en'
): string => {
  if (!branch) return '';

  const localizedName = language === 'fa'
    ? branch.nameFa
    : language === 'ps'
      ? branch.namePs
      : branch.name;

  return clean(localizedName) || clean(branch.name) || clean(branch.nameFa) || clean(branch.namePs) || clean(branch.city) || clean(branch.code);
};

/** City/district and province, without printing the same value twice. */
export const getBranchLocality = (branch?: Branch | null): string =>
  uniqueParts([branch?.city, branch?.province]).join(', ');

/** The physical address saved in branch management. */
export const getBranchAddress = (branch?: Branch | null): string => clean(branch?.address);

/** A compact but complete branch description for selectors and summaries. */
export const getBranchFullLabel = (
  branch?: Branch | null,
  language: Language = 'en'
): string => {
  if (!branch) return '';
  const nameAndCode = `${getBranchDisplayName(branch, language)}${clean(branch.code) ? ` (${clean(branch.code)})` : ''}`;
  return uniqueParts([nameAndCode, getBranchLocality(branch), getBranchAddress(branch)]).join(' — ');
};

/** All administrator-managed branch fields that should be searchable. */
export const getBranchSearchText = (branch: Branch): string =>
  [
    branch.code,
    branch.name,
    branch.nameFa,
    branch.namePs,
    branch.city,
    branch.province,
    branch.address,
    branch.phone,
    branch.managerPhone
  ].filter(Boolean).join(' ');

