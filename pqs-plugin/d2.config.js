/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    name: 'pqs-plugin',
    type: 'app',
    pluginType: 'CAPTURE',

    entryPoints: {
        app: './src/App.jsx',
        plugin: './src/Plugin.tsx'
    },

    direction: 'auto',
}

module.exports = config
