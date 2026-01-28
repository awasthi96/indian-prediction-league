import { Redirect } from "expo-router";

export default function Index() {
  // If we are here, it means _layout.tsx verified the token is valid.
  // So we immediately forward the user to the main matches screen.
  return <Redirect href="/(tabs)" />;
}