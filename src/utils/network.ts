import NetInfo, { useNetInfo } from "@react-native-community/netinfo";

export { NetInfo, useNetInfo };

export async function checkNetworkConnected(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}
