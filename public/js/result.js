function createChart(){
  const $results = $('canvas.result');
  $results.each((index, result) => {
    const ctx = result.getContext("2d");
    const $question = $(result).data('json');

    const labels = $question.answers.map(answer => answer.content);
    const total = $question.count;
    const data = $question.answers.map(answer => Math.round(answer.count/total*100*10)/10);
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
      options: {
        plugins: {
          colorschemes: {
            scheme: 'brewer.Paired12',
          },
        },
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
          }],
          yAxes: [{
            ticks: {
              fontSize: window.innerWidth < 767 ? 9 : 12,
            },
          }],
        },
      }
    });
  });
}

$(function () {
  createChart();
})
