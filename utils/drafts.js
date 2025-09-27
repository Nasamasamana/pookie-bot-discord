// utils/drafts.js
const drafts = new Map();

function defaultDraft() {
  return {
    toggles: {
      title: true,
      description: true,
      footer: false,
      image: false,
      thumbnail: false
    },
    title: '',
    description: '',
    footer: '',
    image: '',
    thumbnail: '',
    color: null, // integer color or null
    channelId: null,
    builderMessage: null, // { channelId, messageId }
    timeout: null
  };
}

function getDraft(userId) {
  if (!drafts.has(userId)) {
    drafts.set(userId, defaultDraft());
    refreshTimeout(userId);
  }
  return drafts.get(userId);
}

function saveDraft(userId, draft) {
  if (!draft) return;
  drafts.set(userId, draft);
  refreshTimeout(userId);
}

function deleteDraft(userId) {
  const d = drafts.get(userId);
  if (d && d.timeout) clearTimeout(d.timeout);
  drafts.delete(userId);
}

function refreshTimeout(userId) {
  const d = drafts.get(userId);
  if (!d) return;
  if (d.timeout) clearTimeout(d.timeout);
  d.timeout = setTimeout(() => {
    drafts.delete(userId);
  }, 30 * 60 * 1000); // 30 minutes idle timeout
  drafts.set(userId, d);
}

module.exports = { getDraft, saveDraft, deleteDraft };
