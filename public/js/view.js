$(function () {
  $('.needs-validation').on('submit', function(event){
    if(this.checkValidity() === false){
      event.preventDefault();
      event.stopPropagation();
      $(this).addClass('was-validated');
    }
  });

  $('#checkResult').attr('href', location.href.replace(/\/$/, '') + '/result');

  /*
  if(!$question.is_expired){
    window.cookieconsent.initialise({
      "palette": {
        "popup": {
          "background": "#eaf7f7",
          "text": "#5c7291"
        },
        "button": {
          "background": "#56cbdb",
          "text": "#ffffff"
        }
      },
      "theme": "classic",
      "content": {
        "message": "Enquetiaではアンケートの多重回答を防ぐためにCookieを使用しています。",
        "link": "",
        "dismiss": "OK"
      }
    });
  }
  */
})
