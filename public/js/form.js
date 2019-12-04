$(function () {
  $('.needs-validation').on('submit', function(event){
    if(this.checkValidity() === false){
      event.preventDefault();
      event.stopPropagation();
      $(this).addClass('was-validated');
    }
  });

  $('[data-toggle="tooltip"]').popover();
  $('#add_item').on('click', function(){
    const num = $('#items').children('.input-group').length;
    add_item(num+1, '');
  });

  const $question = $('#question').data('json');
  $('#items').children('.input-group').remove();
  if($question.answers != undefined && $question.answers.length > 0){
    $question.answers.forEach((e, i) => {
      add_item(i+1, e);
    });
  }else{
    console.log('$question.answers is empty.');
    add_item(1, '');
  }
})

function delete_item(num){
  if($('#items').children('.input-group').length > 1){
    $('#answer' + num).parent().remove();
  }
  $('#items').children('.input-group').each((i, elem) => {
    $(elem).find('.input-group-prepend span').text('選択肢' + (i+1));
    $(elem).children('input').attr('id', 'answer' + (i+1));
    $(elem).children('input').attr('name', 'answer' + (i+1));
    $(elem).find('.input-group-append button').attr('onclick', 'delete_item(' + (i+1) + ')');
  })
}

function add_item(num, answer){
  const $question = $('#question').data('json');
  if(num > $question.MAX_ITEM_COUNT){
    // TODO: show error message
  }
  else{
    $add_item = $('#add_item');
    $add_item.before('<div class="input-group mb-3"><div class="input-group-prepend"><span class="input-group-text">選択肢' + num + '</span></div><input class="form-control" type="text" name="answers[]" id="answer' + num + '" value="' + answer + '" required maxlength="100"><div class="input-group-append"><button class="btn btn-outline-secondary" type="button" title="選択肢を削除" onclick="delete_item(' + num + ')">×</div><div class="invalid-feedback">100文字以内で入力してください。</div></div>');
  }
}
