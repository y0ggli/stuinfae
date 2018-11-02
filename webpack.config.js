const paths = require('path');

const ExtractTextPlugin = require('extract-text-webpack-plugin');


const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
    template: './src/index.html',
    filename: 'index.html',
    inject: 'body'
});

module.exports = {
    devtool: 'source-map',
    entry: ['./src/index.js', './src/style/styles.scss'],
    output: {
        path: paths.resolve(__dirname, './dist'),
        filename: 'index_bundle.js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: [/node_modules/],
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['es2015', 'stage-0']
                    },
                }
            },
            {
                test: /\.scss$/,
                use: ExtractTextPlugin.extract([
                    'css-loader', 'sass-loader'
                ])
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin({
            filename: 'styles.css',
            allChunks: true,
        }),
        HtmlWebpackPluginConfig,
        new CopyWebpackPlugin([
            {
                from: './data',
                to: './data'
            },
            {
                from: 'src/assets',
                to: './assets'
            }
        ])
    ]
};