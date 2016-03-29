/**
 * Helper to create new views in the templates
 */

var _ = require('underscore'),
    getProperty = require('../../lib/getProperty'),
    BaseView;

module.exports = function (Handlebars) {
  return function (viewName, options) {
    var isServer = typeof window === 'undefined',
        html, viewOptions, view, app;

    viewOptions = options.hash || {};
    app = getProperty('_app', this, options);

    _.forEach(_.omit(viewOptions, 'templateName'), function(value, key) {
      if (
        key.match(/[A-Z]/g) &&
        !app.modelUtils.isModel(value) &&
        !app.modelUtils.isCollection(value)
      ) {
        throw new Error(
          'View option keys are case-insensitive, use all-lowercase keys to avoid bugs: "' + key + '"'
        );
      }
    });

    // Pass through a reference to the app.
    if (app) {
      viewOptions.app = app;
      viewName = app.modelUtils.underscorize(viewName);
    } else{
      throw new Error("An App instance is required when rendering a view, it could not be extracted from the options.")
    }

    // allow views to be passed optional block elements
    if (_.isFunction(options.fn)) {
      var blockOptions = _.extend({}, this, viewOptions);
      viewOptions._block = options.fn(blockOptions);
    }

    if (isServer) {
      var parentView = getProperty('_view', this, options);
      html = getServerHtml(viewName, viewOptions, parentView);
    } else {
      html = getClientPlaceholder(viewName, viewOptions, Handlebars);
    }

    return new Handlebars.SafeString(html);
  };
};

function getServerHtml(viewName, viewOptions, parentView) {
  var ViewClass, view;

  if (!BaseView) { BaseView = require('rendr/shared/base/view'); }

  // Pass through a reference to the parent view.
  if (parentView) { viewOptions.parentView = parentView; }

  // get the Backbone.View based on viewName
  ViewClass = BaseView.getView(viewName, viewOptions.app.options.entryPath);
  view = new ViewClass(viewOptions);

  // create the outerHTML using className, tagName
  return view.getHtml();
}

function getClientPlaceholder(viewName, viewOptions, Handlebars) {
  if (!BaseView) { BaseView = require('rendr/shared/base/view'); }
  var fetchSummary;

  // Builds a fetch_summary attribute
  viewOptions = BaseView.parseModelAndCollection(viewOptions.app.modelUtils, viewOptions);
  fetchSummary = BaseView.extractFetchSummary(viewOptions.app.modelUtils, viewOptions);
  viewOptions['fetch_summary'] = fetchSummary
  viewOptions = _.omit(viewOptions, _.keys(fetchSummary).concat(['model', 'collection', 'app']));

  // create a list of data attributes
  var attrString = _.inject(viewOptions, function(memo, value, key) {
    if (_.isArray(value) || _.isObject(value)) {
      if (key === '_block' && value instanceof Handlebars.SafeString) {
        value = value.string;
      } else {
        value = JSON.stringify(value);
      }
    }
    return memo += " data-" + key + "=\"" + _.escape(value) + "\"";
  }, '');

  return '<div data-render="true"' + attrString +' data-view="'+ viewName +'"></div>';
}
