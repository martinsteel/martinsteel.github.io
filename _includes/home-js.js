  <script>
    var didScroll = false;
    if (window.addEventListener) {
      window.addEventListener('scroll', function() {
        didScroll = true;
      });

      var title = document.getElementById('home-title');
      var bodyTop = (document.documentElement.scrollTop?document.documentElement:document.body).getBoundingClientRect().top;
      var headingPos = title.getBoundingClientRect().top - bodyTop;
      var hero = document.getElementsByClassName('home-masthead')[0];
      var heroPos = hero.getBoundingClientRect().bottom - bodyTop;
      var masthead = document.getElementsByClassName('masthead')[0];
     
      setInterval(function() {
        if ( didScroll ) {
          didScroll = false;
          var scrollPos = (document.documentElement.scrollTop?document.documentElement:document.body).scrollTop;
          var opacity = (scrollPos < headingPos) ? (headingPos - scrollPos) / headingPos : 0;
          title.style.opacity = opacity;

          if(scrollPos > heroPos) { 
            masthead.className = masthead.className.replace( ' masthead-home', '' );
            console.log('greater');
          } else {
            masthead.classList ? masthead.classList.add('masthead-home') : masthead.className += ' masthead-home';  
            console.log('smaller');          
          }
        } 
      }, 250);
    }
  </script>