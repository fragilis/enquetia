'use strict';

const $tokens = $('#tokens').data('json');
let topicsToken = $tokens.topicsToken;
let newsToken = $tokens.newsToken;

function getNextTopics(){
  const $block = $('#pills-topics');
  $block.find('.nextButton').hide();
  $block.find('.spinnerButton').show();

  $.ajax({
    url: '/api/getNextTopics',
    type: 'POST',
    data: {
      'token': topicsToken,
    },
    dataType: 'html',
  }).done((data) => {
    const $cardBody = $block.find('.card-body:first');
    $cardBody.append('<hr class="mt-4 mb-4 mt-sm-5 mb-sm-5">');
    $cardBody.append($(data).find('#pills-topics .card-body:first>*'));
    createChart();
    addValidationToForms();

    if(topicsToken = $(data).filter('#tokens').data('json').topicsToken) $block.find('.nextButton').show();
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

function getNextNews(){
  const $block = $('#pills-news');
  $block.find('.nextButton').hide();
  $block.find('.spinnerButton').show();

  $.ajax({
    url: '/api/getNextNews',
    type: 'POST',
    data: {
      'token': newsToken,
    },
    dataType: 'html',
  }).done((data) => {
    const $cardBody = $block.find('.card-body:first');
    $cardBody.append('<hr class="mt-4 mb-4 mt-sm-5 mb-sm-5">');
    $cardBody.append($(data).find('#pills-news .card-body:first>*'));
    createChart();
    addValidationToForms();

    if(newsToken = $(data).filter('#tokens').data('json').newsToken) $block.find('.nextButton').show();
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
