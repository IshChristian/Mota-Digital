import { Redirect } from "expo-router";

// The root layout restores and validates the saved session before this route renders.
// Its role guard sends returning users to their home screen.
export default function Entry() {
  return <Redirect href="/(auth)/welcome" />;
}
