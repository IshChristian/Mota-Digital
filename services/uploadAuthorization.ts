import { getStoredToken } from "./secureStorage";

export type UploadAuthorization = {
  cloudName: string;
  apiKey: string;
  signature: string;
  params: {
    timestamp: number;
    folder: string;
    public_id: string;
    overwrite: false;
  };
};
export async function getUploadAuthorization(
  signal: AbortSignal,
): Promise<UploadAuthorization> {
  const token = await getStoredToken();
  if (!token) throw new Error("Sign in to upload files.");
  const base = (
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    "https://mota-be-v1-0-0-1.onrender.com/api"
  ).replace(/\/+$/, "");
  const response = await fetch(`${base}/uploads/signature`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    signal,
  });
  let payload: any;
  try {
    payload = JSON.parse(await response.text());
  } catch {
    payload = null;
  }
  if (!response.ok) {
    if (response.status === 404)
      throw new Error(
        "The MOTA server needs the signed-upload update. Deploy the backend update and retry.",
      );
    throw new Error(
      payload?.message ||
        `Could not authorize upload (${response.status}). Please retry.`,
    );
  }
  const data = payload?.data;
  if (
    !data ||
    !/^[a-zA-Z0-9_-]+$/.test(data.cloudName || "") ||
    typeof data.apiKey !== "string" ||
    !data.apiKey ||
    !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(data.signature || "") ||
    !Number.isInteger(data.params?.timestamp) ||
    typeof data.params?.folder !== "string" ||
    typeof data.params?.public_id !== "string" ||
    !data.params.public_id ||
    data.params.overwrite !== false
  ) {
    throw new Error(
      "The server returned incomplete upload authorization. Please retry.",
    );
  }
  return data;
}
