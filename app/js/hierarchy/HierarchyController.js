(function() {

    angular.module('hierarchy').controller('HierarchyController',
                ['$scope', function($scope) {
        /*
            I should probably handle this differently in the future.
        */
        this.levelListStrings = [
            ['', 'text'],
            ['', 'text'],           // TRANSLATION_LEVEL
            ['', 'number'],         // BOOK LEVEL
            ['Chapter ', 'number'],  // CHAPTER_LEVEL
        ];

        /*
            The set of regexes to use for the search bar.
            Captures the part you need to use, so use [1] on result.
        */
        this.levelMatchingRegexes = [
            [/\(([A-Z]+)\)/i, /\([A-Z]+\)/ig],                        // translation
            [/((?:[0-9]\s)?[A-Z|\s]+)/i, /(?:[0-9]\s)?[A-Z|\s]+/ig],  // book
            [/([0-9]+)/, /[0-9]+/g],                                  // chapter
        ];

        this.errorTexts = {
            '0': ': I didn\'t recognize this as a translation you own.', // translation
            '1': ': I didn\'t recognize this as a book in the Bible.',   // book
            '2': ': I didn\'t recognize this as a valid chapter number.', // chapter
            'ALREADY_THERE': 'You seem to already be there.',
            'COULD_NOT_PARSE': ': I did not know what to do with this.',
        };

        /**
            Hierarchy.go
            Main function for navigating when the user enters search text.
            @return {deferred} a deferred object that resolves when
            navigation is complete.
        */
        this.go = function() {
            let str = this.searchText.trim();
            let deferred = $q.defer();
            let controller = this;

            if (str === '') {
                deferred.resolve(this.navSpot);
                return deferred;
            }
            let navObject = this._getGoNavObject(str);
            if (navObject.error.text) {
                this.errorText = navObject.error.text;
                deferred.reject(navObject.error.text);
                return deferred;
            }

            this.searchText = '';
            this.errorText = '';
            this.loading = true;
            this._navigate(navObject).promise.then(
                function(newNode) {
                    if (newNode === this.navSpot) {
                        $scope.errorText = $scope.errorTexts['ALREADY_THERE']; //TODO: refer to parent scope!
                    }
                    deferred.resolve(newNode);
                    controller.loading = false;
                },
                function(error) {
                    deferred.reject(error);
                    controller.errorText = error;
                    controller.loading = false;
                }
            );

            return deferred;
        };

        /**
            Hierarchy._getGoNavObject
            Given a string representing a path
            (which may or may not be relative to current location)
            @param {string} str - The string to parse
            @param {treeNode} treeNode - The current location - if omitted,
                this.root is assumed
            @param {int} level - The level we're looking at - if omitted,
                0 is assumed
            @return a navObject that will be passed to navigate
            Structure of a navObject:
            {
                root: Node to start with (pointer - must be in memory)
                destinations: Object with a property for each string
                    to create a node with that title to load (and navigate to)
                    value of each property will be:
                        true if the loaded node is the endpoint to navigate to
                        false if the loaded node is an endpoint, but don't go
                        a destination object if this isn't an endpoint
            }
            This is the part of the recursion before we find the break.
        */
        this._getGoNavObject = function(str, treeNode = this.navSpot, level = 0) {
            let match = str.match(levelMatchingRegexes[level][0]);
            if (!match) {
                if (treeNode.level < level) {
                    return {
                        'error': str + $scope.errorTexts['COULD_NOT_PARSE'],
                    };
                }
                return this._getGoNavObject(str, treeNode, level+1);
            } else {
                str = str.replace(levelMatchingRegexes[level][1], '')
                    .trim();
                let errorObject = {};
                let ret = {
                    'root': treeNode.ancestry[level],
                    'destinations': {},
                    'error': errorObject,
                };
                ret.destinations[match[1].trim()] = this._getGoNavObjectHelp(str,
                                                level+1, errorObject);
                return ret;
            }
        };

        /**
            NavController._getGoNavObjectHelp
            Helper function that handles the case when we've already
                gotten one match, so navigating from there
            @param {string} str - The remaining part of the search string
            @param {int} level - The level to look at
            @param {object} errorObject - The parent error object to log to.
            @return {object} an object representing navigating to
                the node indicated by str, or an empty object if
                no such node is indicated.
        */
        this._getGoNavObjectHelp = function(str, level, errorObject) {
            if (str === '') {
                return true;
            }
            let match = str.match(levelMatchingRegexes[level][0]);
            if (!match) {
                errorObject.text = str + $scope.errorTexts[level];
                return {};
            } else {
                str = str.replace(levelMatchingRegexes[level][1], '')
                    .trim();
                let ret = {};
                ret[match[1].trim()] = this._getGoNavObjectHelp(str, level+1);
                return ret;
            }
        };

        /**
            NavController.getLocationTag:
            This function will get the strings to put in the buttons
            @param {treeNode} treeNode - the node to get the string for
            @return {string} The string to display
        */
        this.getLocationTag = function(treeNode) {
            let ret;
            let localPrefix = $scope.levelListStrings[treeNode.level][0];
            if (localPrefix !== '') {
               ret = (localPrefix + ' ' + treeNode.title);
            } else {
               ret = treeNode.title;
            }
            return ret;
       };
    }]);
});
