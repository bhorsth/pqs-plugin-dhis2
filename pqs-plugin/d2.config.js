/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    name: 'pqs-plugin',
    type: 'app',
    pluginType: 'CAPTURE',

    entryPoints: {
        app: './src/App.jsx',
        plugin: './src/Plugin.tsx'
    },

    viteConfigExtensions: {
        server: {
            proxy: {
                '/api': {
                    target: 'http://localhost:8080',
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
    },

    direction: 'auto',
}

module.exports = config
