// Applies the saved theme before the first paint, so the page does not flash the wrong one.
// A separate file (not an inline script) so the admin can run under a strict Content-Security-Policy.
try {
  var t = localStorage.getItem("lineagraph.theme");
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
