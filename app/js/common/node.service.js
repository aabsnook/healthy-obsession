(function() {
    angular.module('memApp.common')
        .factory('NodeFactory', function() {
            let _properties = Symbol();
            let _methods = Symbol();

            class _NodeMethods {
                constructor(node) {
                    this.node = node;
                }

                /**
                    Node.mergeIn (private)
                    This function will merge in the child given into this node.
                    We assume that this node already has a child with key
                    as key.
                    See graftChild for full details.
                    @param {node} newChild - the new child to copy
                    @param {string} key - the key to copy in
                */
                mergeIn(newChild, key) {
                    let originalNode = this.node[_properties]
                        .children[key];

                    //Merge content
                    originalNode.content
                        = originalNode.mergeContent(newChild.content);

                    angular.forEach(newChild[_properties].children,
                        function(val, nKey) {
                        originalNode[_methods].graftChildHelp(val, nKey);
                    });
                    return originalNode;
                }

                /**
                    Node.filePathHelp (private)
                    Helper for filePath function
                    @param {array} the list so far
                    @return {string} the list of titles to go through so far
                */
                pathToHelp(soFar) {
                    if (this.node.parent === null) {
                        return soFar;
                    }
                    soFar.unshift(this.node.key);

                    return this.node.parent[_methods].pathToHelp(soFar);
                };

                /**
                    Node.ancestryHelp (private)
                    Helper for getAncestry function
                    @param {array} the list so far
                    @return {array} the list of ancestors
                */
                ancestryHelp(soFar) {
                    soFar.unshift(this.node);
                    if (this.node.parent === null) {
                        return soFar;
                    }
                    return this.node.parent[_methods].ancestryHelp(soFar);
                }

                /**
                    Node.hasAncestor (private)
                    Does this node have the given ancestor?
                    @param {node} target - the target parent
                    @returns {boolean} is target an ancestor of this node?
                */
                hasAncestor(target) {
                    if (this.node === target) {
                        return true;
                    }
                    if (this.node.parent) {
                        return this.node.parent[_methods].hasAncestor(target);
                    }
                    else {
                        return false;
                    }
                }

                /**
                    Node.addNodeChild (private)
                    Helper method for adding a child, executes logic
                    common to all child addition.
                    @param {node} the node to add
                    @param {key} the key to add it at
                    @param {boolean} overwrite - ok to overwrite?
                */
                addNodeChild(node, key, overwrite) {
                    if (this.node[_properties].children[key]) {
                        if (!overwrite) {
                            return null;
                        }
                        else {
                            this.node.removeChild(key);
                        }
                    }

                    this.node[_properties].numChildren++;
                    this.node[_properties].children[key] = node;
                    return this.node[_properties].children[key];
                }

                /**
                   Node.graftChildHelp (private)
                   Helper for graftChild - see its documentation.
                   Helper version doesn't do validation, which is useful
                   for recursive calls to graftChild, but we don't want to
                   expose the ability to add non-root nodes.
                   @param {node} child - see below
                   @param {string} key - see below
                   @param {boolean} overwrite - see below
                   @return {node} see below
                */
                graftChildHelp(child, key, overwrite) {

                    if (!overwrite && this.node[_properties].children[key]) {
                        return this.node[_methods].mergeIn(child, key);
                    }
                    else {
                        child[_properties].parent = this.node;
                        child[_properties].key = key;
                        child[_properties].root = this.node.root;

                        return this.node[_methods]
                            .addNodeChild(child, key, overwrite);
                    }
                }

            }

            /**
                The Node class.
                Used to represent a node in a tree.
            */

            class Node {

                /**
                    Node's constructor;
                    The title, parent are things we need and should know.
                    @param {node} parent - This node's parent - if omitted,
                        assume this is a root node
                    @param {string} key - This node's key on the parent.
                        Mandatory if parent is given.
                    @param {object} content - The node's content
                        {} by default.
                    @param {function} mergeFunction -
                        The function to merge content on this tree.
                        This function only matters for the root of the tree,
                        as all ancestors will consult the root for this.
                        Used if a node is grafted into this tree with a key
                        equal to another key on the parent.
                        Uses Object.assign by default.
                        Must take parameters: (oldContent, newContent)
                */
                constructor(parent, key, content, root, mergeFunction) {
                    this[_methods] = new _NodeMethods(this);
                    this[_properties] = {
                        "key": key,
                        "parent": (parent ? parent : null),
                        "children": {},
                        "numChildren": 0,
                        "content": content,
                        "mergeFunction": mergeFunction,
                        "root": root || this
                    };
                };

                /**
                    Node.getLevel
                    Get the depth of this node.
                    @return {int} the level of this node
                */
                get level() {
                    if (this.parent === null) {
                        return 0;
                    }
                    return this.parent.level + 1;
                }

                /**
                    Node.key
                    Get the key of this node.
                    @return {string} the key of this node, or "home"
                        if this is the root node
                */
                get key() {
                    return this[_properties].key || "home";
                }

                /**
                    Node.numChildren
                    Gets the number of children this node has.
                    @return {int} the number of children
                */
                get numChildren() {
                    return this[_properties].numChildren;
                }

                /**
                    Node.content
                    Accessor for content
                    @return {object} the content object
                */
                get content() {
                    return this[_properties].content;
                }

                /**
                    Node.setContent
                    @param {object} content - the object to set content to
                */

                set content(content) {
                    this[_properties].content = content;
                }

                /**
                    Node.root
                    Accessor for root
                    @return {node} the root of this node
                */
                get root() {
                    return this[_properties].root;
                }

                /**
                   Node.getChild
                   Gets the child with this key, or null otherwise.
                   @param {object} the key of this child
                   @return {node} the child to return, or null if there
                        is no child with this key
                */
                getChild(key) {
                    if (key === undefined || key === null) {
                        throw new Error("Tried to get a non-key.");
                    }

                    if (this[_properties].children[key]) {
                        return this[_properties].children[key];
                    }
                    return null;
                }

                /**
                    Node.newChild
                    Adds a new child to this node with given key.
                    Returns null if key already exists and no child is
                        created, unless overwrite is set to true.
                    @param {string} key - The key of the child to add
                    @param {boolean} overwrite - Allow overwriting?
                        Defaults to false.
                    @return {node} a pointer to the created node.
                */
                newChild(key, content, overwrite = false) {
                    if (key === undefined || key === null) {
                        throw new Error("Tried to make child with no key.");
                    }
                    let newNode = new Node(this, key, content, this.root);

                    return this[_methods].addNodeChild(newNode, key, overwrite);
                }

                /**
                    Node.graftChild
                    Adds a child to the specified parent with the specified
                        key. By default, if parent already has a child with
                        the same key, will merge the two nodes; the new
                        will overwrite the old if overwrite is set.
                        Throws an exception if a cycle is created.
                        For properties not managed by this class, merge will
                        overwrite existing properties with child's properties,
                        but conflicts can
                    @param {node} child - The child to graft.
                        This child must be a root node.
                        NOTE: may or may not be reused by this function.
                        Don't use this pointer again - suggest
                        child = node.graftChild(child, ...) if you want to
                        use it immediately.
                    @param {object} key - The key to add the child under
                    @param {boolean} overwrite - Allow overwriting?
                        Defaults to false.
                    @return {node} - The new node grafted onto this node. Note
                        that this does NOT change child (or any pointers to it).
                        Best practice:
                */
                graftChild(child, key, overwrite = false)
                {
                    if (!child) {
                        throw new Error("Attempted to graft a non-node " + child);
                    }

                    if (!key) {
                        throw new Error("graftChild requires a key.");
                    }

                    if (child.parent !== null) {
                        throw new Error("Attempted to graft a non-root node.");
                    }

                    if (child === this.root) {
                        throw new Error("Tried to graft a node to one of its "
                                + "children!");
                    }

                    return this[_methods].graftChildHelp(child, key, overwrite);
                }

                /**
                    Node.mergeContent
                    Returns this node's content merged with the passed-in
                    content according to this node's tree's content merge
                    function. Will not modify this node's content.
                    @param {object} the content to merge in
                    @return {object} the merged content
                */
                mergeContent(newContent) {
                    if (this.root[_properties].mergeFunction) {
                        return this.root[_properties].mergeFunction.call(
                                null, this.content, newContent);
                    }
                    else {
                        return Object.assign({}, this.content, newContent);
                    }
                }

                /**
                    Node.removeChild
                    Removes the child with the given key.
                    Doesn't delete the child, only removes it from the parent,
                    and deletes its references to its parent and its key.
                    @param {string} key
                    @return {boolean} whether or not a child was removed
                */
                removeChild(key) {
                    if (!this[_properties].children[key]) {
                        return false;
                    }

                    this[_properties].children[key][_properties].parent
                        = null;
                    this[_properties].children[key][_properties].key
                        = undefined;
                    this[_properties].children[key] = undefined;
                    this[_properties].numChildren--;
                    return true;
                };

                /*
                    Node.orphan
                    Makes this child into an orphan by deleting its reference
                    to its parent and deleting its parent's reference to it.
                */
                orphan() {
                    if (this.parent === null) {
                        return;
                    }
                    this.parent.removeChild(this.key);
                    this[_properties].parent = null;
                }

                /**
                    Node.pathTo
                    @return {array} a list of keys to follow to get to this
                        node from the root
                */
                pathTo() {
                    return this[_methods].pathToHelp([]);
                };

                /**
                    Node.parent()
                    @return {node} the parent of this node
                */
                get parent() {
                    return this[_properties].parent;
                };

                /**
                    Node.getAncestor
                    @param {int} depth - the depth at which to return
                    @return {node} - the ancestor at that depth, or null
                        if this node's level is greater than depth
                */
                getAncestor(depth) {
                    if (!isNaN(parseFloat(depth)) && isFinite(depth)) {

                        let myDepth = this.level;
                        let current = this;

                        if (myDepth > depth) {
                            return null;
                        }

                        while (myDepth < depth) {
                            current = current.parent;
                            myDepth--;
                        }
                        return current;

                    }
                    else {
                        throw new Error("Non-numeric input to getAncestor.");
                    }
                };

                /**
                    Node.getAncestry
                    @return {array} a deep copy of this node's lineage
                        (This will not create a deep copy of the nodes
                        referred to - just a deep copy of the array itself.)
                */
                getAncestry() {
                    return this[_methods].ancestryHelp([]);
                }

                /**
                    Node.split()
                    Given a node with a content field,
                    splits it into units based on punctuation.
                    This will go into a 'units' object, since
                    these should not be visible to the hierarchical
                    navigator; instead they help the user at the micro level.
                    (This punctuation should be configurable.)
                    @param {boolean} override -
                        Override existing 'units' object?
                        False by default. If false, function fails if 'units'
                        already exists. If true, will override existing 'units'
                        object if it exists.
                    @return {boolean} true if successful, false if it fails
                */
             /*   split(override = false) {
                    if (node && node.content) {
                        if (!node.units || override) {
                            node.units = {};
                            node.units.body = [];
                            node

                            let temp = node.content;

                            //Body
                            while(true) {
                                results = temp.match(splitPattern);
                                if (!results) {
                                    break;
                                }
                                node.units.body.push(
                                    {
                                        content: results[1]
                                    }
                                );
                                temp = temp.substring(results.index);
                            }
                            //Make sure end of verse has punctuation
                            if temp.match(terminatePattern) {
                                node.units.body.push(
                                    {
                                        content: temp
                                    }
                                );

                            }
                            else {
                                node.units.suffix = temp;
                            }
                            return node.units.length > 0
                        }

                        return false;
                    }
                    else {
                        //Really would like to throw an error here.
                        console.log("Split called on contentless node.");
                        return false;
                    }
                };*/
            };
        return {
            createRoot: function(content, mergeFunction) {
                if (mergeFunction && typeof mergeFunction !== "function") {
                    throw new Error("Non-function used as mergeFunction.");
                }
                return new Node(null, undefined, content, undefined, mergeFunction);
            },
        };
    });
})();
