// Chart.js CDN loader
(function(){
  if (!window.Chart) {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = function() { window.ChartLoaded = true; };
    document.head.appendChild(script);
  }
})();
