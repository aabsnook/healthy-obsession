describe("the data tree service", function() {

    let DataTree, NodeFactory, $httpBackend, mockRoot, mockChild, root;

    beforeEach(module('memApp.common'));

    beforeEach( inject(function(_DataTree_, _NodeFactory_, _$httpBackend_) {
        DataTree = _DataTree_;
        NodeFactory = _NodeFactory_;
        $httpBackend = _$httpBackend_;
        mockRoot =
        {
            "esv": {
                "title": "ESV",
                "needsChildren": 3,
                "Genesis": {
                    "order": "numeric",
                    "title": "Genesis",
                    "needsChildren": 1,
                    "1": {
                        "title": "Chapter 1",
                        "needsContent": true
                    }
                }
            }
        };
        mockEsv =
        {
            'genesis': {
                'needsChildren': 3,
                '2': {
                    'content': {
                        body: ['Well,', 'Well,', 'Well.'],
                        suffix: 'They were so happy'
                    }
                }
            }
        };

        $httpBackend
            .when('GET', 'json/home.json')
            .respond(200, mockRoot);

        $httpBackend
            .when('GET', 'json/esv.json')
            .respond(200, mockEsv);
    }));

    describe("the subtree creation process", function() {

        beforeEach( function() {
            root = NodeFactory.create();

            DataTree.privateFunctions._createTreeAt(root, mockRoot);
        });

        it('adds children appropriately', function() {
            expect(root.getNumChildren()).toBe(1);
            expect(root.getChild("esv").getNumChildren()).toBe(1);
        });

        it('sets the _fullyLoaded node property if a child or content' +
           'is present, needsChildren and needsContent not set', function() {
            expect(root.getProperty("_fullyLoaded")).toBe(true);
        });

        it('doesn\'t set the _fullyLoaded node property if needsChildren ' +
           'is too high',
            function() {
            expect(root.getChild("esv").getProperty("_fullyLoaded"))
                .not.toBeTruthy();
            }
        );
        it ('sets _fullyLoaded if needsChildren matches number of children',
            function() {
            expect(root.getChild("esv").getChild("genesis")
                .getProperty("_fullyLoaded")).toBe(true);
            }
        );
    });

    describe("initialization", function() {
        it('initializes', function() {

            let node = NodeFactory.create();

            DataTree.init("ESV", "json/", ".json").promise.then(
                function(root) {
                    console.log(dump(root));
                    expect(root.getKey()).toEqual("home");
                    expect(DataTree.getNavSpot().getKey()).toEqual("esv");
                },
                function() {
                    expect(false);
                }
            );

            $httpBackend.flush();
        });
    });

    describe("the navigation functionality", function() {

        beforeEach( function() {
            DataTree.init("ESV");
        });

        it('navigates using objects in this format', function() {
            DataTree.init("ESV");
            let navObject = {
                root: DataTree.getRoot(),
                destinations: {
                    esv: {
                        genesis: true
                    }
                }
            };

            DataTree.navigate(navObject).promise.then(
                function(node) {
                    expect(node.__getTitle()).toEqual("Genesis");
                    expect(DataTree.getNavSpot().__getTitle())
                           .toEqual("Genesis");
                },
                function() {
                    expect(false);
                }
            );
        });
    });
});
