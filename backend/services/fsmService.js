/**
 * CivilCOPZ Finite State Machine (FSM) Service
 * 
 * Enforces transactional litigation state transitions:
 * DRAFT -> SIGNING_INITIATED -> SIGNED -> TIMESTAMPED -> READY_FOR_FILING -> SUBMITTED
 */

const ALLOWED_TRANSITIONS = {
  'DRAFT': ['SIGNING_INITIATED'],
  'SIGNING_INITIATED': ['SIGNED', 'DRAFT'], // Allow fallback to draft if signing fails
  'SIGNED': ['TIMESTAMPED'],
  'TIMESTAMPED': ['READY_FOR_FILING'],
  'READY_FOR_FILING': ['SUBMITTED'],
  'SUBMITTED': ['SCRUTINY', 'DEFECTED', 'ACCEPTED'],
  'SCRUTINY': ['ACCEPTED', 'DEFECTED'],
  'DEFECTED': ['DRAFT'], // Return to draft for correction
  'ACCEPTED': ['CASE_REGISTERED'],
};

/**
 * Validates if the transition from current status to next status is legal.
 * @param {string} current - The current case status.
 * @param {string} next - The requested next status.
 * @throws {Error} If the transition is prohibited.
 */
function validateTransition(current, next) {
  const normalizedCurrent = current ? current.toUpperCase() : 'DRAFT';
  const normalizedNext = next ? next.toUpperCase() : 'DRAFT';

  if (normalizedCurrent === normalizedNext) {
    return true; // Idempotent same-state update
  }

  const allowed = ALLOWED_TRANSITIONS[normalizedCurrent];
  
  if (!allowed || !allowed.includes(normalizedNext)) {
    throw new Error(`[FSM_VIOLATION] Invalid state transition: ${normalizedCurrent} → ${normalizedNext}`);
  }

  return true;
}

module.exports = {
  validateTransition,
  ALLOWED_STATES: Object.keys(ALLOWED_TRANSITIONS)
};
