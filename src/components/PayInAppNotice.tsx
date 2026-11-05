import { useTranslation } from "../i18n";
import { Icon } from "./Icons";

// DeshRide's refunds, no-show cover and dispute help only apply to fares
// paid through the app, so this reminder sits wherever money is discussed.
export function PayInAppNotice({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <p className={`pay-notice${compact ? " pay-notice--compact" : ""}`} role="note">
      <Icon name="wallet" size={compact ? 14 : 18} />
      <span>{t(compact ? "payInAppShort" : "payInAppNotice")}</span>
    </p>
  );
}
