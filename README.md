## interpolate-loader-options-webpack-plugin

Webpack plugin to interpolate strings within loader options.</br>

### Install
```
npm install --save-dev interpolate-loader-options-webpack-plugin
```

### Usage
Once installed, can be used in your webpack configuration file
```javascript
const InterpolateLoaderOptionsPlugin = require('interpolate-loader-options-webpack-plugin');

module.exports = {
  ...
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
        {
          loader: 'my-loader',
           options: {
             value: 123,
             interpolated: '[name]'
             nested: {
               arrays:[
                 {
                   value:'sdff'
                 },
                 {
                   value: '[path]'
                 }
               ]
             }
           }
         }
        ]
      }
    ]
  }
  plugins: [
    ...
    new InterpolateLoaderOptionsPlugin({
      // Optional Array<Object>
      loaders: [{
        // Required String
        name: 'my-loader',

        // Optional Array<String>
        include: ['nested.arrays.1.value']
      }]
    })
  ]
};
```


#### options
##### loaders `Array<Object>`
This property is optional.</br>
Defines an array of loader configurations on how to interpolate each loader.</br>
Each loader configuration **must** have a `name` that corresponds to a name of a loader.</br>
Each loader configuration **can** have an `include` array of property paths within the `options` that need to be interpolated.
