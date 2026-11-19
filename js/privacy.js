const CONSENT_KEY = "tnf-analytics-consent";
const DISMISSAL_EXPIRY = "cookies-dismissal-expiration";
const consentBanner = document.getElementById("privacy-consent");

let analyticsStarted = false;

function showConsentBanner() {
    consentBanner.style.display = "block";
}

function hideConsentBanner() {
    consentBanner.style.display = "none";
}

function dismissConsentBanner() {
    if (getConsentPreference() === "unset") {
        const currentTime = Date.now();
        const DAY_IN_MILLISECONDS = 86400000;
        const dismissalExpiration = currentTime + DAY_IN_MILLISECONDS;

        localStorage.setItem(DISMISSAL_EXPIRY, dismissalExpiration.toString());
    }

    hideConsentBanner();
}

function getConsentPreference() {
    const preference = localStorage.getItem(CONSENT_KEY);

    if (preference === "accepted" || preference === "declined") {
        return preference;
    }

    return "unset";
}

function setConsentPreference(preference) {
    if (preference !== "accepted" && preference !== "declined") {
        return;
    }

    localStorage.setItem(CONSENT_KEY, preference);
}

function withdrawAnalyticsConsent() {
    window["ga-disable-G-GSK09E6DTZ"] = true;

    gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
    });

    document.cookie = "_ga=; Max-Age=0; path=/";
    document.cookie = "_ga_GSK09E6DTZ=; Max-Age=0; path=/";

    window.location.reload();
}

function initializePrivacy() {
    const storedExpiration = Number.parseInt(localStorage.getItem(DISMISSAL_EXPIRY));
    const timerExpiration = Number.isInteger(storedExpiration) ? storedExpiration : 0;
    const currentTime = Date.now();

    if (getConsentPreference() === "unset" && currentTime > timerExpiration) {
        showConsentBanner();
    }

    initializePrivacyPreferences();

    initializeConsentButtons();

    loadAnalytics();
}

function initializePrivacyPreferences() {
    const privacyPreferencesButton = document.getElementById("privacy-preferences");

    if (privacyPreferencesButton) {
        privacyPreferencesButton.addEventListener("click", () => {
            showConsentBanner();
        });
    }
}

function initializeConsentButtons() {
    const privacyDeclineButton = document.getElementById("privacy-decline");
    const privacyAcceptButton = document.getElementById("privacy-accept");
    const privacyCloseButton = document.getElementById("privacy-close");

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && consentBanner.style.display === "block") {
            dismissConsentBanner();
        }
    });
    privacyCloseButton.addEventListener("click", () => {
        dismissConsentBanner();
    });
    privacyDeclineButton.addEventListener("click", () => {
        setConsentPreference("declined");
        localStorage.removeItem(DISMISSAL_EXPIRY);
        if (analyticsStarted === true) {
            withdrawAnalyticsConsent();
        } else {
            hideConsentBanner();
        }
    });
    privacyAcceptButton.addEventListener("click", () => {
        setConsentPreference("accepted");
        localStorage.removeItem(DISMISSAL_EXPIRY);
        hideConsentBanner();
        loadAnalytics();
    });
}

function initializeConsentSync() {
    window.addEventListener("storage", (event) => {
       if (event.key === CONSENT_KEY) {
           if (event.newValue === "declined" && analyticsStarted === true) {
               withdrawAnalyticsConsent();
           } else if (event.newValue === "accepted") {
               loadAnalytics();
           }
       }
    });
}

function gtag(){
    window.dataLayer.push(arguments);
}

function loadAnalytics() {
    if (analyticsStarted || getConsentPreference() !== "accepted") {
        return;
    }

    analyticsStarted = true;
    window.dataLayer = window.dataLayer || [];
    gtag('js', new Date());
    gtag('config', 'G-GSK09E6DTZ');

    const googleAnalyticsTagSource = document.createElement("script");

    googleAnalyticsTagSource.src = "https://www.googletagmanager.com/gtag/js?id=G-GSK09E6DTZ";
    googleAnalyticsTagSource.async = true;

    document.head.appendChild(googleAnalyticsTagSource);
}

initializePrivacy();