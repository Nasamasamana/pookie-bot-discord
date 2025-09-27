// utils/drafts.js
export const drafts = new Map();

export function saveDraft(userId, draft) {
  drafts.set(userId, draft);
}

export function getDraft(userId) {
  return drafts.get(userId);
}

export function deleteDraft(userId) {
  drafts.delete(userId);
}
