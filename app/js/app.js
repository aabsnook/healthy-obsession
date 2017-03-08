/**
    Function to translate - mostly just consults localizationStrings,
    but will return str if English is passed in
    @param {string} str - String to translate
    @param {string} language - Language to translate to
    @return {string} the translated string
*/
function getLocalizedString(str, language) {
    let trim = str.trim();
    let local;
    if (language === 'English' || trim === '') {
        return str;
    }
    local = localizationStrings[trim][language];
    if (local) {
        return local;
    } else {
        throw new Exception('Language ' + languageList[language]
                            + ' isn\'t supported yet.');
    }
}

/*
    This allows me to develop a general framework while
*/
let levelListStrings = [
    ['', 'text'],
    ['', 'text'],           // TRANSLATION_LEVEL
    ['', 'number'],         // BOOK LEVEL
    ['Chapter ', 'number'],  // CHAPTER_LEVEL
];

/*
    The set of regexes to use for the search bar.
    Captures the part you need to use, so use [1] on result.
*/
let levelMatchingRegexes = [
    [/\(([A-Z]+)\)/i, /\([A-Z]+\)/ig],                        // translation
    [/((?:[0-9]\s)?[A-Z|\s]+)/i, /(?:[0-9]\s)?[A-Z|\s]+/ig],  // book
    [/([0-9]+)/, /[0-9]+/g],                                  // chapter
];

let errorTexts = {
    '0': ': I didn\'t recognize this as a translation you own.', // translation
    '1': ': I didn\'t recognize this as a book in the Bible.',   // book
    '2': ': I didn\'t recognize this as a valid chapter number.', // chapter
    'ALREADY_THERE': 'You seem to already be there.',
    'COULD_NOT_PARSE': ': I did not know what to do with this.',
};

// placeholder
let setLanguage = 'English';

/*
    Where we store localized strings for stuff
    Currently pretty bare-bones, but want to make it easy later
*/
let localizationStrings = {
    'Chapter': ['Chapter'],
};

/**
    Uses the JSON retrieved to start a tree at the specified node
        with all given data given read in.
    Objects become children, others are attached as-is
    If numChildren is part of the JSON, will use that
        -otherwise, counts number of object children and uses that
    We consider the object "loaded" if it either has a content field
        or has object children.
        Otherwise, this is just a pre-load, and load() will be called
        on the tree node if it's navigated to.
    (The database can specify that isLoaded is true if it would like.)
    @param {object} treeNode - the node to start the tree at
    @param {object} data - the read-in data from the JSON
*/
function createTreeAt(treeNode, data) {
    treeNode.children = {};
    let numChildren = 0;
    if (typeof data !== 'object') {
        console.log(`Uh oh. ${data} of type ${typeof data}
            is being passed to getTreeAt.`);
        return;
    }
    $.each(data, function(key, val) {
        if (typeof val !== 'object') {
            treeNode[key] = val;
        } else {
            let child = new TreeNode((val.title || key), treeNode);
            treeNode.children[key] = child;
            createTreeAt(child, val);
            numChildren++;
        }
    });
    treeNode.numChildren = treeNode.numChildren || numChildren;

    if (treeNode.hasOwnProperty('content') || numChildren > 0) {
        if (typeof treeNode.loadDeferred === 'object') {
            treeNode.loadDeferred.resolve();
        } else {
            treeNode.loadDeferred = true;
        }
    }
}

(function() {
    let app = angular.module('memorize', []);

    app.controller('NavController', ['$http', '$q', function($http, $q) {
        let controller = this;
        this.searchText = '';
        this.root = new TreeNode('Change Translation', null);
        this.loading = true;

        /**
            this._loadChild
            Begins loading the node specified by text on the current node,
                and returns a deferred object that will resolve
                once this progress has BEGUN (it will once the current
                node loads, or immediately if the current node is loaded)
            @param {treeNode} current - the node to load from
            @param {string} text - the name of the child to start loading
            @return {deferred} Will resolve once current is fully loaded.
                Will resolve with node of child navigated to
                If once current is loaded, no child with text is loaded,
                deferred object rejects.
        */
        this._loadChild = function(current, text) {
            // Push onto the nav stack, independent of level
            let deferred = $q.defer();
            // let controller = this;

            text = text.toLowerCase();

            current.loadDeferred.promise.then(
                function() {
                    if (current.children.hasOwnProperty(text)) {
                        if (!current.children[text].loadDeferred) {
                            controller.load(current.children[text]);
                        }

                        deferred.resolve(current.children[text]);
                    } else {
                        deferred.reject(text + " isn't a child of " + current.title);
                    }
                },
                function(error) {
                    deferred.reject(error);
                }
            );

            return deferred;
        };

        this.go = function() {
            let str = this.searchText.trim();
            let deferred = $q.defer();
            let controller = this;

            if (str === '') {
                deferred.resolve(this.navSpot);
                return deferred;
            }
            let navObject = this.getGoNavObject(str, this.navSpot);
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
                        controller.errorText = errorTexts['ALREADY_THERE'];
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
            NavController.getGoNavObject
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
        this.getGoNavObject = function(str, treeNode = this.navSpot, level = 0) {
            let match = str.match(levelMatchingRegexes[level][0]);
            if (!match) {
                if (treeNode.level < level) {
                    return {
                        'error': str + errorTexts['COULD_NOT_PARSE'],
                    };
                }
                return this.getGoNavObject(str, treeNode, level+1);
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
        */
        this._getGoNavObjectHelp = function(str, level, errorObject) {
            if (str === '') {
                return true;
            }
            let match = str.match(levelMatchingRegexes[level][0]);
            if (!match) {
                errorObject.text = str + errorTexts[level];
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
            NavController.navigate:
            Governs hierarchical navigation to a node that may
                not exist yet in memory.
            Side effects: will change this.navSpot into its target
                on successful promise resolution
            @param {navObject} navObject - parsed place to go
            @return {deferred} Deferred object for the data load
        */
        this._navigate = function(navObject) {
            let deferred = $q.defer();
            let controller = this;

            this._navigateHelp(navObject.root, navObject.destinations).promise.then(
                function( newNode ) {
                    controller.navSpot = newNode;
                    deferred.resolve(newNode);
                },
                function( error ) {
                    deferred.reject(error);
                }
            );


            return deferred;
        };

        /**
            this._navigateHelp
            A function that, given a node and a destinations object,
                will load all the specified nodes and return a promise
                that, when resolved, indicates the node to navigate to.
            @param {treeNode} treeNode - The treeNode to navigate from
            @param {destinations} destinations - The destinations
                object of navObject
            @return {deferred} A deferred that will resolve when the
                node to navigate to indicated by destinations
                STARTS TO load and so can be navigated to.
                See the navObject description for details.
                Note that if destinations has no true destination,
                this deferred won't ever resolve or reject (barring error),
                and if it has multiple any one may be returned.
        */
        this._navigateHelp = function(treeNode, destinations) {
            let deferred = $q.defer();
            let controller = this;

            $.each(destinations, function(key, val) {
               controller._loadChild(treeNode, key).promise.then(
                    function(child) {
                        if (typeof val === 'object') {
                            controller._navigateHelp(child, val).promise.then(
                                function(result) {
                                    deferred.resolve(result);
                                },
                                function(reason) {
                                    deferred.reject(reason);
                                }
                            );
                        } else if (val) {
                            deferred.resolve(child);
                        }
                    },
                    function(reason) {
                        deferred.reject(reason);
                    }
               );
            });

            return deferred;

/*            this._navigateDown()

            // Base cases
            if (str === '') {
                deferred.resolve(treeNode);
                return deferred;
            }
            if (treeNode.level > levelMatchingRegexes.length) {
                this.errorText = str + errorTexts['COULD_NOT_PARSE'];
                deferred.reject();
                return deferred;
            }


            if (!match) {
                if (this.navSpot.level > treeNode.level) {
                    // Follow this.navSpot's trail here, using the title
                    this._recurseAndHandle(str, treeNode, deferred,
                            this.navSpot.ancestry[treeNode.level].title);
                } else {
                    this.errorText = str + errorTexts[treeNode.level];
                    deferred.reject();
                }
            } else {

                this._recurseAndHandle(str, treeNode, deferred, match);
            }

            return deferred;*/
        };

        /**
            this._recurseAndHandle
            Factoring out the recursive call, which is a bit of a mouthful
                with all the deferreds and pieces floating around.
            @param {string} str - The string to parse
            @param {treeNode} treeNode - The node to recurse on
            @param {deferred} deferred - The deferred to resolve or reject
            @param {string} match - The term to search on treeNode
        */
      /*  this._recurseAndHandle = function(str, treeNode, deferred, match) {
            // let controller = this;
            this.navigateDown(match, treeNode).promise.then(
                function(childResult) {
                    controller._navigateHelp(str, childResult).promise.then(
                        function(finalResult) {
                            deferred.resolve(finalResult);
                        },
                        function() {
                            controller.errorText = match +
                                errorTexts[treeNode.level];
                            deferred.reject();
                        }
                    );
                }
            );
        };*/

        /**
            NavController.navigateOut:
            This function will move this.navSpot directly to specified node.
            (The node actually has to exist in memory.)
            @param {treeNode} treeNode - The treeNode to go from
            @param {number} level - level to go back to
            @return {treeNode} - the node navigated to
        */
        this.navigateDirect = function(treeNode) {
            this.navSpot = treeNode;
        };

        /**
            NavController.getLocationTag:
            This function will get the strings to put in the buttons
            @param {treeNode} treeNode - the node to get the string for
            @return {string} The string to display
        */
        this.getLocationTag = function(treeNode) {
            let ret;
            let localPrefix = getLocalizedString(
                levelListStrings[treeNode.level][0],
                setLanguage
            );
            if (localPrefix !== '') {
               ret = (localPrefix + ' ' + treeNode.title);
            } else {
               ret = treeNode.title;
            }
            return ret;
       };

       /**
            NavController.load:
            Loads a treeNode based on the data we have for it
            Specifically, populates its deferred object
            @param {treeNode} treeNode - the node to get data for
            @return {deferred} The deferred created for the treeNode
                which can also be found via treeNode.loadDeferred
       */
        this.load = function(treeNode) {
            treeNode.loadDeferred = $q.defer();
            $http.get(treeNode.getFilePath()).then(
                function( result ) {
                    // construct our version of this object
                    createTreeAt(treeNode, result.data);
                    treeNode.loadDeferred.resolve();
                },
                function(error, errorText) {
                    treeNode.loadDeferred.reject(errorText);
                    console.log(errorText);
                }
            );
            return treeNode.loadDeferred;
        };

        this.load(this.root);
        this._loadChild(this.root, 'ESV').promise.then(
            function(result) {
                controller.navSpot = result;
                controller.load(result).promise.then(
                    function() {
                        controller.loading = false;
                    },
                    function() {
                        console.errorText = 'Uh oh. Initial load fail.';
                    }
                );
            },
            function(result) {
                controller.errorText = 'Uh oh. Initial load fail.';
            }
        );
    }]);
})();


/**
    The TreeNode class.
    Used to represent a node in a hierarchical view of the tower.
    (For now - may rename this to node.)-
*/
class TreeNode {

    /**
        TreeNode's constructor;
        The title, parent, and level are things we need and should know.
        @param {string} title - The title of this node; displayed to end users
        @param {treeNode} treeNode - This node's parent;
    */
    constructor(title, parent) {
        this.title = title;
        if (parent) {
            this.ancestry = parent.ancestry.slice();
            this.ancestry.push(this);
        } else {
            this.ancestry = [this];
        }
        this.level = (parent ? parent.level+1 : 0);
    };

    /**
        TreeNode.getFilePath
        @return {string} the appropriate file path for loading this node
        Note that this should be converted to a database query later
    */
    getFilePath() {
        if (this.level === 0) {
            return 'json/translations.json';
        }
        if (this.level === 1) {
            return 'json/bookData.json';
        }
        return `json/${this._filePathHelp()}.json`;
    };

    /**
        TreeNode._filePathHelp
        @return {string} the list of titles to go through so far
    */
    _filePathHelp() {
        if (this.level === 1) {
            return this.title.toLowerCase();
        } else {
            return this.parent()._filePathHelp() + '/' + this.title.toLowerCase();
        }
    };

    /**
        TreeNode.parent()
        @return {treeNode} the parent of this node
    */
    parent() {
        if (!this.ancestry || this.ancestry.length < 2) {
            console.log('parent() called on object that doesn\'t have one.');
            return null;
        }
        return this.ancestry[this.ancestry.length-2];
    };
}

/* Unit.prototype = {

    getNextUnit : function() {
        var thisChapter = this.parent;
        if ((+this.title) < thisChapter.numChildren) {
            return thisChapter.children[(+this.title)+1 + ""];
        }
        else if ((+thisChapter.title) < thisChapter.parent.numChildren) {
            return thisChapter.parent.children[(+thisChapter.title)+1]
                .children["1"];
        }
        return null;
    },

    getPreviousUnit : function() {
        var thisChapter = this.parent;
        if ((+this.title) > 1) {
            return thisChapter.children[(+this.title)-1 + ""];
        }
        else if ((+thisChapter.title) > 1) {
            return thisChapter.parent.children[(+thisChapter.title)-1]
                .children[thisChapter.numChildren + ""];
        }
        return null;
    }
}; */
