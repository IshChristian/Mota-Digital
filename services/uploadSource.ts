import * as ImagePicker from "expo-image-picker";
import { Alert } from "@/components/GlobalAlert";
import { pickUploadDocument, MAX_UPLOAD_BYTES } from "./documentPicker";

export type PickedFile = { uri: string; name: string; mimeType?: string; size?: number };
type Source = "camera" | "photos" | "files";

const fromImageResult = (result: ImagePicker.ImagePickerResult, prefix: string): PickedFile | null => {
  if (result.canceled) return null;
  const a = result.assets?.[0];
  if (!a?.uri) return null;
  if (a.fileSize != null && a.fileSize > MAX_UPLOAD_BYTES) throw new Error("Choose a file smaller than 20 MB.");
  return { uri: a.uri, name: a.fileName || `${prefix}-${Date.now()}.jpg`, mimeType: a.mimeType || "image/jpeg", size: a.fileSize };
};

async function pickFrom(source: Source): Promise<PickedFile | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") throw new Error("Allow camera access in Settings to photograph your document.");
    return fromImageResult(await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 }), "document-photo");
  }
  if (source === "photos") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") throw new Error("Allow photo access in Settings to choose a document photo.");
    return fromImageResult(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 }), "document");
  }
  return pickUploadDocument();
}

/**
 * Asks where the file should come from (camera, photos or files) and returns it.
 * Resolves null when the user cancels. Errors (permissions, size) are thrown.
 */
export function chooseUploadFile(title = "Add document"): Promise<PickedFile | null> {
  return new Promise((resolve, reject) => {
    // Wait for the alert to finish closing: iOS won't present the system picker
    // while another modal is still animating out, and the tap would do nothing.
    const run = (source: Source) => { setTimeout(() => { pickFrom(source).then(resolve, reject); }, 450); };
    Alert.alert(title, "Take a clear photo of the document, or choose an existing photo or PDF.", [
      { text: "Take photo", onPress: () => run("camera") },
      { text: "Choose photo", onPress: () => run("photos") },
      { text: "Browse files", onPress: () => run("files") },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}
