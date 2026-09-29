module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT || "production";
  const owner = process.env.EXPO_OWNER || config.owner || undefined;

  const isDev = variant === "development";
  const isPreview = variant === "preview";

  let name = "EarlySigns";
  let bundleIdentifier = "net.earlysigns.app";
  let packageName = "net.earlysigns.app";
  let scheme = "earlysigns";

  if (isDev) {
    name = "EarlySigns (Dev)";
    bundleIdentifier = "net.earlysigns.app.dev";
    packageName = "net.earlysigns.app.dev";
    scheme = "earlysigns-dev";
  } else if (isPreview) {
    name = "EarlySigns (Prev)";
    bundleIdentifier = "net.earlysigns.app.preview";
    packageName = "net.earlysigns.app.preview";
    scheme = "earlysigns-preview";
  }

  const projectId =
    process.env.EAS_PROJECT_ID ||
    config.extra?.eas?.projectId;

  return {
    ...config,
    ...(owner ? { owner } : {}),
    name,
    scheme,
    updates: {
      url: `https://u.expo.dev/${projectId}`,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    ios: {
      ...config.ios,
      bundleIdentifier,
    },
    android: {
      ...config.android,
      package: packageName,
    },
    extra: {
      ...config.extra,
      appVariant: variant,
      eas: {
        ...(config.extra?.eas || {}),
        projectId,
      },
    },
  };
};
