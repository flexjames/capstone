var app = angular.module('YourAngularApp', []);

app.directive('aiPage', function() {
  return {
    transclude: true,
    restrict: 'EA',
    scope: {
      aiClass: '/css/row_a/style.css',
      aiPageTitle: '',
      aiPageMenuText: ''
    },
    template: ''
  };
});

app.directive('aiRow', function() {
  return {
    transclude: true,
    restrict: 'EA',
    scope: {
      inceptRowOrder: '@',
      inceptRowBgColor: '@',
      inceptRowBgImage: '@',
    },
    template: ''
  };
});

app.directive('aiCol', function() {
  return {
    transclude: true,
    restrict: 'E',
    scope: {
      inceptionColId: '@',
      inceptionColWidth: '@',
      inceptionRowId: '@',
      inceptionColOrderInRow: '@'
    },
    template: ''
  };
});