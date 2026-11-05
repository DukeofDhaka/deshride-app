import type { TravelPrefs } from "../types";
import { useTranslation } from "../i18n";
import { Icon } from "./Icons";

export function PrefIcons({ prefs }: { prefs: TravelPrefs }) {
  const { t } = useTranslation();
  const chatKey = prefs.chat === "quiet" ? "prefQuiet" : prefs.chat === "chatty" ? "prefChatty" : "prefSomeChat";
  return (
    <ul className="pref-list">
      <li>
        <Icon name="chat" size={16} />
        {t(chatKey)}
      </li>
      <li className={prefs.music ? "" : "pref-list__off"}>
        <Icon name="music" size={16} />
        {t(prefs.music ? "prefMusicYes" : "prefMusicNo")}
      </li>
      <li className={prefs.ac ? "" : "pref-list__off"}>
        <Icon name="snow" size={16} />
        {t(prefs.ac ? "prefAcYes" : "prefAcNo")}
      </li>
      <li className={prefs.pets ? "" : "pref-list__off"}>
        <Icon name="paw" size={16} />
        {t(prefs.pets ? "prefPetsYes" : "prefPetsNo")}
      </li>
    </ul>
  );
}
