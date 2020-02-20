'use strict';

const models = require('./models/model-datastore');

function refreshVotes(){
  console.log('Starting refreshVotes().');

  // votesの全entityを取得
  models.votes.readOld((err, votes) => {
    if (err) {
      console.log('refreshVotes() failed.');
      return;
    }

    const questions = [];
    const answers = [];
    votes.forEach(vote => {

      // question_idごとに得票数をカウント
      if(questions.length === 0 || questions.filter(q => q.id == vote.question_id).length === 0) questions.push({id: Number(vote.question_id), count: 1}); 
      else questions.filter(q => q.id == vote.question_id)[0].count++;

      // answer_idごとに得票数をカウント
      vote.answer_ids.forEach(answer_id => {
        if(answers.length === 0 || answers.filter(a => a.id == answer_id).length === 0) answers.push({id: Number(answer_id), count: 1});
        else answers.filter(a => a.id == answer_id)[0].count++;
      });
    });

    // questionsのcountを更新
    models.questions.read(questions.map(q => q.id), (err, q_entities) => {
      if (err) {
        console.log("ERROR: ", err);
        return;
      }
      q_entities.forEach(entity => {
        entity.count += questions.filter(q => q.id == entity.id)[0].count;
        entity.id = undefined;
      });
      models.questions.update(questions.map(q => q.id), q_entities, (err2) => {
        if (err2) {
          console.log("ERROR: ", err2);
          return;
        }

        // answersのcountを更新
        models.answers.read(answers.map(a => a.id), (err3, a_entities) => {
          if (err3) {
            console.log("ERROR: ", err3);
            return;
          }
          a_entities.forEach(entity => {
            entity.count += answers.filter(a => a.id == entity.id)[0].count;
            entity.id = undefined;
          });
          models.answers.update(answers.map(a => a.id), a_entities, (err4) => {
            if (err4) {
              console.log("ERROR: ", err4);
              return;
            }
            // votesをクリア
            models.votes._delete(votes.map(vote => vote.id), (err5) => {
              if (err5) {
                console.log("ERROR: ", err5);
                return;
              }
              console.log('refreshVotes() succeeded.');
              return;
            });
          });
        });
      });
    });
  });
}

module.exports = {
  refreshVotes: refreshVotes,
};
