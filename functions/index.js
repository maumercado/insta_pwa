var functions = require("firebase-functions");
var admin = require("firebase-admin");
var cors = require("cors")({ origin: true });
var webpush = require("web-push");
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

var serviceAccount = require("./pwagram-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://pwagram-2d466.firebaseio.com/"
});

exports.storePostData = functions.https.onRequest(function(request, response) {
    cors(request, response, function() {
        admin
            .database()
            .ref("posts")
            .push({
                id: request.body.id,
                title: request.body.title,
                location: request.body.location,
                image: request.body.image
            })
            .then(function() {
                webpush.setVapidDetails(
                    "mailto: info@maumercado.com",
                    "BB3NdO1ImBYAQ-G1M4hcy_qIZ6N-VNS-MS7DoNQVCAN_FrZDx6LVcIOshlI09lZmWGuNvQrQ4JlPy44ve_i0lXI",
                    "LFR9XVUtKJ6HhF42p5Yt1jvUUCF60qea93NiT78uquM"
                );
                return admin.database.ref("subscription").once("value");
            })
            .then(function(subscriptions) {
                subscriptions.forEach(function(sub) {
                    var pushConfig = {
                        endpoint: sub.val().endpoint,
                        keys: {
                            auth: sub.val().keys.auth,
                            p256df: sub.val().keys.p256dh
                        }
                    };
                    webpush
                        .sendNotification(
                            pushConfig,
                            JSON.stringify({
                                title: "New Post",
                                content: "New Post added!",
                                openUrl: "/help"
                            })
                        )
                        .catch(function(err) {
                            console.error(err);
                        });
                });
                response
                    .status(201)
                    .json({ message: "Data stored", id: request.body.id });
            })
            .catch(function(err) {
                response.status(500).json({ error: err });
            });
    });
});
