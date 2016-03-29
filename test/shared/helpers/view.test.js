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

function ModelClass() {}

function CollectionClass() {}

describe('view', function () {
  var app = memo().is(function () {
        return {
          options: { entryPath: '/path' },
          modelUtils: {
            underscorize: function (name) { return name; },
            isModel: function(model) { return model instanceof ModelClass },
            isCollection: function(collection) { return collection instanceof CollectionClass }
          }
        };
      });

  context('has a block', function () {
    it('will pass the correct options to for a block', function () {
      var stub = sinon.stub().returns('<div>test</div>');

      var result = subject.call({
        _app: app()
      }, 'test', { fn: stub });

      expect(stub).to.have.been.called;
      expect(stub.firstCall.args[0]).to.have.ownProperty('_app');
    });
  })

  context('server-side', function () {
    before(function () {
      global.window = undefined;
    });

    it('should error if there is no app in the options', function () {
      expect(function () {
        subject('test');
      }).to.throw(Error);
    });

    it("returns the result of the view instance's getHtml method", function() {
      var result = subject.call({
        _app: app()
      }, 'test', {});

      expect(result.string).to.eq('<p>Foo</p>');
    });
  });

  context('client-side', function () {
    before(function () {
      global.window = true;
    });

    after(function () {
      global.window = undefined;
    });

    context('when extractFetchSummary returns an empty object', function () {
      it('creates a string with data-render set to true', function () {
        var result = subject.call({
          _app: app()
        }, 'test', {});

        expect(result.string).to.eq(
          '<div data-render="true" data-fetch_summary="{}" data-view="test"></div>'
        )
      });
    });

    context('when extractFetchSummary returns a model', function () {
      BaseViewStub.extractFetchSummary.is(function () {
        return {
          some_model: {
            model: 'ModelClass',
            id: 1
          }
        };
      });

      it('includes the fetch summary for the model and does not include a data-attribute for the model', function () {
        var result = subject.call({
          _app: app()
        }, 'test', {
          hash: {
            some_model: new ModelClass()
          }
        });
        expect(result.string).to.eq(
          '<div data-render="true" data-fetch_summary="{&quot;some_model&quot;:{&quot;model&quot;:&quot;ModelClass&quot;,&quot;id&quot;:1}}" data-view="test"></div>'
        )
      });
    });

    context('when extractFetchSummary returns a collection', function () {
      BaseViewStub.extractFetchSummary.is(function () {
        return {
          some_collection: {
            collection: 'CollectionClass',
            id: 1
          }
        };
      });

      it('includes the fetch summary for the collection and does not include a data-attribute for the collection', function () {
        var result = subject.call({
          _app: app()
        }, 'test', {
          hash: {
            some_collection: new CollectionClass()
          }
        });
        expect(result.string).to.eq(
          '<div data-render="true" data-fetch_summary="{&quot;some_collection&quot;:{&quot;collection&quot;:&quot;CollectionClass&quot;,&quot;id&quot;:1}}" data-view="test"></div>'
        )
      });
    });

    context('when the viewOptions contain arrays', function () {
      it('serializes the arrays correctly', function () {
        var result = subject.call({
          _app: app()
        }, 'test', {
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

    context('when the viewOptions contains an object', function () {
      it('serializes the object correctly', function () {
        var result = subject.call({
          _app: app()
        }, 'test', {
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

      context('when the key is _block and is of type Handlebars.SafeString', function () {
        it('extracts the string correctly', function () {
          var html = '<div>something</div>',
            result = subject.call({
            _app: app()
          }, 'test', {
            hash: {
              _block: new Handlebars.SafeString(html)
            }
          });
          expect(result.string).to.eq(
            '<div data-render="true" data-_block="&lt;div&gt;something&lt;/div&gt;" data-fetch_summary="{}" data-view="test"></div>'
          );
        });
      });
    });

    context('when the viewOptions contains camelCased keys', function() {
      context('when the key is templateName', function() {
        it('does not throw an error', function() {
          expect(subject.bind({
            _app: app()
          }, 'test', {
            hash: { templateName: 'someTemplate' }
          })).to.not.throw(Error);
        });
      });

      context('when the value is a model', function() {
        it('does not throw an error', function() {
          expect(subject.bind({
            _app: app()
          }, 'test', {
            hash: { myModel: new ModelClass() }
          })).to.not.throw(Error);
        });
      });

      context('when the value is a collection', function() {
        it('does not throw an error', function() {
          expect(subject.bind({
            _app: app()
          }, 'test', {
            hash: { myCollection: new CollectionClass() }
          })).to.not.throw(Error);
        });
      });

      context('when the key is not templateName, and the value is not a model or a collection', function() {
        it('throws an error', function() {
          expect(subject.bind({
            _app: app()
          }, 'test', {
            hash: { camelCased: 'ohno' }
          })).to.throw(Error);
        });
      });
    });
  });
});
