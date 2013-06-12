describe('stacked map', function () {

  var stackedMap;

  beforeEach(module('ui.bootstrap.modal2'));
  beforeEach(inject(function ($$stackedMap) {
    stackedMap = $$stackedMap.createNew();
  }));

  it('should add and remove objects by key', function () {

    stackedMap.add('foo', 'foo_value');
    expect(stackedMap.length()).toEqual(1);
    expect(stackedMap.get('foo')).toEqual('foo_value');

    stackedMap.remove('foo');
    expect(stackedMap.length()).toEqual(0);
    expect(stackedMap.get('foo')).toBeUndefined();
  });

  it('should get topmost element', function () {

    stackedMap.add('foo', 'foo_value');
    stackedMap.add('bar', 'bar_value');
    expect(stackedMap.length()).toEqual(2);

    expect(stackedMap.top()).toEqual('bar');
    expect(stackedMap.length()).toEqual(2);
  });

  it('should remove topmost element', function () {

    stackedMap.add('foo', 'foo_value');
    stackedMap.add('bar', 'bar_value');

    expect(stackedMap.removeTop()).toEqual('bar');
    expect(stackedMap.removeTop()).toEqual('foo');
  });

  it('should preserve semantic of an empty stackedMap', function () {

    expect(stackedMap.length()).toEqual(0);
    expect(stackedMap.top()).toBeUndefined();
  });

  //should replace exisitng one
  //removeTop
  //removeAll
  //top for empty stack


});