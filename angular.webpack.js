//Polyfill Node.js core modules in Webpack. This module is only needed for webpack 5+.
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

/**
 * Custom angular webpack configuration
 */
module.exports = (config, options) => {
    let isWebBuild = false;

    if (options.fileReplacements) {
        for(let fileReplacement of options.fileReplacements) {
            if (fileReplacement.replace !== 'src/environments/environment.ts') {
                continue;
            }

            let fileReplacementParts = fileReplacement['with'].split('.');
            if (fileReplacementParts.length > 1 && ['web'].indexOf(fileReplacementParts[1]) >= 0) {
                isWebBuild = true;
            }
            break;
        }
    }

    if (options && typeof options.configuration === 'string') {
        isWebBuild = isWebBuild || options.configuration.includes('web');
    }

    config.target = isWebBuild ? 'web' : 'electron-renderer';

    if (!isWebBuild) {
        config.plugins = [
            ...config.plugins,
            new NodePolyfillPlugin({
                  excludeAliases: ["console"]
            })
        ];
    }

    // https://github.com/ryanclark/karma-webpack/issues/497
    config.output.globalObject = 'globalThis';

    return config;
}
