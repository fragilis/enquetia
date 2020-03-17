function createEnquete(dom){
  $(dom).closest('form').prop('disabled', true);

  let loadingAlert = '';
  loadingAlert += '<div class="alert alert-info alert-dismissible fade show mb-0">';
  loadingAlert += '<span class="spinner-border" role="status" aria-hidden="true"></span>';
  loadingAlert += '<span class="ml-2">';
  loadingAlert += 'アンケートを作成しています。作成には1分ほどかかる場合があります。';
  loadingAlert += '</span>';
  loadingAlert += '<button class="close" data-dismiss="alert" aria-label="Close">';
  loadingAlert += '<span aria-hidden="true">&times;</span>';
  loadingAlert += '</button>';
  loadingAlert += '</div>';

  const $navbar = $('.navbar');
  $navbar.after(loadingAlert);
}
