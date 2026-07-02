// Minimal proof-of-life: confirms JS ran and shows when the page loaded.
const status = document.getElementById("status");
const now = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
status.textContent = `live — loaded ${now}`;
