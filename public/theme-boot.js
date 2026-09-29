// Pre-paint theme bootstrap: runs before first paint so there is no flash of the wrong theme.
(function () {
  try {
    var t = localStorage.getItem("nocturne.theme") || "night";
    document.documentElement.setAttribute("data-theme", t);
    var light = t === "proof" || (t === "auto" && matchMedia("(prefers-color-scheme: light)").matches);
    document.querySelector('meta[name="theme-color"]').setAttribute("content", light ? "#F5F1E8" : "#0A1024");
    if (localStorage.getItem("nocturne.evening") === "1") document.documentElement.classList.add("evening");
    if (localStorage.getItem("nocturne.motion") === "reduced") document.documentElement.classList.add("reduced-motion");
  } catch (e) {}
})();
