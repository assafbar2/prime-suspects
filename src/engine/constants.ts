/** Shared tuning knobs — kept dependency-free to avoid circular imports. */

export const LINEUP_SIZE = 12
export const CHIPS_PER_CASE = 5
export const HAND_SIZE = 6

/**
 * Fairness guarantees:
 * - BEST: some six-card draft can always crack the case to one suspect.
 * - WORST: even the clumsiest draft narrows the room this far
 *   (a 12-suspect room with two wildcards drafted can rarely do better than 4).
 */
export const BEST_DRAFT_TARGET = 1
export const WORST_DRAFT_TARGET = 4
