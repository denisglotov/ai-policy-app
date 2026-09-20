const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro watches and resolves files from the ai-policy submodule
config.watchFolders = [path.resolve(__dirname), path.resolve(__dirname, 'ai-policy')];

module.exports = config;
