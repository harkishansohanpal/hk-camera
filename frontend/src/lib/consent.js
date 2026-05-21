const CONSENT_KEY = 'hk-consent';

export function consentGiven() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CONSENT_KEY) === 'accepted';
}

export function acceptConsent() {
  localStorage.setItem(CONSENT_KEY, 'accepted');
}

export function rejectConsent() {
  localStorage.setItem(CONSENT_KEY, 'rejected');
}

export function consentStatus() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CONSENT_KEY);
}
