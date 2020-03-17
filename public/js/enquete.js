'use strict';

function addToFavorite(question_id){
  const $card = $('.card[name="' + question_id + '"]')
  const $navbar = $('.navbar');
  console.log($card)
  console.log($card.find('.favoriteButton'))
  let dom = "";
  $.ajax({
    url: '/api/addToFavorite',
    type: 'POST',
    data: {
      'question_id': question_id,
    },
  }).done((data) => {
    $card.find('.favoriteButton').toggle();
    dom += '<div class="alert alert-info alert-dismissible fade show mb-0">';
    dom += '<strong>Info:</strong>';
    dom += '<span class="ml-2">'
    dom += 'お気に入りに追加しました。'
    dom += '</span>';
    dom += '<button class="close" data-dismiss="alert" aria-label="Close">';
    dom += '<span aria-hidden="true">&times;</span>';
    dom += '</button>';
    dom += '</div>';
  }).fail((data) => {
    dom += '<div class="alert alert-danger alert-dismissible fade show mb-0">';
    dom += '<strong>Error:</strong>';
    dom += '<span class="ml-2">'
    dom += 'お気に入りに追加できませんでした。時間を空けて再度お試しください。'
    dom += '</span>';
    dom += '<button class="close" data-dismiss="alert" aria-label="Close">';
    dom += '<span aria-hidden="true">&times;</span>';
    dom += '</button>';
    dom += '</div>';
  }).always((data) => {
    $navbar.after(dom);
  });
}

function removeFromFavorite(question_id){
  const $card = $('.card[name="' + question_id + '"]')
  const  $navbar = $('.navbar');
  console.log($card)
  console.log($card.find('.favoriteButton'))
  let dom = "";
  $.ajax({
    url: '/api/removeFromFavorite',
    type: 'POST',
    data: {
      'question_id': question_id,
    },
  }).done((data) => {
    $card.find('.favoriteButton').toggle();
    dom += '<div class="alert alert-info alert-dismissible fade show mb-0">';
    dom += '<strong>Info:</strong>';
    dom += '<span class="ml-2">'
    dom += 'お気に入りから削除しました。'
    dom += '</span>';
    dom += '<button class="close" data-dismiss="alert" aria-label="Close">';
    dom += '<span aria-hidden="true">&times;</span>';
    dom += '</button>';
    dom += '</div>';
  }).fail((data) => {
    dom += '<div class="alert alert-danger alert-dismissible fade show mb-0">';
    dom += '<strong>Error:</strong>';
    dom += '<span class="ml-2">'
    dom += 'お気に入りから削除できませんでした。時間を空けて再度お試しください。'
    dom += '</span>';
    dom += '<button class="close" data-dismiss="alert" aria-label="Close">';
    dom += '<span aria-hidden="true">&times;</span>';
    dom += '</button>';
    dom += '</div>';
  }).always((data) => {
    $navbar.after(dom);
  });
}

function showResult(dom){
  const $enqueteUnit = $(dom).closest('.enqueteUnit');
  $enqueteUnit.find('.vote').hide();
  $enqueteUnit.find('.result').show();
  /*
  for(const id in Chart.instances){
    if($(Chart.instances[id].canvas).is($enqueteUnit.find('canvas.result'))){
      Chart.instances[id].reset();
      Chart.instances[id].update();
      break;
    }
  }
  */
}

function showVote(dom){
  const $enqueteUnit = $(dom).closest('.enqueteUnit');
  $enqueteUnit.find('.vote').show();
  $enqueteUnit.find('.result').hide();
}
