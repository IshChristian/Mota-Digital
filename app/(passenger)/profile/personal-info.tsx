import { Alert } from "@/components/GlobalAlert";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import { usersApi } from "@/services/api";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";
import { FormButton, FormCard, FormField, FormRow } from "@/components/ui/Form";

export default function PersonalInfo() {
  const router = useRouter();
  const { user, refreshUser } = useAuth() as any;
  const t = useT();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setFirstName(user?.firstName || ""); setLastName(user?.lastName || ""); }, [user]);
  const changed = firstName.trim() !== (user?.firstName || "") || lastName.trim() !== (user?.lastName || "");
  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) return Alert.alert(t("pages.personal.required"), t("pages.personal.required_body"));
    setSaving(true);
    try {
      await usersApi.updateMe({ firstName: firstName.trim(), lastName: lastName.trim() });
      await refreshUser?.();
      Alert.alert(t("pages.personal.saved"), t("pages.personal.saved_body"));
    } catch (error: any) { Alert.alert(t("pages.personal.save_failed"), error?.response?.data?.message || t("pages.personal.try_again")); }
    finally { setSaving(false); }
  };
  return <PassengerSettingsScreen title={t("pages.personal.title")} subtitle={t("pages.personal.subtitle")}>
    <FormCard title={t("pages.personal.name_title")} icon="user" description={t("pages.personal.name_desc")}>
      <FormRow>
        <FormField label={t("pages.personal.first")} value={firstName} onChangeText={setFirstName} placeholder={t("pages.personal.first")} autoComplete="given-name" />
        <FormField label={t("pages.personal.last")} value={lastName} onChangeText={setLastName} placeholder={t("pages.personal.last")} autoComplete="family-name" />
      </FormRow>
      <FormButton label={saving ? t("pages.personal.saving") : t("pages.personal.save")} icon="check" loading={saving} disabled={!changed} onPress={save} />
    </FormCard>
    <FormCard title={t("pages.personal.contact_title")} icon="phone" description={t("pages.personal.contact_desc")}>
      <FormRow>
        <FormField label={t("pages.personal.phone")} value={user?.phone} readOnly />
        {user?.email ? <FormField label={t("pages.personal.email")} value={user.email} readOnly hint={user?.isEmailVerified ? t("pages.personal.verified") : t("pages.personal.not_verified")} /> : null}
      </FormRow>
      <FormButton label={t("pages.personal.change_phone")} icon="shield" variant="outline" onPress={() => router.push("/contact-security" as any)} />
    </FormCard>
  </PassengerSettingsScreen>;
}
