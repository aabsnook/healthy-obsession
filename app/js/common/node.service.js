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
                    Node.merge (private)
                    This function will merge this node with otherNode given.
                    We assume that this node and otherNode have the same
                    parent and key, and that otherNode  (hence this is private - see graftChild
                    for public-facing code that does this).
                    See graftChild for full details.
                    @param {node} newChild - the new child to copy
                */
                merge(newChild) {
                    let originalNode = this.node[_properties]
                        .children[newChild.key];

                    //Merge content
                    originalNode.mergeContent(newChild.content);

                    angular.forEach(newChild[_properties].children,
                        function(val, key) {
                        originalNode.graftChild(val, key);
                    });
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
                        return this.node.parent.hasAncestor(target);
                    }
                    else {
                        return false;
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
                        The function to merge content.
                        if a node is grafted onto this node that has the same
                        key as an existing child of this node.
                        Uses Object.assign by default.
                        Must take parameters: (oldContent, newContent)
                */
                constructor(parent, key, content, mergeFunction) {
                    this[_methods] = new _NodeMethods(this);
                    this[_properties] = {
                        "key": key,
                        "parent": (parent ? parent : null),
                        "children": {},
                        "numChildren": 0,
                        "content": {},
                        "mergeFunction": mergeFunction
                    }
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
                newChild(key, overwrite = false) {
                    if (key === undefined || key === null) {
                        throw new Error("Tried to make child with no key.");
                    }
                    if (this[_properties].children[key]) {
                        if (!overwrite) {
                            return null;
                        }
                        else {
                            this.removeChild(key);
                        }
                    }

                    this[_properties].numChildren++;
                    this[_properties].children[key] = new Node(this, key);
                    return this[_properties].children[key];
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
                    @param {node} child - The child to graft
                    @param {object} newKey - The new key. If omitted, will
                        use the old key. If that doesn't exist, throws an
                        exception.
                    @param {boolean} cycleCheck - Check for cycle?
                        Defaults to true. Will throw an exception if a cycle
                        is created. Setting this to false improves performance,
                        but could cause difficult-to-trace bugs if the calling
                        program isn't careful.
                    @param {boolean} overwrite - Allow overwriting?
                        Defaults to false.
                    @return {node} - The grafted child, or null
                        if the operation failed (say, because it created
                        a cycle)
                */
                graftChild(child, newKey, cycleCheck, overwrite) {
                    let key = newKey || child.key();
                    if (!child || !key) {
                        throw new Exception("Attempted to graft a null child"
                                + " or graft a rootless child with no key");
                    }
                    if (child[_properties].parent) {
                        child[_properties].parent.removeChild(child.key());
                    }

                    child[_properties].parent = this;
                    child[_properties].key = key;

                    if (!this[_properties].children[key]) {
                        this[_properties].children[key] = child;
                        this[_properties].numChildren++;
                        return child;
                    }

                    else {
                        if (cycleCheck || this[_methods].hasAncestor(child)) {
                            throw new Error("Attempted to graft a node "
                                    + "onto its child!");
                        }
                        if (!overwrite) {
                            this[_methods].merge(child);
                        }
                        else {
                            this[_properties].children[key] = child;
                        }
                        return child;
                    }
                }

                /**
                    Node.mergeContent
                    Merges this node's content with other content.
                    @return {object} the new content object
                */
                mergeContent(newContent) {
                    if (this[_properties].mergeFunction) {
                        return this[_properties].mergeFunction(this.content,
                                    newContent);
                    }
                    else {
                        return Object.assign(this.content, newContent);
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
            create: function(parent, key, properties, content) {
                return new Node(parent, key, properties, content);
            },
        };
    });
})();
