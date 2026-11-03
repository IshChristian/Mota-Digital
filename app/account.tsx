import { Alert } from "@/components/GlobalAlert";
import { useState } from "react";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";
import { FormButton, FormCard, FormField } from "@/components/ui/Form";
import { usersApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { saveTextFile } from "@/utils/share";
import { useT } from "@/context/I18nContext";

export default function AccountScreen() {
  const { logout } = useAuth();
  const t = useT();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const exportData = async () => {
    setBusy("export");
    try {
      const r = await usersApi.exportMyData();
      await saveTextFile(`mota-account-data-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(r.data, null, 2), "My MOTA data");
    } catch (e: any) {
      Alert.alert(t("pages.data.export_failed"), e?.response?.data?.message || t("pages.personal.try_again"));
    } finally {
      setBusy(null);
    }
  };
  const remove = () =>
    Alert.alert(t("pages.data.delete_title"), t("pages.data.delete_confirm_body"), [
      { text: t("pages.picker.cancel"), style: "cancel" },
      {
        text: t("pages.data.delete_action"),
        style: "destructive",
        onPress: async () => {
          setBusy("delete");
          try {
            await usersApi.deleteAccount(password);
            await logout();
          } catch (e: any) {
            Alert.alert(t("pages.data.delete_failed"), e?.response?.data?.message || t("pages.personal.try_again"));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  return (
    <PassengerSettingsScreen title={t("pages.data.title")} subtitle={t("pages.data.subtitle")}>
      <FormCard title={t("pages.data.download_title")} icon="download" description={t("pages.data.download_desc")}>
        <FormButton label={t("pages.data.export")} icon="download" variant="outline" loading={busy === "export"} disabled={busy !== null} onPress={exportData} />
      </FormCard>
      <FormCard tone="danger" title={t("pages.data.delete_title")} icon="alert-triangle" description={t("pages.data.delete_desc")}>
        <FormField label={t("pages.data.confirm_password")} secureTextEntry value={password} onChangeText={setPassword} placeholder={t("pages.data.password")} autoComplete="current-password" />
        <FormButton label={t("pages.data.delete_button")} icon="trash-2" variant="danger" loading={busy === "delete"} disabled={!password || busy !== null} onPress={remove} />
      </FormCard>
    </PassengerSettingsScreen>
  );
}
