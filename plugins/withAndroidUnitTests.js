const { withAppBuildGradle } = require('@expo/config-plugins');

const TEST_OPTIONS_BLOCK = [
  '    testOptions {',
  '        unitTests {',
  '            includeAndroidResources = true',
  '        }',
  '    }',
].join('\n');

const TEST_DEPENDENCIES_BLOCK = [
  '    testImplementation("androidx.test:core:1.6.1")',
  '    testImplementation("junit:junit:4.13.2")',
  '    testImplementation("org.robolectric:robolectric:4.14.1")',
].join('\n');

function replaceOnce(contents, searchValue, replacement, label) {
  if (!contents.includes(searchValue)) {
    throw new Error(`withAndroidUnitTests: failed to find ${label} anchor in android/app/build.gradle`);
  }

  return contents.replace(searchValue, replacement);
}

module.exports = function withAndroidUnitTests(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    let contents = config.modResults.contents;

    if (!contents.includes('includeAndroidResources = true')) {
      contents = replaceOnce(
        contents,
        '}\n\n// Apply static values from `gradle.properties` to the `android.packagingOptions`',
        `${TEST_OPTIONS_BLOCK}\n}\n\n// Apply static values from \`gradle.properties\` to the \`android.packagingOptions\``,
        'android testOptions',
      );
    }

    if (!contents.includes('testImplementation("junit:junit:4.13.2")')) {
      contents = replaceOnce(
        contents,
        '    } else {\n        implementation jscFlavor\n    }\n}',
        `    } else {\n        implementation jscFlavor\n    }\n\n${TEST_DEPENDENCIES_BLOCK}\n}`,
        'android test dependencies',
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
