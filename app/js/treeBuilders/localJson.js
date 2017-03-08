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
