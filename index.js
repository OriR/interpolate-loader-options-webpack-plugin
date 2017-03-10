const utils = require('loader-utils');
const cloneDeep = require('clone-deep');

function InterpolateLoaderOptionsPlugin({ loaders = []} = {}) {
  this.loaders = loaders;
  this.all = loaders.length === 0;
  this.patched = {};
}

InterpolateLoaderOptionsPlugin.prototype.apply = function(compiler) {
  const self = this;
  compiler.plugin("normal-module-factory", function(nmf) {
    nmf.plugin("after-resolve", function(data, next) {

      // Get all the loaders that were requested to be patched and that weren't patched already.
      const loadersToPatch = data.loaders.map(loader => typeof loader === 'string' ? loader : loader.loader)
      .filter((loaderPath) => {
        return self.all ||
              (self.loaders.reduce((wasFound, loader) => wasFound || loaderPath.indexOf(loader.name) > -1, false) &&
               !self.patched[loaderPath]);
      });

      loadersToPatch.forEach((loaderPath) => {

        // Since `require` is called only once per path and execution, this is the loader reference that will be used by webpack.
        const loader = require(loaderPath);

        const loaderOptions = self.loaders.find((loaderOptions) => loaderPath.indexOf(loaderOptions.name) > -1);

        // Patching the bind method of the loader as it will be called by webpack to switch context.
        loader.bind = (context, source, ...args) => {
          // Only patch properties specified by the options.
          const shouldPatchProperty = (hierarchy) => {
            return !loaderOptions.include || loaderOptions.include.length === 0 || loaderOptions.include.indexOf(hierarchy.substr(1)) > -1;
          };

          // Interpolating all the string values in the options object.
          function interpolatedOptions(options, context, source, hierarchy = '') {
            Object.keys(options).forEach((key) => {
              if (typeof options[key] === 'object') {
                interpolatedOptions(options[key], context, source, `${hierarchy}.${key}`);
              }
              else if (typeof options[key] === 'string' && shouldPatchProperty(`${hierarchy}.${key}`)) {
                options[key] = utils.interpolateName(context, options[key], { content: source });
              }
            });
            return options;
          }

          // Getting the options for the loader.
          const originalOptions = utils.getOptions ? utils.getOptions(context) : utils.parseQuery(context.query);
          const options = interpolatedOptions(cloneDeep(originalOptions) || {}, context, source);

          // query is not writeable so we're proxying the context and overriding instead of overwriting.
          const proxiedContext = new Proxy(context, {
            get(target, prop) {
              if (prop === 'options') {
                return options;
              }
              if (prop === 'query') {
                return `?${JSON.stringify(options)}`;
              }

              return target[prop];
            }
          });

          // Calling `bind` with the loader as `this` and the patched arguments to mimic the actual "bind"
          return Function.prototype.bind.call(loader, proxiedContext, source, ...args);
        };

        // In case webpack uses `call` for context switching
        loader.call = (context, ...args) => {
          return loader.bind(context, ...args)();
        };

        // In case webpack uses `apply` for context switching
        loader.apply = (context, args) => {
          return loader.bind(context, ...args)();
        };

        // Make sure we don't patch this loader again.
        self.patched[loaderPath] = true;
      });

      next(null, data);
    });
  });
};

module.exports = InterpolateLoaderOptionsPlugin;
