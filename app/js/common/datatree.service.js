(function() {
    angular.module('memApp.common')
        .service('DataTree', ['NodeFactory', '$http', '$q', function(NodeFactory, $http, $q) {
        let root;
        let navSpot;
        let fileRoot, fileEnd;

        let tree = this;

        /*

        */
        class DataTreeNode extends Node {
            constructor(parent, key, title, properties, content) {
                super(parent, key, properties, content);
                this._title = title;
            }

            get title() {
                return this._title || this.key || "home";
            }

            set title(title) {
                this._title = title;
            }
        };

        /**
            These patterns probably want to depend on language, but the idea
            is that a pause in thought is punctuation(s) followed by a space;
            punctuation not followed by a space is generally not a change
            in thought, like "300,000", "Ben-Hadad", or "Jesus's", but
            "she thought that maybe, ...", "he found that - contrary to...",
            "'The fox jumped over the haystack.' ..." is.
            We also don't allow quotation marks to be the only punctuation
            since
            a) an end quote without punctuation probably isn't end of thought
            b) annoying cases like "Moses' things were very..."
            We also require a minimum of 30 characters before the punctuation
            if this is in the middle of a verse.
            We capture everything but the required whitespace afterward.
        */
        let bodyPattern = /(.+[:\.,?!-:;]+[:\.,?!"'-:;]*)(?:\s)+/;
        let suffixPattern = /(.+)[:\.,?!"'-:;]+/;

        this.init = function(startChild, fRoot, fEnd) {
            let deferred = $q.defer();

            root = NodeFactory.create();
            navSpot = root;
            fileRoot = fRoot;
            fileEnd = fEnd;

            this.load(root);
            _findChild(root, startChild).promise.then(
                function(result) {
                    navSpot = result;
                    tree.load(result).promise.then(
                        function() {
                            deferred.resolve(root);
                        },
                        function() {
                            deferred.reject('Uh oh. Initial load fail.');
                        }
                    );
                },
                function(result) {
                    deferred.reject('Uh oh. Initial load fail.');
                }
            );

            return deferred;
        };

        /**
            DataTree.setNavSpot
            Setter for navSpot
            @param {node} node - The value to set navSpot to
        */
        this.setNavSpot = function(node) {
            navSpot = node;
        };

        /**
            DataTree.getNavSpot
            Getter for navSpot
            @return {node} The value of navSpot
        */
        this.getNavSpot = function() {
            return navSpot;
        };

        /**
            DataTree.getRoot
            Getter for navSpot
            @return {node} The value of root
            Note that root should NOT change during the execution
                of this program - this could mess with asynchronous
                calls that depend on it as a reference point.
        */
        this.getRoot = function() {
            return root;
        }

        /**
            DataTree._getFilePath
            Returns a string representing
        */
        let _getFilePath = function(node) {
            if (node.getLevel() === 0) {
                return fileRoot + "home" + fileEnd;
            }
            return fileRoot + node.pathTo().join('/') + fileEnd;
        };

        /**
            DataTree._propertySet
            DataTree's wrapper for node property setting.
            We avoid name-clashing with a JSON-defined property
            by including in properties a DataTreeProperties object that
            contains all TreeNode-specific properties.
            @param {node} node - the node to add the property to
            @param {key} key - the key to add
            @param {object} value - the value to add there
            @param {boolean} internal - is this a DataTree-specific property?
            @param {object} the value that was set
        */
   /*     let _propertySet = function(node, key, value, internal) {
            if (internal) {
                let DTprops = node.getProperty("InternalProperties");
                if (!DTprops) {
                    DTprops = node.setProperty("InternalProperties", {});
                }
                DTprops[key] = value;
            }
            else {
                if (/@*InternalProperties/.exec(key)) {
                    key = '@' + key;
                }
                node.setProperty(key, value);
            }
            return value;
        };*/

        /**
            DataTree._propertyGet
            DataTree's wrapper for node property getting.
            We avoid name-clashing with a JSON-defined property
            by including in properties a DataTreeProperties object that
            contains all TreeNode-specific properties.
            @param {node} node - the node to add the property to
            @param {key} key - the key to add
            @param {boolean} internal - is this a DataTree-specific property?
                Optional; defaults to false.
        */
     /*   let _propertyGet = function(node, key, internal = false) {
            if (internal) {
                let DTprops = node.getProperty("InternalProperties");
                if (!DTprops) {
                    return undefined;
                }
                return DTprops[key];
            }
            else {
                if (/@+InternalProperties/.exec(key)) {
                    key = key.substr(1);
                }
                return node.getProperty(key);
            }
        };*/

        /**
            DataTree._createTreeAt
            Uses the data retrieved from reading a compliant JSON file
                or MongoDB account
            Mostly keeps JSON as-is, exceptions:
                - Objects become children, others are attached as-is
                - If numChildren is part of the JSON, will use that
                    otherwise, counts number of object children and uses that
                - may mark the node as loaded
            We consider the object "loaded" if all the following are satisfied:
                1) Either numChildren isn't specified on the node, or children
                    loaded equals this number.
                2) Either needsContent isn't specified on the node, or
                    there is content on this node.
            (The database can specify that isLoaded is true if it would like.)
            @param {node} node - the node in memory to begin from
            @param {object} data - the read-in data from the JSON
        */
        let _createTreeAt = function(node, data) {
            if (typeof data !== 'object' || angular.isArray(data)) {
                console.log(`Uh oh. ${data} of type ${typeof data}
                    is being passed to getTreeAt.`);
                return;
            }
            angular.forEach(data, function(val, key) {
                console.log(key);
                key = key.toLowerCase();
                if (key === "content") {
                    node.content = val;
                }

                if (typeof val !== 'object' || angular.isArray(val)) {
                    node[key] = val;
                }
                else {
                    key = /@+content/.exec(key) ? key.substr(1) : key;
                    _createTreeAt(node.addChild(key), val);
                }
            });

            let needsChildren = node.needschildren;
            let needsContent = node.needscontent;

            let allChildrenLoaded = !needsChildren ||
                (needsChildren <= node.numChildren);
            let allContentLoaded = !needsContent || node.content;
            let hasSomething = (node.numChildren > 0) ||
                node.content;

            if (allChildrenLoaded && allContentLoaded && hasSomething) {
                node.setProperty("_fullyLoaded", true);
            }
            else {
                node.setProperty("_fullyLoaded", false);
            }
        };


        /**
            DataTree.load:
            Loads a node based on the data we have for it
            Specifically, populates its deferred object
            @param {node} node - the node to get data for
            @return {deferred} The deferred created for the node
                which can also be found via node._loadDeferred
        */
        this.load = function(node) {
            let deferred = node.setProperty("_loadDeferred", $q.defer());

            if (node.getProperty("_fullyLoaded")
                || node.getProperty("filepath") === null) {
                deferred.resolve();
                return deferred;
            }

            $http.get(_getFilePath(node)).then(
                function( result ) {
                    // construct our version of this object
                    _createTreeAt(node, result.data);
                    deferred.resolve();
                },
                function(error, errorText) {
                    deferred.reject(errorText);
                    console.log(errorText);
                }
            );
            return deferred;
        };

        /**
            DataTree._findChildHelpRecurse
            See the below _findChildHelp. Recursion using promises seems rather
            bulky and repetitive code-wise, so I always find myself factoring
            out the code responsible for recursing.
            @param {node} target - the node to load right now
            @param {node} current - the node we're trying to find
                the child for
            @param {string} text - the key of the node we're looking for
            @param {deferred} a deferred that resolves once the child
                is found, or we realize we cannot find it.
        */
        let _findChildHelpRecurse = function(target, current, text, deferred) {
            if (target.getLevel() === 0) {
                deferred.reject(text + ' isn\'t a child of '
                                + current.getKey());
            }
            else {
                _findChildHelp(target.parent(), current, text).then(
                    function() {
                        deferred.resolve();
                    },
                    function(error) {
                        deferred.reject(error);
                    }
                );
            }
        };

        /**
            DataTree._findChildHelp
            See the below _findChild. This function is the recursive
            helper for that function, and will load target in hope
            that current will obtain a child with a key of text.
            Ideally, this shouldn't recurse (and so only run with
            target = current) since the JSON should
            include all children at the lowest level unless a
            higher level completely loads it, but we handle that
            case nonetheless.
            @param {node} target - the node to load right now
            @param {node} current - the node we're trying to find
                the child for
            @param {string} text - the key of the node we're looking for
            @return {deferred} a deferred that resolves once the child
                is found, or we realize we cannot find it.
        */
        let _findChildHelp = function(target, current, text) {
            let deferred = $q.defer();

            //If target hasn't started loading, start now.
            if (!target.getProperty("_loadDeferred")) {
                tree.load(target);
            }

            target.getProperty("_loadDeferred").promise.then(
                function() {
                    if (current.getChild(text)) {
                        deferred.resolve();
                    }

                    else {
                        _findChildHelpRecurse(target, current, text, deferred);
                    }
                },
                // If the load fails for some reason on a node, keep trying
                // to go up
                function(loadError) {
                    console.log(loadError);
                    _findChildHelpRecurse(target, current, text, deferred);
                }
            );

            return deferred;
        };

        /**
            DataTree._findChild
            Find the child of current with a key of text,
                and returns a deferred object that will resolve
                once this node is found. Note that this function
                will not load the child, as this might be called in the
                middle of a navigate request and we might not want to
                load this node yet.
            @param {node} current - the node to load from
            @param {string} text - the name of the child to start loading
            @return {deferred} Will resolve once current is fully loaded,
                or if current already has a key for text from pre-loading,
                immedately. Will resolve with node of child navigated to
                If once current is loaded, no child with text is loaded,
                deferred object rejects.
        */
        let _findChild = function(current, text) {
            // Push onto the nav stack, independent of level
            let deferred = $q.defer();

            text = text.toLowerCase();

            if (current.getChild(text)) {
                deferred.resolve(current.getChild(text));
                return deferred;
            }

            _findChildHelp(current, current, text).promise.then(
                function() {
                    deferred.resolve(current.getChild(text));
                },
                function(error) {
                    deferred.reject(error);
                }
            );

            return deferred;
        };



        /**
            _navigateHelp
            A function that, given a node and a destinations object,
                will load all the specified nodes and return a promise
                that, when resolved, indicates the node to navigate to.
            @param {node} node - The node to navigate from
            @param {destinations} destinations - The destinations
                object of navObject
            @return {deferred} A deferred that will resolve when the
                node to navigate to indicated by destinations
                is found and and so can be navigated to.
                See the navObject description for details.
                Note that if destinations has no true destination,
                this deferred won't ever resolve or reject (barring error),
                and if it has multiple any one may be returned.
        */
        let _navigateHelp = function(node, destinations) {
            let deferred = $q.defer();

            angular.forEach(destinations, function(val, key) {
               _findChild(node, key).promise.then(
                    function(child) {
                        // Case where val is a destination object
                        if (typeof val === 'object') {
                            _navigateHelp(child, val).promise.then(
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
        };

        /**
            DataTree.navigate:
            Governs hierarchical navigation to a node that may
                not exist yet in memory.
            Side effects: will change navSpot into its target
                on successful promise resolution
            @param {navObject} navObject - parsed place to go
            @param {boolean} loadTarget - Load target node on completion?
                Optional, default value is true. (Set to false if you are
                just verifying this node exists.)
            @return {deferred} Deferred object for the data load
        */
        this.navigate = function(navObject, loadTarget = true) {
            let deferred = $q.defer();

            _navigateHelp(navObject.root, navObject.destinations).promise.then(
                function(newNode) {
                    navSpot = newNode;
                    if (loadTarget) {
                        tree.load(newNode);
                    }
                    deferred.resolve(newNode);
                },
                function( error ) {
                    deferred.reject(error);
                }
            );


            return deferred;
        };

        //This doesn't need to exist in production, but for unit testing...

        this.privateFunctions = {
            _navigateHelp: _navigateHelp,
            _findChild: _findChild,
            _findChildHelp: _findChildHelp,
            _createTreeAt: _createTreeAt,
            _bodyPattern: bodyPattern,
            _suffixPattern: suffixPattern
        };
    }]);
})();
