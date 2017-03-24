(function () {
    angular.module("memApp.common")
        .controller("CommonController", function($scope, datatree) {
        $scope.datatree = datatree;
        $scope.datatree.init('ESV');
    });
})();
