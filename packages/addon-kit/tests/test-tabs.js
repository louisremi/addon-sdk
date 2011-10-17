/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Jetpack.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Dietrich Ayala <dietrich@mozilla.com> (Original author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
"use strict";

var {Cc,Ci} = require("chrome");
const { Loader } = require("@loader");
const options = require("@packaging");

// test tab.activeTab getter
exports.testActiveTab_getter = function(test) {
  test.waitUntilDone();

  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");

    let url = "data:text/html,<html><head><title>foo</title></head></html>";
    require("tab-browser").addTab(
      url,
      {
        onLoad: function(e) {
          test.assert(tabs.activeTab);
          test.assertEqual(tabs.activeTab.url, url);
          test.assertEqual(tabs.activeTab.title, "foo");
          closeBrowserWindow(window, function() test.done());
        }
      }
    );
  });
};

// test 'BrowserWindow' instance creation on tab 'activate' event
// See bug 648244: there was a infinite loop.
exports.testBrowserWindowCreationOnActivate = function(test) {
  test.waitUntilDone();
  
  let windows = require("windows").browserWindows;
  let tabs = require("tabs");
  
  let gotActivate = false;
  
  tabs.once('activate', function onActivate(eventTab) {
    test.assert(windows.activeWindow, "Is able to fetch activeWindow");
    gotActivate = true;
  });
  
  openBrowserWindow(function(window, browser) {
    test.assert(gotActivate, "Received activate event before openBrowserWindow's callback is called");
    closeBrowserWindow(window, function () test.done());
  });
}

// test tab.activeTab setter
exports.testActiveTab_setter = function(test) {
  test.waitUntilDone();

  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let url = "data:text/html,<html><head><title>foo</title></head></html>";

    tabs.on('ready', function onReady(tab) {
      tabs.removeListener('ready', onReady);
      test.assertEqual(tabs.activeTab.url, "about:blank", "activeTab url has not changed");
      test.assertEqual(tab.url, url, "url of new background tab matches");
      tabs.on('activate', function onActivate(eventTab) {
        tabs.removeListener('activate', onActivate);
        test.assertEqual(tabs.activeTab.url, url, "url after activeTab setter matches");
        test.assertEqual(eventTab, tab, "event argument is the activated tab");
        test.assertEqual(eventTab, tabs.activeTab, "the tab is the active one");
        closeBrowserWindow(window, function() test.done());
      });
      tab.activate();
    })

    tabs.open({
      url: url,
      inBackground: true
    });
  });
};

exports.testAutomaticDestroy = function(test) {
  test.waitUntilDone();

  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    
    // Create a second tab instance that we will destroy
    let called = false;
    
    let loader = Loader.new(options);
    let tabs2 = loader.require(module.uri, "tabs");
    tabs2.on('open', function onOpen(tab) {
      called = true;
    });
    
    loader.unload();
    
    // Fire a tab event an ensure that this destroyed tab is inactive
    tabs.once('open', function () {
      require("timer").setTimeout(function () {
        test.assert(!called, "Unloaded tab module is destroyed and inactive");
        closeBrowserWindow(window, function() test.done());
      }, 0);
    });
    
    tabs.open("data:text/html,foo");
    
  });
};

// test tab properties
exports.testTabProperties = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs= require("tabs");
    let url = "data:text/html,<html><head><title>foo</title></head><body>foo</body></html>";
    tabs.open({
      url: url,
      onReady: function(tab) {
        test.assertEqual(tab.title, "foo", "title of the new tab matches");
        test.assertEqual(tab.url, url, "URL of the new tab matches");
        test.assert(tab.favicon, "favicon of the new tab is not empty");
        test.assertEqual(tab.style, null, "style of the new tab matches");
        test.assertEqual(tab.index, 1, "index of the new tab matches");
        test.assertNotEqual(tab.getThumbnail(), null, "thumbnail of the new tab matches");
        closeBrowserWindow(window, function() test.done());
      }
    });
  });
};

// test tabs iterator and length property
exports.testTabsIteratorAndLength = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let startCount = 0;
    for each (let t in tabs) startCount++;
    test.assertEqual(startCount, tabs.length, "length property is correct");
    let url = "data:text/html,default";
    tabs.open(url);
    tabs.open(url);
    tabs.open({
      url: url,
      onOpen: function(tab) {
        let count = 0;
        for each (let t in tabs) count++;
        test.assertEqual(count, startCount + 3, "iterated tab count matches");
        test.assertEqual(startCount + 3, tabs.length, "iterated tab count matches length property");
        closeBrowserWindow(window, function() test.done());
      }
    });
  });
};

// test tab.url setter
exports.testTabLocation = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let url1 = "data:text/html,foo";
    let url2 = "data:text/html,bar";

    tabs.on('ready', function onReady(tab) {
      if (tab.url != url2)
        return;
      tabs.removeListener('ready', onReady);
      test.pass("tab.load() loaded the correct url");
      closeBrowserWindow(window, function() test.done());
    });

    tabs.open({
      url: url1,
      onOpen: function(tab) {
        tab.url = url2
      }
    });
  });
};

// test tab.close()
exports.testTabClose = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let url = "data:text/html,foo";

    test.assertNotEqual(tabs.activeTab.url, url, "tab is now the active tab");
    tabs.on('ready', function onReady(tab) {
      tabs.removeListener('ready', onReady);
      test.assertEqual(tabs.activeTab.url, tab.url, "tab is now the active tab");
      tab.close(function() {
        closeBrowserWindow(window, function() test.done());
      });
      test.assertNotEqual(tabs.activeTab.url, url, "tab is no longer the active tab");
    });

    tabs.open(url);
  });
};

// test tab.reload()
exports.testTabReload = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let url = "data:text/html,<!doctype%20html><title></title>";

    tabs.open({ url: url, onReady: function onReady(tab) {
      tab.removeListener("ready", onReady);

      browser.addEventListener(
        "load",
        function onLoad() {
          browser.removeEventListener("load", onLoad, true);

          browser.addEventListener(
            "load",
            function onReload() {
              browser.removeEventListener("load", onReload, true);
              test.pass("the tab was loaded again");
              test.assertEqual(tab.url, url, "the tab has the same URL");
              closeBrowserWindow(window, function() test.done());
            },
            true
          );
          tab.reload();
        },
        true
      );
    }});
  });
};

// test tab.move()
exports.testTabMove = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let url = "data:text/html,foo";

    tabs.open({
      url: url,
      onOpen: function(tab) {
        test.assertEqual(tab.index, 1, "tab index before move matches");
        tab.index = 0;
        test.assertEqual(tab.index, 0, "tab index after move matches");
        closeBrowserWindow(window, function() test.done());
      }
    });
  });
};

// open tab with default options
exports.testOpen = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let url = "data:text/html,default";
    tabs.open({
      url: url,
      onReady: function(tab) {
        test.assertEqual(tab.url, url, "URL of the new tab matches");
        test.assertEqual(window.content.location, url, "URL of active tab in the current window matches");
        closeBrowserWindow(window, function() test.done());
      }
    });
  });
};

// open pinned tab
exports.testOpenPinned = function(test) {
  const xulApp = require("xul-app");
  if (xulApp.versionInRange(xulApp.platformVersion, "2.0b2", "*")) {
    // test tab pinning
    test.waitUntilDone();
    openBrowserWindow(function(window, browser) {
      let tabs = require("tabs");
      let url = "data:text/html,default";
      tabs.open({
        url: url,
        isPinned: true,
        onOpen: function(tab) {
          test.assertEqual(tab.isPinned, true, "The new tab is pinned");
          closeBrowserWindow(window, function() test.done());
        }
      });
    });
  }
  else {
    test.pass("Pinned tabs are not supported in this application.");
  }
};

// pin/unpin opened tab
exports.testPinUnpin = function(test) {
  const xulApp = require("xul-app");
  if (xulApp.versionInRange(xulApp.platformVersion, "2.0b2", "*")) {
    test.waitUntilDone();
    openBrowserWindow(function(window, browser) {
      let tabs = require("tabs");
      let url = "data:text/html,default";
      tabs.open({
        url: url,
        onOpen: function(tab) {
          tab.pin();
          test.assertEqual(tab.isPinned, true, "The tab was pinned correctly");
          tab.unpin();
          test.assertEqual(tab.isPinned, false, "The tab was unpinned correctly");
          closeBrowserWindow(window, function() test.done());
        }
      });
    });
  }
  else {
    test.pass("Pinned tabs are not supported in this application.");
  }
};

// open tab in background
exports.testInBackground = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let activeUrl = tabs.activeTab.url;
    let url = "data:text/html,background";
    test.assertEqual(activeWindow, window, "activeWindow matches this window");
    tabs.on('ready', function onReady(tab) {
      tabs.removeListener('ready', onReady);
      test.assertEqual(tabs.activeTab.url, activeUrl, "URL of active tab has not changed");
      test.assertEqual(tab.url, url, "URL of the new background tab matches");
      test.assertEqual(activeWindow, window, "a new window was not opened");
      test.assertNotEqual(tabs.activeTab.url, url, "URL of active tab is not the new URL");
      closeBrowserWindow(window, function() test.done());
    });
    tabs.open({
      url: url,
      inBackground: true
    });
  });
};

// open tab in new window
exports.testOpenInNewWindow = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");

    let cache = [];
    let windowUtils = require("window-utils");
    let wt = new windowUtils.WindowTracker({
      onTrack: function(win) {
        cache.push(win);
      },
      onUntrack: function(win) {
        cache.splice(cache.indexOf(win), 1)
      }
    });
    let startWindowCount = cache.length;

    let url = "data:text/html,newwindow";
    tabs.open({
      url: url,
      inNewWindow: true,
      onReady: function(tab) {
        let newWindow = cache[cache.length - 1];
        test.assertEqual(cache.length, startWindowCount + 1, "a new window was opened");
        test.assertEqual(activeWindow, newWindow, "new window is active");
        test.assertEqual(tab.url, url, "URL of the new tab matches");
        test.assertEqual(newWindow.content.location, url, "URL of new tab in new window matches");
        test.assertEqual(tabs.activeTab.url, url, "URL of activeTab matches");
        for (var i in cache) cache[i] = null;
        wt.unload();
        closeBrowserWindow(newWindow, function() {
          closeBrowserWindow(window, function() test.done());
        });
      }
    });
  });
};

// onOpen event handler
exports.testTabsEvent_onOpen = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let url = "data:text/html,1";
    let eventCount = 0;

    // add listener via property assignment
    function listener1(tab) {
      eventCount++;
    };
    tabs.on('open', listener1);

    // add listener via collection add
    tabs.on('open', function listener2(tab) {
      test.assertEqual(++eventCount, 2, "both listeners notified");
      tabs.removeListener('open', listener1);
      tabs.removeListener('open', listener2);
      closeBrowserWindow(window, function() test.done());
    });

    tabs.open(url);
  });
};

// onClose event handler
exports.testTabsEvent_onClose = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let url = "data:text/html,onclose";
    let eventCount = 0;

    // add listener via property assignment
    function listener1(tab) {
      eventCount++;
    }
    tabs.on('close', listener1);

    // add listener via collection add
    tabs.on('close', function listener2(tab) {
      test.assertEqual(++eventCount, 2, "both listeners notified");
      tabs.removeListener('close', listener1);
      tabs.removeListener('close', listener2);
      closeBrowserWindow(window, function() test.done());
    });

    tabs.on('ready', function onReady(tab) {
      tabs.removeListener('ready', onReady);
      tab.close();
    });

    tabs.open(url);
  });
};

// onClose event handler when a window is closed
exports.testTabsEvent_onCloseWindow = function(test) {
  test.waitUntilDone();

  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");

    let closeCount = 0, individualCloseCount = 0;
    function listener() {
      closeCount++;
    }
    tabs.on('close', listener);

    // One tab is already open with the window
    let openTabs = 1;
    function testCasePossiblyLoaded() {
      if (++openTabs == 4) {
        beginCloseWindow();
      }
    }

    tabs.open({
      url: "data:text/html,tab2",
      onOpen: function() testCasePossiblyLoaded(),
      onClose: function() individualCloseCount++
    });

    tabs.open({
      url: "data:text/html,tab3",
      onOpen: function() testCasePossiblyLoaded(),
      onClose: function() individualCloseCount++
    });

    tabs.open({
      url: "data:text/html,tab4",
      onOpen: function() testCasePossiblyLoaded(),
      onClose: function() individualCloseCount++
    });

    function beginCloseWindow() {
      closeBrowserWindow(window, function testFinished() {
        tabs.removeListener("close", listener);

        test.assertEqual(closeCount, 4, "Correct number of close events received");
        test.assertEqual(individualCloseCount, 3,
                         "Each tab with an attached onClose listener received a close " +
                         "event when the window was closed");

        test.done();
      });
    }

  });
}

// onReady event handler
exports.testTabsEvent_onReady = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let url = "data:text/html,onready";
    let eventCount = 0;

    // add listener via property assignment
    function listener1(tab) {
      eventCount++;
    };
    tabs.on('ready', listener1);

    // add listener via collection add
    tabs.on('ready', function listener2(tab) {
      test.assertEqual(++eventCount, 2, "both listeners notified");
      tabs.removeListener('ready', listener1);
      tabs.removeListener('ready', listener2);
      closeBrowserWindow(window, function() test.done());
    });

    tabs.open(url);
  });
};

// onActivate event handler
exports.testTabsEvent_onActivate = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let url = "data:text/html,onactivate";
    let eventCount = 0;

    // add listener via property assignment
    function listener1(tab) {
      eventCount++;
    };
    tabs.on('activate', listener1);

    // add listener via collection add
    tabs.on('activate', function listener2(tab) {
      test.assertEqual(++eventCount, 2, "both listeners notified");
      tabs.removeListener('activate', listener1);
      tabs.removeListener('activate', listener2);
      closeBrowserWindow(window, function() test.done());
    });

    tabs.open(url);
  });
};

// onDeactivate event handler
exports.testTabsEvent_onDeactivate = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let url = "data:text/html,ondeactivate";
    let eventCount = 0;

    // add listener via property assignment
    function listener1(tab) {
      eventCount++;
    };
    tabs.on('deactivate', listener1);

    // add listener via collection add
    tabs.on('deactivate', function listener2(tab) {
      test.assertEqual(++eventCount, 2, "both listeners notified");
      tabs.removeListener('deactivate', listener1);
      tabs.removeListener('deactivate', listener2);
      closeBrowserWindow(window, function() test.done());
    });

    tabs.on('open', function onOpen(tab) {
      tabs.removeListener('open', onOpen);
      tabs.open("data:text/html,foo");
    });

    tabs.open(url);
  });
};

// per-tab event handlers
exports.testPerTabEvents = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let eventCount = 0;

    tabs.open({
      url: "data:text/html,foo",
      onOpen: function(tab) {
        // add listener via property assignment
        function listener1() {
          eventCount++;
        };
        tab.on('ready', listener1);

        // add listener via collection add
        tab.on('ready', function listener2() {
          test.assertEqual(eventCount, 1, "both listeners notified");
          tab.removeListener('ready', listener1);
          tab.removeListener('ready', listener2);
          closeBrowserWindow(window, function() test.done());
        });
      }
    });
  });
};

exports.testAttachOnOpen = function (test) {
  // Take care that attach has to be called on tab ready and not on tab open.
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    
    tabs.open({
      url: "data:text/html,foobar",
      onOpen: function (tab) {
        let worker = tab.attach({
          contentScript: 'self.postMessage(document.location.href); ',
          onMessage: function (msg) {
            test.assertEqual(msg, "about:blank", 
              "Worker document url is about:blank on open");
            worker.destroy();
            closeBrowserWindow(window, function() test.done());
          }
        });
      }
    });
    
  });
}

exports.testAttachOnMultipleDocuments = function (test) {
  // Example of attach that process multiple tab documents
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let firstLocation = "data:text/html,foobar";
    let secondLocation = "data:text/html,bar";
    let thirdLocation = "data:text/html,fox";
    let onReadyCount = 0;
    let worker1 = null;
    let worker2 = null;
    let detachEventCount = 0;
    tabs.open({
      url: firstLocation,
      onReady: function (tab) {
        onReadyCount++;
        if (onReadyCount == 1) {
          worker1 = tab.attach({
            contentScript: 'self.on("message", ' +
                           '  function () self.postMessage(document.location.href)' +
                           ');',
            onMessage: function (msg) {
              test.assertEqual(msg, firstLocation, 
                               "Worker url is equal to the 1st document");
              tab.url = secondLocation;
            },
            onDetach: function () {
              detachEventCount++;
              test.pass("Got worker1 detach event");
              test.assertRaises(function () {
                  worker1.postMessage("ex-1");
                }, 
                /The page has been destroyed/, 
                "postMessage throw because worker1 is destroyed");
              checkEnd();
            }
          });
          worker1.postMessage("new-doc-1");
        } 
        else if (onReadyCount == 2) {
          
          worker2 = tab.attach({
            contentScript: 'self.on("message", ' +
                           '  function () self.postMessage(document.location.href)' +
                           ');',
            onMessage: function (msg) {
              test.assertEqual(msg, secondLocation, 
                               "Worker url is equal to the 2nd document");
              tab.url = thirdLocation;
            },
            onDetach: function () {
              detachEventCount++;
              test.pass("Got worker2 detach event");
              test.assertRaises(function () {
                  worker2.postMessage("ex-2");
                }, 
                /The page has been destroyed/, 
                "postMessage throw because worker2 is destroyed");
              checkEnd();
            }
          });
          worker2.postMessage("new-doc-2");
        } 
        else if (onReadyCount == 3) {
          
          tab.close();
          
        }
        
      }
    });
    
    function checkEnd() {
      if (detachEventCount != 2)
        return;
      
      test.pass("Got all detach events");
      
      closeBrowserWindow(window, function() test.done());
    }
    
  });
}


exports.testAttachWrappers = function (test) {
  // Check that content script has access to wrapped values by default
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let document = "data:text/html,<script>var globalJSVar = true; " +
                   "                       document.getElementById = 3;</script>";
    let count = 0;
    
    tabs.open({
      url: document,
      onReady: function (tab) {
        let worker = tab.attach({
          contentScript: 'try {' +
                         '  self.postMessage(!("globalJSVar" in window));' +
                         '  self.postMessage(typeof window.globalJSVar == "undefined");' +
                         '} catch(e) {' +
                         '  self.postMessage(e.message);' +
                         '}',
          onMessage: function (msg) {
            test.assertEqual(msg, true, "Worker has wrapped objects ("+count+")");
            if (count++ == 1)
              closeBrowserWindow(window, function() test.done());
          }
        });
      }
    });
    
  });
}

/*
// We do not offer unwrapped access to DOM since bug 601295 landed
// See 660780 to track progress of unwrap feature
exports.testAttachUnwrapped = function (test) {
  // Check that content script has access to unwrapped values through unsafeWindow
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let document = "data:text/html,<script>var globalJSVar=true;</script>";
    let count = 0;
    
    tabs.open({
      url: document,
      onReady: function (tab) {
        let worker = tab.attach({
          contentScript: 'try {' +
                         '  self.postMessage(unsafeWindow.globalJSVar);' +
                         '} catch(e) {' +
                         '  self.postMessage(e.message);' +
                         '}',
          onMessage: function (msg) {
            test.assertEqual(msg, true, "Worker has access to javascript content globals ("+count+")");
            closeBrowserWindow(window, function() test.done());
          }
        });
      }
    });
    
  });
}
*/

exports['test window focus changes active tab'] = function(test) {
  test.waitUntilDone();
  let win1 = openBrowserWindow(function() {
    let win2 = openBrowserWindow(function() {
      let tabs = require("tabs");
      tabs.on("activate", function onActivate() {
        tabs.removeListener("activate", onActivate);
        test.pass("activate was called on windows focus change.");
        closeBrowserWindow(win1, function() {
          closeBrowserWindow(win2, function() { test.done(); });
        });
      });
      win1.focus();
    }, "data:text/html,test window focus changes active tab</br><h1>Window #2");
  }, "data:text/html,test window focus changes active tab</br><h1>Window #1");
};

exports['test ready event on new window tab'] = function(test) {
  test.waitUntilDone();
  let uri = encodeURI("data:text/html,Waiting for ready event!");

  require("tabs").on("ready", function onReady(tab) {
    if (tab.url === uri) {
      require("tabs").removeListener("ready", onReady);
      test.pass("ready event was emitted");
      closeBrowserWindow(window, function() {
        test.done();
      });
    }
  });

  let window = openBrowserWindow(function(){}, uri);
};
/******************* helpers *********************/

// Helper for getting the active window
this.__defineGetter__("activeWindow", function activeWindow() {
  return Cc["@mozilla.org/appshell/window-mediator;1"].
         getService(Ci.nsIWindowMediator).
         getMostRecentWindow("navigator:browser");
});

// Utility function to open a new browser window.
function openBrowserWindow(callback, url) {
  let ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].
           getService(Ci.nsIWindowWatcher);
  let urlString = Cc["@mozilla.org/supports-string;1"].
                  createInstance(Ci.nsISupportsString);
  urlString.data = url;
  let window = ww.openWindow(null, "chrome://browser/content/browser.xul",
                             "_blank", "chrome,all,dialog=no", urlString);
  
  if (callback) {
    window.addEventListener("load", function onLoad(event) {
      if (event.target && event.target.defaultView == window) {
        window.removeEventListener("load", onLoad, true);
        let browsers = window.document.getElementsByTagName("tabbrowser");
        try {
          require("timer").setTimeout(function () {
            callback(window, browsers[0]);
          }, 10);
        } catch (e) { console.exception(e); }
      }
    }, true);
  }

  return window;
}

// Helper for calling code at window close
function closeBrowserWindow(window, callback) {
  window.addEventListener("unload", function unload() {
    window.removeEventListener("unload", unload, false);
    callback();
  }, false);
  window.close();
}

// If the module doesn't support the app we're being run in, require() will
// throw.  In that case, remove all tests above from exports, and add one dummy
// test that passes.
try {
  require("tabs");
}
catch (err) {
  // This bug should be mentioned in the error message.
  let bug = "https://bugzilla.mozilla.org/show_bug.cgi?id=560716";
  if (err.message.indexOf(bug) < 0)
    throw err;
  for (let [prop, val] in Iterator(exports)) {
    if (/^test/.test(prop) && typeof(val) === "function")
      delete exports[prop];
  }
  exports.testAppNotSupported = function (test) {
    test.pass("the tabs module does not support this application.");
  };
}
