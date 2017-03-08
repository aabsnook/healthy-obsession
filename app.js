'use strict';

console.log("App.js stuff is happening.");

/*
    This allows me to develop a general framework while 
*/
var levelListStrings = [
    ["", "text"],
    ["", "number"],
    ["Chapter ", "number"],
    ["Verse ", ""]
];

/*

*/

var evil = {'1': "hi", '2': "i'm evil"};

console.log(evil["1"]);

var bookData = {
    "genesis": {            title: "Genesis",        childCount: 50},
    "exodus": {             title: "Exodus",         childCount: 40},
    "leviticus": {          title: "Leviticus",      childCount: 27},
    "numbers": {            title: "Numbers",        childCount: 36},
    "deuteronomy": {        title: "Deuteronomy",    childCount: 34},
    "joshua": {             title: "Joshua",         childCount: 24},
    "judges": {             title: "Judges",         childCount: 21},
    "ruth":   {             title: "Judges",         childCount: 4},
    "1 samuel": {           title: "1 Samuel",       childCount: 31},
    "2 samuel": {           title: "2 Samuel",       childCount: 24}
/*    "1 kings": 22,
    "2 kings": 25, 
    "1 chronicles": 29,
    "2 chronicles": 36,
    "ezra": 10,
    "nehemiah": 13, 
    "esther": 10,
    "job": 40,
    "psalms": 150,
    "proverbs": 31, 
    "ecclesiastes": 12,
    "song of solomon": 8,
    "isaiah": 66,
    "jeremiah": 52, 
    "lamentations": 5,
    "ezekiel": 48,
    "daniel": 12,
    "hosea": 14, 
    "joel": 3,
    "amos": 9,
    "obadiah": 1,
    "jonah": 4, 
    "micah": 7,
    "nahum": 3,
    "habakkuk": 3,
    "zephaniah": 3, 
    "haggai": 2,
    "zechariah": 14,
    "malachi": 4,
    "matthew": 28, 
    "mark": 16,
    "luke": 24,
    "john": 21,
    "acts": 28, 
    "romans": 16,
    "1 corinthians": 16,
    "2 corinthians": 13,
    "galatians": 6, 
    "ephesians": 6,
    "philippians": 4,
    "colossians": 4,
    "1 thessalonians": 5, 
    "2 thessalonians": 3,
    "1 timothy": 6,
    "2 timothy": 4,
    "titus": 3, 
    "philemon": 1,
    "hebrews": 13,
    "james": 5,
    "1 peter": 5, 
    "2 peter": 3,
    "1 john": 5,
    "2 john": 1,
    "3 john": 1, 
    "jude": 1,
    "revelation": 22 */
};

/*
    Translates between internal language and external - will be shown to end user
*/
var languageList = [
    "English"
];

/*
    Where we store localized strings for stuff - currently pretty bare-bones, but want to make it easy later
*/
var localizationStrings = {
    "Chapter" : ["Chapter"]
};

(function () {
    var app = angular.module('memorize', []);
    
    app.controller('NavController', function () {
        var searchText, ancestry,
            translation = new TreeNode("ESV", null, 66, 1);
      // var book = new BibleBook("Genesis", 50, translation);
    //   var chapter = new BibleChapter(1, 50, book);
    //   var verse = new Unit(1, "In the beginning, God created the heavens and the earth.", chapter, book);
        
        this.navigateTo = function (searchText) {
            /*
             Push onto the nav stack, independent of level
            */
            console.log(searchText);
            var current = this.navSpot;
            if (current.children.hasOwnProperty(searchText)) {   //test validity of chatper
                if (!current.children[searchText].isLoaded) {
                    this.load(current.children[searchText]);
                }
                
                this.navSpot = this.navSpot.children[searchText];
                this.ancestry = this.getAncestry(0);
            }
        };
        this.navigateOut = function (level) {
           while (this.navSpot.level !== level)  {
               this.navSpot = this.navSpot.parent;
           }
        };
        this.getLocationTag = function (language, treeNode) {
            var ret;
            var localPrefix = getLocalizedString(levelListStrings[treeNode.level-1][0], language);
            if (localPrefix !== "") {
               ret = (localPrefix + " " + treeNode.title);
            }
            else {
               ret = treeNode.title;
            }
            return ret;
       };
       this.getAncestry = function (language){
           var current = this.navSpot, ret = [];
           while (current !== null) {
               ret.push(this.getLocationTag(language, current));
               current = current.parent;
           }
           return ret;
       }
        
       this.load = function (treeNode) {
          //Block for level-specific code
          switch(treeNode.level) {
              case 1:
                  treeNode.children = bookData;     //bibleData is consistent across all translations, loaded immediately
                                                    //if for some reason we defer loading this, need to add event to wait for it
                  break;
              case 2:
                  treeNode.children = [];   //We load books high-level data and bookmarks from external data files. 
                  console.log("Loading level 2");                                              //If the user owns this book, it might make sense to load at this level
                  break;
              case 3:
                  treeNode.children = [];         //Currently, we load the meat of the content at the chapter level, and we'll also parse out verses here
                  console.log("Loading level 3");
                  break;
              default:                              //Don't need to load at the verse level
                  break;
          }
          //This is true for all levels
          _.mapObject (treeNode.children, function(val, key) {
              val.level = treeNode.level+1;
              val.parent = treeNode;
          });/* {
              if (treeNode.children.hasOwnProperty(child))
              child.level = level+1;
          }*/
       }
       
       this.navSpot = translation;
       this.load(this.navSpot);
       this.ancestry = this.getAncestry(0);
    });
})();

/*
    Function to translate - mostly just consults localizationStrings, with an optimization for English and an exception for a gap
*/
function getLocalizedString(str, language) {
    var local, trim = str.trim();
    if (language === 0 || trim === "") {
        return str;
    } 
    local = localizationStrings[trim][language]
    if (local) {
        return local;
    }
    else {
        throw new Exception("Language " + languageList[language] + " isn't supported yet.");
    }
}

/*
    The TreeNode class is agnostic to its depth level - 
*/

function TreeNode(title, parent, numChildren, level) {
    this.title = title;
    this.parent = parent;
    this.numChildren = numChildren;
    this.level = level;
}

function Bookmark(title, unit) {
    this.title = title;
    this.unit = unit;
}

TreeNode.prototype = {
};

//BibleTranslation.prototype = Object.create(TreeNode.prototype);
/*BibleTranslation.prototype = {
    numChildren: 66,
    children: bookData,
    parent: null,
    input: "text",
    isLoaded: true,
    loadChildren: function(){}     //empty function on purpose
};*/

/*Unit.prototype = {
    
    getNextUnit : function() {
        var thisChapter = this.parent;
        if ((+this.title) < thisChapter.numChildren) {
            return thisChapter.children[(+this.title)+1 + ""];
        }
        else if ((+thisChapter.title) < thisChapter.parent.numChildren) {
            return thisChapter.parent.children[(+thisChapter.title)+1].children["1"];
        }
        return null;
    },
    
    getPreviousUnit : function() {
        var thisChapter = this.parent;
        if ((+this.title) > 1) {
            return thisChapter.children[(+this.title)-1 + ""];
        }
        else if ((+thisChapter.title) > 1) {
            return thisChapter.parent.children[(+thisChapter.title)-1].children[thisChapter.numChildren + ""];
        }
        return null;
    }
};*/

//var app = angular.module('bookList', []);

/*(function() {
 
    
alert("This is OK.");

    app.controller('BookListController', function() {
       this.books = getBooks();
    });

alert("This is great!");

    var getBooks = function {
        alert("GetBooks called.");
        return [
            {
                title: 'Genesis',
                numChapters: 50,
                numVerses: 1533,
                score: 10.6,
                cachedVerses: {
                    '1' : {
                        '31' : "And God saw everything that he had made, and behold, it was very good. And there was evening and there was morning, the sixth day."
                    }
                },
                //Possible values:
                //(S)M: (Start and) mastered
                //   M: Mastered (will add different levels to this later - based on how often it needs to be rehearsed)
                //   W: Working on (actively, is part of the user's work queue and will be reminded of it)
                //   D: Dormant (user has memorized this before, but due to lack of rehearsing hasn't used it or is very rusty at it.)
                learnedVerses: {
                    '1' : {
                        '31' : 'SM',
                        '32' : 'M',
                        '33' : 'W',
                        '30' : 'D'
                    }
                }
            },
            {
                title: 'Exodus',
                numChapters: 50,
                numVerses: 1213,
                score: 10.6,
                cachedVerses: {},
                //Possible values:
                //(S)M: (Start and) mastered
                //   M: Mastered (will add different levels to this later - based on how often it needs to be rehearsed)
                //   W: Working on (actively, is part of the user's work queue and will be reminded of it)
                //   D: Dormant (user has memorized this before, but due to lack of rehearsing hasn't used it or is very rusty at it.)
                learnedVerses: {}
            }
        ];
    };
})();*/