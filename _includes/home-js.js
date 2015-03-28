  <script>
    var didScroll = false;
    if (window.addEventListener) {
      window.addEventListener('scroll', function() {
        didScroll = true;
      });

      var title = document.getElementById('home-title');
      var bodyTop = (document.documentElement.scrollTop?document.documentElement:document.body).getBoundingClientRect().top;
      var headingTop = title.getBoundingClientRect().top;
      var headingPos = headingTop - bodyTop;
     
      setInterval(function() {
        if ( didScroll ) {
          didScroll = false;
          var scrollPos = (document.documentElement.scrollTop?document.documentElement:document.body).scrollTop;
          var opacity = (scrollPos < headingPos) ? (headingPos - scrollPos) / headingPos : 0;
          title.style.opacity = opacity;
        } 
      }, 250);
    }
  </script>