'use strict';

const $tokens = $('#tokens').data('json');
let enquetesToken = $tokens.enquetesToken;
let favoritesToken = $tokens.favoritesToken;

function getNextEnquetes(){
  const $block = $('#pills-mine');
  $block.find('.nextButton').hide();
  $block.find('.spinnerButton').show();

  $.ajax({
    url: '/api/getNextEnquetes',
    type: 'POST',
    data: {
      'token': enquetesToken,
    },
    dataType: 'html',
  }).done((data) => {
    const $cardBody = $block.find('.card-body:first');
    $cardBody.append('<hr class="mt-4 mb-4 mt-sm-5 mb-sm-5">');
    $cardBody.append($(data).find('#pills-mine .card-body:first>*'));
    createChart();

    if(enquetesToken = $(data).filter('#tokens').data('json').enquetesToken) $block.find('.nextButton').show();
    else $block.find('.card-footer').hide();
  }).fail((data) => {
    const $navbar = $('.navbar');

    let dom = "";
    dom += '<div class="alert alert-danger alert-dismissible fade show mb-0">';
    dom += '<strong>Error:</strong>';
    dom += '<span class="ml-2">'
    dom += 'アンケートの読み込みに失敗しました。時間を空けて再度お試しください。'
    dom += '</span>';
    dom += '<button class="close" data-dismiss="alert" aria-label="Close">';
    dom += '<span aria-hidden="true">&times;</span>';
    dom += '</button>';
    dom += '</div>';

    $navbar.after(dom);
    $block.find('.nextButton').show();
  }).always((data) => {
    $block.find('.spinnerButton').hide();
  });
}

function getNextFavorites(){
  const $block = $('#pills-favorites');
  $block.find('.nextButton').hide();
  $block.find('.spinnerButton').show();

  $.ajax({
    url: '/api/getNextFavorites',
    type: 'POST',
    data: {
      'token': favoritesToken,
    },
    dataType: 'html',
  }).done((data) => {
    const $cardBody = $block.find('.card-body:first');
    $cardBody.append('<hr class="mt-4 mb-4 mt-sm-5 mb-sm-5">');
    $cardBody.append($(data).find('#pills-favorites .card-body:first>*'));
    createChart();

    if(favoritesToken = $(data).filter('#tokens').data('json').favoritesToken) $block.find('.nextButton').show();
    else $block.find('.card-footer').hide();
  }).fail((data) => {
    const $navbar = $('.navbar');

    let dom = "";
    dom += '<div class="alert alert-danger alert-dismissible fade show mb-0">';
    dom += '<strong>Error:</strong>';
    dom += '<span class="ml-2">'
    dom += 'アンケートの読み込みに失敗しました。時間を空けて再度お試しください。'
    dom += '</span>';
    dom += '<button class="close" data-dismiss="alert" aria-label="Close">';
    dom += '<span aria-hidden="true">&times;</span>';
    dom += '</button>';
    dom += '</div>';

    $navbar.after(dom);
    $block.find('.nextButton').show();
  }).always((data) => {
    $block.find('.spinnerButton').hide();
  });
}
