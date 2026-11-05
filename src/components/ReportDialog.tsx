import { useEffect, useRef, useState } from "react";
import type { ReportReason } from "../types";
import { blockUser, isBlockedBetween, getProfile, reportUser, unblockUser, blockedIds } from "../lib/store";
import { useTranslation } from "../i18n";
import { Icon } from "./Icons";

const REASONS: ReportReason[] = ["unsafeDriving", "harassment", "offAppPayment", "noShow", "other"];

// "Report or block" for a person: one button that opens an in-page dialog.
// Blocking hides their rides and requests and stops bookings both ways.
export function ReportButton({
  targetId,
  targetName,
  bookingId,
  compact = false
}: {
  targetId: string;
  targetName: string;
  bookingId?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (targetId === getProfile().id) return null;
  return (
    <>
      <button
        type="button"
        className={compact ? "menu-button" : "ghost-button"}
        onClick={() => setOpen(true)}
        aria-label={t("reportOrBlock", { name: targetName })}
        title={t("reportOrBlock", { name: targetName })}
      >
        <Icon name={compact ? "more" : "flag"} size={16} />
        {!compact && t("reportOrBlockShort")}
      </button>
      {open && (
        <ReportDialog targetId={targetId} targetName={targetName} bookingId={bookingId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

export function ReportDialog({
  targetId,
  targetName,
  bookingId,
  onClose
}: {
  targetId: string;
  targetName: string;
  bookingId?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const alreadyBlocked = blockedIds().includes(targetId);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [block, setBlock] = useState(alreadyBlocked);
  const [done, setDone] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason) reportUser({ targetId, targetName, reason, note, bookingId });
    if (block && !alreadyBlocked) blockUser(targetId, targetName);
    if (!block && alreadyBlocked) unblockUser(targetId);
    setDone(reason ? t("reportSaved") : block ? t("blockedDone", { name: targetName }) : t("unblockedDone", { name: targetName }));
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="report-title" ref={dialogRef}>
        <h2 id="report-title">{t("reportTitle", { name: targetName })}</h2>
        {done ? (
          <>
            <p>{done}</p>
            <div className="dialog__actions">
              <button type="button" className="primary-button" onClick={onClose}>
                {t("close")}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="stack">
            <fieldset className="radio-list" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="field__label">{t("reportWhy")}</legend>
              {REASONS.map((r) => (
                <label key={r}>
                  <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} />
                  {t(`reason_${r}`)}
                </label>
              ))}
            </fieldset>
            <div className="field">
              <label className="field__label" htmlFor="report-note">
                {t("reportNote")}
              </label>
              <textarea
                id="report-note"
                className="field__input field__input--area"
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <label className="check-row">
              <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} />
              <span>{t("blockToo", { name: targetName })}</span>
            </label>
            <p className="field__hint">{t("blockExplain")}</p>
            {isBlockedBetween(getProfile().id, targetId) && !alreadyBlocked && (
              <p className="field__hint">{t("theyBlockedYou")}</p>
            )}
            <div className="dialog__actions">
              <button type="button" className="ghost-button" onClick={onClose}>
                {t("cancel")}
              </button>
              <button type="submit" className="primary-button" disabled={!reason && block === alreadyBlocked}>
                {reason ? t("sendReport") : block ? t("blockOnly") : t("unblock")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
