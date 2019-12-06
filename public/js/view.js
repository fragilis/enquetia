$(function () {
  $('.needs-validation').on('submit', function(event){
    if(this.checkValidity() === false){
      event.preventDefault();
      event.stopPropagation();
      $(this).addClass('was-validated');
    }
  });
})
