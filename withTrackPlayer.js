const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withTrackPlayer(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];
    
    let services = application.service || [];
    let hasService = false;
    
    for (let i = 0; i < services.length; i++) {
      if (services[i].$['android:name'] === 'com.doublesymmetry.trackplayer.module.MusicService') {
        services[i].$['android:exported'] = 'true';
        services[i].$['android:foregroundServiceType'] = 'mediaPlayback';
        hasService = true;
        break;
      }
    }
    
    if (!hasService) {
      services.push({
        $: {
          'android:name': 'com.doublesymmetry.trackplayer.module.MusicService',
          'android:exported': 'true',
          'android:foregroundServiceType': 'mediaPlayback',
        }
      });
    }
    
    application.service = services;
    return config;
  });
};
