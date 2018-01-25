importScripts("workbox-sw.prod.v2.0.0.js");
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
    "url": "404.html",
    "revision": "0a27a4163254fc8fce870c8cc3a3f94f"
  },
  {
    "url": "favicon.ico",
    "revision": "2cab47d9e04d664d93c8d91aec59e812"
  },
  {
    "url": "index.html",
    "revision": "70489d0c7134bd926519ab981aac2afd"
  },
  {
    "url": "manifest.json",
    "revision": "d11c7965f5cfba711c8e74afa6c703d7"
  },
  {
    "url": "offline.html",
    "revision": "45352e71a80a5c75d25e226e7330871b"
  },
  {
    "url": "service-worker.js",
    "revision": "19ac10c4b6f49a01fa24bcd3b506fdaf"
  },
  {
    "url": "src/css/app.css",
    "revision": "f27b4d5a6a99f7b6ed6d06f6583b73fa"
  },
  {
    "url": "src/css/feed.css",
    "revision": "edb6851fd7f76aec67d4ca36a09b166d"
  },
  {
    "url": "src/css/help.css",
    "revision": "1c6d81b27c9d423bece9869b07a7bd73"
  },
  {
    "url": "src/js/app.js",
    "revision": "0ebc3428440264af3d11c44c71194a64"
  },
  {
    "url": "src/js/feed.js",
    "revision": "5296fab0a9b73d3285bb8262e6fe353d"
  },
  {
    "url": "src/js/fetch.js",
    "revision": "766eb78e36b0ee73ef54ad362b1225e9"
  },
  {
    "url": "src/js/idb.js",
    "revision": "017ced36d82bea1e08b08393361e354d"
  },
  {
    "url": "src/js/material.min.js",
    "revision": "713af0c6ce93dbbce2f00bf0a98d0541"
  },
  {
    "url": "src/js/promise.js",
    "revision": "10c2238dcd105eb23f703ee53067417f"
  },
  {
    "url": "src/js/utility.js",
    "revision": "0d6c62534e37fe2cc0a9599690ed33e8"
  },
  {
    "url": "sw-base.js",
    "revision": "0f4e2a5f4787159f8428646489be6e90"
  },
  {
    "url": "sw.js",
    "revision": "06c1a2437c41a0bd7b93a0b89b4c70a5"
  },
  {
    "url": "workbox-sw.prod.v2.1.2.js",
    "revision": "685d1ceb6b9a9f94aacf71d6aeef8b51"
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
