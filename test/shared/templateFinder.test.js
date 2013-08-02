/**
 * We have to define the global `rendr`, which has an `entryPath` property.
 * This is a reminder that globals are *bad*.
 */
global.rendr = {
  entryPath: process.cwd() + '/test/fixtures'
};

var assert = require('assert')
  , templateAdapter = require('../../index');

describe('templateFinder', function() {
  describe('getTemplate', function() {
    it('should support the default pattern if none given', function() {
      assert.equal('function', typeof templateAdapter.getTemplate('my_test_template'));
      assert.equal('function', typeof templateAdapter.getTemplate('subdir/other_template'));
    });
    it('should support prepending to the templatePatterns to find templates in other files', function() {
      /**
       * Add the pattern for templates that should come from a different source file.
       */
      templateAdapter.templatePatterns.unshift({
        pattern: /^other_template_pattern\//,
        src: rendr.entryPath + '/app/templates/otherTemplates'
      });

      assert.equal('function', typeof templateAdapter.getTemplate('other_template_pattern/home_view'));
      assert.equal('function', typeof templateAdapter.getTemplate('other_template_pattern/subdir/nav_view'));
    });
  });
});
