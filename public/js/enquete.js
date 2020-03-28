'use strict';

$(function () {
  addValidationToForms();

  var topBtn=$('#pageTopBtn');

  $(window).scroll(function(){
    if($(this).scrollTop()>80) topBtn.fadeIn();
    else topBtn.fadeOut();
  });

  topBtn.click(function(){
    $('body,html').animate({
    scrollTop: 0},500);
    return false;
  });
});

function addValidationToForms(){
  $('.needs-validation.vote').on('submit', function(event){

    event.preventDefault();
    event.stopPropagation();
    if(this.checkValidity() === false){
      $(this).addClass('was-validated');
    } else {
      const question_id = $(this).find('.card.enquete').attr('name');
      const answer_ids = [];
      $(this).find('fieldset input:checked').each(function(){
        answer_ids.push($(this).val());
      });
      voteTo(question_id, answer_ids);
    }
  });
}


function voteTo(question_id, answer_ids){
  $('.loader').show();
  $('.card[name="' + question_id + '"]').find('button[type="submit"]').prop("disabled", true);
  const $navbar = $('.navbar');
  let dom = "";
  $.ajax({
    url: '/api/voteTo',
    type: 'POST',
    data: {
      'question_id': question_id,
      'answer': answer_ids,
    },
    headers: {
      'CSRF-Token': $('.card[name="' + question_id + '"]').find('input[name="_csrf"]').val(),
    },
    dataType: 'html',
  }).done((data) => {
    const $enqueteUnit = $('.card[name="' + question_id + '"]').closest('.enqueteUnit');
    $enqueteUnit.replaceWith($(data).find('.enqueteUnit'));
    createChart();

    dom += '<div class="alert alert-info alert-dismissible fade show mb-0">';
    dom += '<strong>Info:</strong>';
    dom += '<span class="ml-2">'
    dom += '投票が完了しました。'
    dom += '</span>';
    dom += '<button class="close" data-dismiss="alert" aria-label="Close">';
    dom += '<span aria-hidden="true">&times;</span>';
    dom += '</button>';
    dom += '</div>';
  }).fail((data) => {
    $('.card[name="' + question_id + '"]').find('button[type="submit"]').prop("disabled", false);
    dom += '<div class="alert alert-danger alert-dismissible fade show mb-0">';
    dom += '<strong>Error:</strong>';
    dom += '<span class="ml-2">'
    dom += '投票に失敗しました。時間を空けて再度お試しください。'
    dom += '</span>';
    dom += '<button class="close" data-dismiss="alert" aria-label="Close">';
    dom += '<span aria-hidden="true">&times;</span>';
    dom += '</button>';
    dom += '</div>';
  }).always((data) => {
    $('.loader').hide();
    $navbar.after(dom);
  });
}


function addToFavorite(question_id){
  $('.loader').show();
  const $card = $('.card[name="' + question_id + '"]');
  const $navbar = $('.navbar');
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
    $('.loader').hide();
    $navbar.after(dom);
  });
}


function removeFromFavorite(question_id){
  $('.loader').show();
  const $card = $('.card[name="' + question_id + '"]');
  const  $navbar = $('.navbar');
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
    $('.loader').hide();
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
