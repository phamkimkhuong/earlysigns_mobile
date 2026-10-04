const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT || "production";
  const owner = process.env.EXPO_OWNER || config.owner || undefined;

  const isDev = variant === "development";

  let name = "EarlySigns";
  let bundleIdentifier = "net.earlysigns.app";
  let packageName = "net.earlysigns.app";
  let scheme = "earlysigns";

  if (isDev) {
    name = "EarlySigns (Dev)";
    bundleIdentifier = "net.earlysigns.app.dev";
    packageName = "net.earlysigns.app.dev";
    scheme = "earlysigns-dev";
  }

  const projectId =
    process.env.EAS_PROJECT_ID ||
    config.extra?.eas?.projectId;

  const fbAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
  const fbClientToken = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN;

  let plugins = config.plugins ? [...config.plugins] : [];
  if (!plugins.includes("expo-font")) {
    plugins.unshift("expo-font");
  }
  if (fbAppId || fbClientToken) {
    plugins = plugins.map((plugin) => {
      if (Array.isArray(plugin) && plugin[0] === "react-native-fbsdk-next") {
        return [
          "react-native-fbsdk-next",
          {
            ...plugin[1],
            ...(fbAppId ? { appID: fbAppId, scheme: `fb${fbAppId}` } : {}),
            ...(fbClientToken ? { clientToken: fbClientToken } : {}),
          },
        ];
      }
      return plugin;
    });
  }

  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ||
    (fs.existsSync(path.resolve(__dirname, "google-services.json"))
      ? "./google-services.json"
      : (fs.existsSync(path.resolve(__dirname, "google-service", "google-services.json"))
        ? "./google-service/google-services.json"
        : undefined));

  return {
    ...config,
    ...(owner ? { owner } : {}),
    name,
    scheme,
    plugins,
    updates: {
      url: `https://u.expo.dev/${projectId}`,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    ios: {
      ...config.ios,
      bundleIdentifier,
      usesAppleSignIn: true,
    },
    android: {
      ...config.android,
      package: packageName,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    extra: {
      ...config.extra,
      appVariant: variant,
      ...(fbAppId ? { facebookAppId: fbAppId } : {}),
      ...(fbClientToken ? { facebookClientToken: fbClientToken } : {}),
      eas: {
        ...(config.extra?.eas || {}),
        projectId,
      },
    },
  };
};
