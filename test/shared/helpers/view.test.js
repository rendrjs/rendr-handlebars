var Handlebars = require('handlebars').create(),
    memo = require('memo-is'),
    chai = require('chai'),
    sinon = require('sinon'),
    proxyquire = require('proxyquire').noCallThru(),
    expect = chai.expect,
    BaseViewStub = {
      getView: function (viewName, entryPath) {
        return ViewClass;
      },
      parseModelAndCollection: function (modelUtils, viewOptions) {
        return viewOptions;
      },
      extractFetchSummary: memo().is(function() {
        return {};
      })
    },
    subject = proxyquire('../../../shared/helpers/view', {
      'rendr/shared/base/view': BaseViewStub
    })(Handlebars);

function ViewClass() {}

ViewClass.prototype.getHtml = function () {
  return '<p>Foo</p>'
};

describe('view', function () {
  var app = memo().is(function () {
        return {
          options: { entryPath: '/path' },
          modelUtils: {
            underscorize: function (name) { return name }
          },
          toJSON: sinon.spy()
        };
      });

  context('server-side', function () {
    before(function () {
      GLOBAL.window = undefined;
    });

    it('should error if there is no app in the options', function () {
      expect(function () {
        subject('test');
      }).to.throw(Error);
    });

    it("returns the result of the view instance's getHtml method", function() {
      var result = subject('test', {
        data: { '_app': app() }
      });
      expect(result.string).to.eq('<p>Foo</p>');
    });
  });

  context('client-side', function () {
    before(function () {
      GLOBAL.window = true;
    });

    after(function () {
      GLOBAL.window = undefined;
    });

    context('when extractFetchSummary returns an empty object', function () {
      it('creates a string with data-render set to true', function () {
        var result = subject('test', {
          data: {'_app': app() }
        });
        expect(result.string).to.eq(
          '<div data-render="true" data-fetch_summary="{}" data-view="test"></div>'
        )
      });
    });

    context('when extractFetchSummary returns a model', function () {
      BaseViewStub.extractFetchSummary.is(function () {
        return {
          model: {
            model: 'SomeModel',
            id: 1
          }
        };
      });

      it('includes the fetch summary for the model', function () {
        var result = subject('test', {
          data: { '_app': app() }
        });
        expect(result.string).to.eq(
          '<div data-render="true" data-fetch_summary="{&quot;model&quot;:{&quot;model&quot;:&quot;SomeModel&quot;,&quot;id&quot;:1}}" data-view="test"></div>'
        )
      });
    });

    context('when the viewOptions contain arrays', function () {
      it('serializes the arrays correctly', function () {
        var result = subject('test', {
          data: {
            '_app': app()
          },
          hash: {
            number_array: [1, 2, 3],
            string_array: ['foo', 'bar'],
            object_array: [{ foo: 'bar', foo: 'baz' }]
          }
        });
        expect(result.string).to.eq(
          '<div data-render="true" data-number_array="[1,2,3]" data-string_array="[&quot;foo&quot;,&quot;bar&quot;]" data-object_array="[{&quot;foo&quot;:&quot;baz&quot;}]" data-fetch_summary="{}" data-view="test"></div>'
        );
      });
    });

    context('when the viewOptions contains a model', function () {
      it('invokes the toJSON property', function () {
        var result = subject('test', {
          data: {
            '_app': app()
          },
          hash: { '_app': app() }
        });

        expect(app().toJSON).to.have.been.called
      });
    });

    context('when the viewOptions contains an object', function () {
      it('serializes the object correctly', function () {
        var result = subject('test', {
          data: {
            '_app': app()
          },
          hash: {
            generic_object: {
              a: 1,
              b: 2,
              c: 3
            }
          }
        });
        expect(result.string).to.eq(
          '<div data-render="true" data-generic_object="{&quot;a&quot;:1,&quot;b&quot;:2,&quot;c&quot;:3}" data-fetch_summary="{}" data-view="test"></div>'
        );
      });
    });
  });
});
