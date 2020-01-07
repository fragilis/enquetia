$(function () {
  const ctx = $('#resultChart')[0].getContext("2d");

  const $question = $('#question').data('json');
  const labels = $question.answers.map(answer => answer.value);
  const total = $question.answers.map(answer => answer.result).reduce((acc, cur) => acc + cur);
  //const data = $question.answers.map(answer => answer.result);
  const data = $question.answers.map(answer => Math.round(answer.result/total*100*10)/10);
  const myChart = new Chart(ctx, {
    /*
    type: 'pie',
    data: {
        labels: labels,
        datasets: [{
            label: '投票数',
            data: data,
            borderWidth: 1
        }]
    },
    */
    type: 'horizontalBar',
    data: {
        labels: labels,
        datasets: [{
            label: '回答結果',
            data: data,
            borderWidth: 1
        }]
    },
    options: {
      scales: {
        xAxes: [{
          ticks: {
            beginAtZero: true,
            min: 0,
            max: 100
          },
          scaleLabel: {
            display: true,
            labelString: '（％）',
          }
        }]
      }
    }
  });
})
