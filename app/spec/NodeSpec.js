describe("the Node service", function() {

    let NodeFactory;
    let home;

    beforeEach(module('memApp.common'));

    beforeEach( inject(function(_NodeFactory_) {
        NodeFactory = _NodeFactory_;
        home = NodeFactory.createRoot();
    }));

    describe("constructor", function() {

        it('initializes children', function() {
            expect(home.numChildren).toEqual(0);
            home.getChild("foo");    //don't throw an exception.
        });

        it('has itself as an ancestor', function() {
            expect(home.getAncestry()).toContain(home);
        });

        it('gives roots a level of 0', function() {
            expect(home.level).toEqual(0);
        });

        it('has itself as its root', function() {
            expect(home.root).toEqual(home);
        });

    });

    describe("children addition", function() {
        let child, grandChild, greatGrandChild;
        beforeEach( function() {
            [home, child, grandChild, greatGrandChild] =
                home.newChild("child").newChild("grandChild")
                .newChild("greatGrandChild").getAncestry();
        });

        it('accepts all keys except for null and undefined', function() {
            expect(home.newChild(false)).toBeTruthy();
            expect(home.newChild(["hello", "kitty"])).toBeTruthy();
            expect(home.newChild(0)).toBeTruthy();
            expect(function() {home.newChild(null);}).toThrow();
            expect(function() {home.newChild(undefined);}).toThrow();
        });

        it('lets you retrieve children you add', function() {
            expect(home.getChild("child")).not.toBeNull();
        });

        it('gives decendants the same root as parents', function() {
            expect(child.root).toEqual(home);
            expect(grandChild.root).toEqual(home);
            expect(greatGrandChild.root).toEqual(home);
        });

        it('returns null and fails if child is there w/o override flag',
            function() {
            expect(home.newChild("child")).toBeNull();
            expect(home.numChildren).toEqual(1);
            expect(home.getChild("child").numChildren).toEqual(1);
            expect(grandChild.level).toEqual(2);
        });

        it('succeeeds and overwrites with override flag',
            function() {
            expect(home.newChild("child", {foo: "bar"}, true)).not.toBeNull();
            expect(home.numChildren).toEqual(1);
            expect(home.getChild("child").content.foo).toEqual("bar");
            expect(grandChild.level).toEqual(1);
        });

        it('gives childen a parent of node they were added to', function() {
            expect(child.parent).toEqual(home);
            expect(grandChild.parent).toEqual(child);
        });

        it('assigns level to be 1 greater than the last', function() {
            expect(child.level).toEqual(1);
            expect(grandChild.level).toEqual(2);
            expect(greatGrandChild.level).toEqual(3);
        });

        it('gives all decendants this node as an ancestor', function() {
            expect(child.getAncestry()).toContain(home);
            expect(grandChild.getAncestry()).toContain(home);
            expect(greatGrandChild.getAncestry()).toContain(home);
            expect(greatGrandChild.getAncestry()).toContain(child);
        });
    });

    describe("children deletion", function() {
        let child, grandChild, greatGrandChild;
        beforeEach( function() {
            [home, child, grandChild, greatGrandChild] =
                home.newChild("child").newChild("grandChild")
                .newChild("greatGrandChild").getAncestry();
        });

        it('returns true if delete successful, false otherwise', function() {
            expect(home.removeChild("foo")).not.toBeTruthy();
            home.newChild("foo", "bar");
            expect(home.removeChild("foo")).toBeTruthy();
        });

        it('causes future queries to deleted child to return falsy values',
            function() {
            grandChild.removeChild("greatGrandChild");
            expect(grandChild.getChild("greatGrandChild")).not.toBeTruthy();
        });

        it('doesn\'t delete the child, but makes its parent null,' +
            ' and level updates accordingly', function() {
            home.removeChild("child");
            expect(child).toBeTruthy();
            expect(child.parent).toBeNull();
            expect(grandChild.level).toBe(1);
        });
    });

    describe("child grafting", function() {
        let child, grandChild, greatGrandChild, stranger, sibling, cousin;
        beforeEach( function() {
            [home, child, grandChild, greatGrandChild] =
                home.newChild("child").newChild("grandChild")
                .newChild("greatGrandChild").getAncestry();
            stranger = NodeFactory.createRoot("hello!");
            sibling = stranger.newChild("sibling")
            cousin = sibling.newChild("cousin");
        });

        it('attaches child to the new parent', function() {
            stranger = home.graftChild(stranger, "sibling");
            expect(home.numChildren).toBe(2);
            expect(stranger.parent).toBe(home);
            expect(cousin.level).toBe(3);
            expect(stranger.numChildren).toBe(1);
        });

        it('throws an error on a non-node input', function() {
            expect(function() {home.graftChild("hello");}).toThrow();
            expect(function() {home.graftChild(false);}).toThrow();
            expect(function() {home.graftChild({foo: "bar"});}).toThrow();
        });

        it('throws an error if grafting root with undefined or null key',
            function() {
            expect(function() {home.graftChild("stranger");}).toThrow();
            expect(function() {home.graftChild("stranger", null);}).toThrow();
        });

        it('if not overwriting, merges the nodes by combining children, '
            + 'including recursively', function() {
            stranger.newChild("grandChild").newChild("greatCousin");
            home.graftChild(stranger, "child");
            expect(home.numChildren).toBe(1);
            expect(home.getChild("child").getChild("sibling")).not.toBeNull();
            expect(home.getChild("child").getChild("grandChild")
                .getChild("greatCousin")).not.toBeNull();
            expect(home.getChild("child").getChild("grandChild")
                .numChildren).toEqual(2);
        });

        it('merges content by Object.assign by default', function() {
            child.content = {foo: "bar", foz: "baz"};
            stranger.content = {foo: "baz", fudge: "sundae"};
            home.graftChild(stranger, "child");
            expect(home.getChild("child").content.foo).toEqual("baz");
            expect(home.getChild("child").content.foz).toEqual("baz");
            expect(home.getChild("child").content.fudge).toEqual("sundae");
        });

        it('accepts custom content merging functions & uses them', function() {
            let concat = function(str1, str2) {return str1 + str2;};
            home = NodeFactory.createRoot("hi", concat);
            home.newChild("child", "goodbye! ");
            home.graftChild(stranger, "child");
            expect(home.getChild("child").content).toEqual("goodbye! hello!");
        })

        it('throws an error if node grafted to itself', function() {
            expect(function() {
                home.graftChild(home, "evil")}).toThrow();
        });
    });

    describe("content function", function()  {

        it('lets you get content you put in', function() {
            home.content = {foo: "bar"};
            expect(home.content.foo).toEqual("bar");
        });

        it('starts out with undefined content by default', function() {
            expect(home.content).not.toBeDefined();
        });
    });

    describe("path from root obtaining", function() {
        it('should be an empty array for the root', function() {
            expect(home.pathTo()).toEqual([]);
        });

        it('should be a singleton array for children of root ', function() {
            expect(home.newChild("child").pathTo())
                .toEqual(["child"]);
        });

        it('should add directory sublevels for each additional' +
                ' level of the tree', function() {
            let grandChild = home.newChild("child").newChild("grandchild");
            expect(grandChild.pathTo()).toEqual(["child", "grandchild"]);
            expect(grandChild.newChild("greatgrandchild").pathTo())
                .toEqual(["child","grandchild","greatgrandchild"]);
        });

    });
});
