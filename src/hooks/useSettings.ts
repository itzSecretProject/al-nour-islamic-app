import { useSettingsContext, ReminderSettings } from '../context/SettingsContext';

export type { ReminderSettings };

export const useSettings = () => {
  return useSettingsContext();
};
