importScripts("workbox-sw.prod.v2.1.2.js");
importScripts("/src/js/idb.js");
importScripts("/src/js/utility.js");

const workboxSW = new self.WorkboxSW();

workboxSW.router.registerRoute(
    /.*(?:googleapis|gstatic)\.com.*$/,
    workboxSW.strategies.staleWhileRevalidate({
        cacheName: "google-fonts",
        cacheExpiration: {
            maxEntries: 3,
            maxAgeSeconds: 60 * 60 * 24 * 30
        }
    })
);

workboxSW.router.registerRoute(
    "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css",
    workboxSW.strategies.staleWhileRevalidate({
        cacheName: "material-css"
    })
);

workboxSW.router.registerRoute(
    /.*(?:firebasestorage\.googleapis)\.com.*$/,
    workboxSW.strategies.staleWhileRevalidate({
        cacheName: "post-images"
    })
);

workboxSW.router.registerRoute(
    "https://pwagram-2d466.firebaseio.com/posts.json",
    function(args) {
        return fetch(args.event.request).then(function(res) {
            var clonedRes = res.clone();
            clearAllData("posts")
                .then(function() {
                    return clonedRes.json();
                })
                .then(function(data) {
                    for (var key in data) {
                        writeData("posts", data[key]);
                    }
                });
            return res;
        });
    }
);

workboxSW.router.registerRoute(
    function(routeData) {
        return routeData.event.request.headers
            .get("accept")
            .includes("text/html");
    },
    function(args) {
        return caches.match(args.event.request).then(function(response) {
            if (response) {
                return response;
            } else {
                return fetch(args.event.request)
                    .then(function(res) {
                        return caches.open("dynamic").then(function(cache) {
                            cache.put(args.event.request.url, res.clone());
                            return res;
                        });
                    })
                    .catch(function(err) {
                        return caches
                            .match("/offline.html")
                            .then(function(res) {
                                return res;
                            });
                    });
            }
        });
    }
);

workboxSW.precache([
  {
    "url": "favicon.ico",
    "revision": "2cab47d9e04d664d93c8d91aec59e812"
  },
  {
    "url": "index.html",
    "revision": "640265c093cc28cbc8b978aee2e3323c"
  },
  {
    "url": "manifest.json",
    "revision": "de5f9ec6dd0fee96db921f4fb1d5588b"
  },
  {
    "url": "offline.html",
    "revision": "45352e71a80a5c75d25e226e7330871b"
  },
  {
    "url": "src/css/app.css",
    "revision": "07aa7be9cd7150d9a5e69a77338d4d8a"
  },
  {
    "url": "src/css/feed.css",
    "revision": "fed0b69be8bea8a7e976ba5f4ae53d6d"
  },
  {
    "url": "src/css/help.css",
    "revision": "f7fc36c7bfd7e75a0ae466e0166a2fb8"
  },
  {
    "url": "src/images/main-image-lg.jpg",
    "revision": "31b19bffae4ea13ca0f2178ddb639403"
  },
  {
    "url": "src/images/main-image-sm.jpg",
    "revision": "c6bb733c2f39c60e3c139f814d2d14bb"
  },
  {
    "url": "src/images/main-image.jpg",
    "revision": "5c66d091b0dc200e8e89e56c589821fb"
  },
  {
    "url": "src/images/sf-boat.jpg",
    "revision": "0f282d64b0fb306daf12050e812d6a19"
  },
  {
    "url": "src/js/app.min.js",
    "revision": "bebcdafb9f8e6524d18d4a50d7176a3b"
  },
  {
    "url": "src/js/feed.min.js",
    "revision": "bbbd6ca09fd311bc627cc9dd2065f55e"
  },
  {
    "url": "src/js/fetch.min.js",
    "revision": "32590119a06bf9ade8026dd12baa695e"
  },
  {
    "url": "src/js/idb.min.js",
    "revision": "ea82c8cec7e6574ed535bee7878216e0"
  },
  {
    "url": "src/js/material.min.js",
    "revision": "713af0c6ce93dbbce2f00bf0a98d0541"
  },
  {
    "url": "src/js/promise.min.js",
    "revision": "ed8fa9e786ad3f5c96b5d2b3d80ba0de"
  },
  {
    "url": "src/js/utility.min.js",
    "revision": "4495aae9ab6b9b7cd0d42431c4175f0a"
  }
]);

self.addEventListener("sync", function(event) {
    console.log("[Service Worker] Background syncing", event);
    if (event.tag === "sync-new-posts") {
        console.log("[Service Worker] Syncing new Posts");
        event.waitUntil(
            readAllData("sync-posts").then(function(data) {
                for (var dt of data) {
                    var postData = new FormData();
                    postData.append("id", dt.id);
                    postData.append("title", dt.title);
                    postData.append("location", dt.location);
                    postData.append("rawLocationLat", dt.rawLocation.lat);
                    postData.append("rawLocationLng", dt.rawLocation.lng);
                    postData.append("file", dt.picture, dt.id + ".png");

                    fetch(
                        "https://us-central1-pwagram-2d466.cloudfunctions.net/storePostData",
                        {
                            method: "POST",
                            body: postData
                        }
                    )
                        .then(function(res) {
                            console.log("Sent data", res);
                            if (res.ok) {
                                res.json().then(function(resData) {
                                    deleteItemFromData(
                                        "sync-posts",
                                        resData.id
                                    );
                                });
                            }
                        })
                        .catch(function(err) {
                            console.log("Error while sending data", err);
                        });
                }
            })
        );
    }
});

self.addEventListener("notificationclick", function(event) {
    var notification = event.notification;
    var action = event.action;

    console.log(notification);

    if (action === "confirm") {
        console.log("Confirm was chosen");
        notification.close();
    } else {
        console.log(action);
        event.waitUntil(
            clients.matchAll().then(function(clis) {
                var client = clis.find(function(c) {
                    return c.visibilityState === "visible";
                });

                if (client !== undefined) {
                    client.navigate(notification.data.url);
                    client.focus();
                } else {
                    clients.openWindow(notification.data.url);
                }
                notification.close();
            })
        );
    }
});

self.addEventListener("notificationclose", function(event) {
    console.log("Notification was closed", event);
});

self.addEventListener("push", function(event) {
    console.log("Push Notification received", event);

    var data = {
        title: "New!",
        content: "Something new happened!",
        openUrl: "/"
    };

    if (event.data) {
        data = JSON.parse(event.data.text());
    }

    var options = {
        body: data.content,
        icon: "/src/images/icons/app-icon-96x96.png",
        badge: "/src/images/icons/app-icon-96x96.png",
        data: {
            url: data.openUrl
        }
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});
