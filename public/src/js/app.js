var deferredPrompt;
var enableNotificationsButtons = document.querySelectorAll(
    ".enable-notifications"
);
if (!window.Promise) {
    window.Promise = Promise;
}

if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("/sw.js")
        .then(function() {
            console.log("Service worker registered!");
        })
        .catch(function(err) {
            console.log(err);
        });
}

window.addEventListener("beforeinstallprompt", function(event) {
    console.log("beforeinstallprompt fired");
    event.preventDefault();
    deferredPrompt = event;
    return false;
});

function displayConfirmationNotification() {
    if ("serviceWorker" in navigator) {
        var options = {
            body: "You successfully subscribed to our Notification service!",
            icon: "/src/images/icons/app-icon-96x96.png",
            image: "/src/images/sf-boat.jpg",
            dir: "ltr",
            lang: "en-US", // BCP 47
            vibrate: [100, 50, 200],
            badge: "/src/images/icons/app-icon-96x96.png",
            tag: "confirm-notification", // same tags are grouped in devices
            renotify: false, // same tags will not notify user
            actions: [
                {
                    action: "confirm",
                    title: "Okay",
                    icon: "/src/images/icons/app-icon-96x96.png"
                },
                {
                    action: "cancel",
                    title: "Cancel",
                    icon: "/src/images/icons/app-icon-96x96.png"
                }
            ]
        };
        navigator.serviceWorker.ready.then(function(swreg) {
            swreg.showNotification("Successfully subscribed!", options);
        });
    }
}

function configurePushSub() {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    var reg;
    navigator.serviceWorker.ready
        .then(function(swreg) {
            reg = swreg;
            return swreg.pushManager.getSubscription(); // Subscription of this browser on this device, this account.
        })
        .then(function(sub) {
            if (sub === null) {
                var vapidPublicKey =
                    "BB3NdO1ImBYAQ-G1M4hcy_qIZ6N-VNS-MS7DoNQVCAN_FrZDx6LVcIOshlI09lZmWGuNvQrQ4JlPy44ve_i0lXI";
                var convertedVapidPublicKey = urlBase64ToUint8Array(
                    vapidPublicKey
                );
                return reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidPublicKey
                });
            } else {
            }
        })
        .then(function(newSub) {
            return fetch(
                "https://pwagram-2d466.firebaseio.com/subscriptions.json",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    },
                    body: JSON.stringify(newSub)
                }
            );
        })
        .then(function(res) {
            if (res.ok) {
                displayConfirmationNotification();
            }
        })
        .catch(function(err) {
            console.error(err);
        });
}

function askForNotificationPermission() {
    Notification.requestPermission(function(result) {
        console.log("User Choice", result);
        if (result !== "granted") {
            console.log("No notification permission granted!");
        } else {
            configurePushSub();
        }
    });
}

if ("Notification" in window && "serviceWorker" in navigator) {
    for (var i = 0; i < enableNotificationsButtons.length; i++) {
        enableNotificationsButtons[i].style.display = "inline-block";
        enableNotificationsButtons[i].addEventListener(
            "click",
            askForNotificationPermission
        );
    }
}
