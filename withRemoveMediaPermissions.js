const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withRemoveMediaPermissions(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    const permissionsToRemove = [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE'
    ];

    if (!androidManifest['uses-permission']) {
      return config;
    }

    androidManifest['uses-permission'] = androidManifest['uses-permission'].map(
      (permission) => {
        if (permissionsToRemove.includes(permission.$['android:name'])) {
          permission.$['tools:node'] = 'remove';
        }
        return permission;
      }
    );

    // Ensure the tools namespace is added to the manifest tag
    if (!androidManifest.$['xmlns:tools']) {
      androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    return config;
  });
};
