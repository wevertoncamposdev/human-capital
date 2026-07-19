"use client";

let suspended = false;

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("detail:media-autosave-suspension-change", {
      detail: { suspended },
    }),
  );
}

export function suspendDetailAutoSave() {
  suspended = true;
  emitChange();
}

export function resumeDetailAutoSave() {
  suspended = false;
  emitChange();
}

export function isDetailAutoSaveSuspended() {
  return suspended;
}

