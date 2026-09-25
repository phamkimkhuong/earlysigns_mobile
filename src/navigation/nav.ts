const TAB_SCREENS = new Set(["Home", "Profile"]);

export function navigateAfterLogin(
  navigation: any,
  nextRoute?: string,
  nextParams?: Record<string, any>
): void {
  if (!nextRoute || nextRoute === "Main" || TAB_SCREENS.has(nextRoute)) {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "Main",
          params:
            nextRoute && TAB_SCREENS.has(nextRoute)
              ? { screen: nextRoute, params: nextParams }
              : undefined,
        },
      ],
    });
    return;
  }
  navigation.reset({
    index: 1,
    routes: [{ name: "Main" }, { name: nextRoute, params: nextParams }],
  });
}

export function navigateToTab(
  navigation: any,
  screen: string,
  params?: Record<string, any>
): void {
  navigation.navigate("Main", { screen, params });
}
