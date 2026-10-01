const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT || "production";
  const owner = process.env.EXPO_OWNER || config.owner || undefined;

  const isDev = variant === "development";

  let name = "EarlySigns";
  let bundleIdentifier = "net.earlysigns.android";
  let packageName = "net.earlysigns.android";
  let scheme = "earlysigns";

  if (isDev) {
    name = "EarlySigns (Dev)";
    bundleIdentifier = "net.earlysigns.android.dev";
    packageName = "net.earlysigns.android.dev";
    scheme = "earlysigns-dev";
  }

  const projectId =
    process.env.EAS_PROJECT_ID ||
    config.extra?.eas?.projectId;

  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ||
    (fs.existsSync(path.resolve(__dirname, "google-services.json"))
      ? "./google-services.json"
      : undefined);

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
      ...(googleServicesFile ? { googleServicesFile } : {}),
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
