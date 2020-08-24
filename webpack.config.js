const fs = require("fs");
const path = require("path");

const extensions = fs.readdirSync("./src/entries/");
const entry = Object.fromEntries(extensions.map(e => [e.substring(0, e.length - 3), `./src/entries/${e}`]));

module.exports = {
  target: "node",
  entry,
  resolve: {
    extensions: [".ts", ".js"],
  },
  mode: "production",
  output: {
    libraryTarget: "commonjs",
    path: path.join(__dirname, "build"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
};