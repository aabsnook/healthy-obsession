describe("the Node service", function() {

    let NodeFactory;
    let home;

    beforeEach(module('memApp.common'));

    beforeEach( inject(function(_NodeFactory_) {
        NodeFactory = _NodeFactory_;
        home = NodeFactory.create();
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

    });

    describe("children addition", function() {
        let child, grandChild, greatGrandChild;
        beforeEach( function() {
            [home, child, grandChild, greatGrandChild] =
                home.newChild("child").newChild("grandChild")
                .newChild("greatGrandChild").getAncestry();
        });

        it('lets you retrieve children you add', function() {
            expect(home.getChild("child")).not.toBeNull();
        });

        it('returns null and fails if child is there w/o override flag',
            function() {
            expect(home.newChild("child")).toBeNull();
            expect(home.numChildren).toEqual(1);
            expect(home.getChild("child").numChildren).toEqual(1);
            expect(grandChild.level).toEqual(2);
        });

        it('succeeeds with override flag',
            function() {
            expect(home.newChild("child", true)).not.toBeNull();
            expect(home.numChildren).toEqual(1);
            expect(home.getChild("child").numChildren).toEqual(0);
            expect(grandChild.level).toEqual(1);
        });

        it('gives childen a parent of this node', function() {
            expect(child.parent).toEqual(home);
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

    describe("content function", function()  {

        it('lets you get content you put in', function() {
            home.content = {foo: "bar"};
            expect(home.content.foo).toEqual("bar");
        });

        it('starts out with an empty object for content', function() {
            expect(home.content).toEqual({});
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
                'level of the tree', function() {
            let grandChild = home.newChild("child").newChild("grandchild");
            expect(grandChild.pathTo()).toEqual(["child", "grandchild"]);
            expect(grandChild.newChild("greatgrandchild").pathTo())
                .toEqual(["child","grandchild","greatgrandchild"]);
        });

    });
});
