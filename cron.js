'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const models = require('./models/model-datastore');

function refreshVotes(){
  console.log('Starting refreshVotes().');

  // votesの古いentityを取得
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

    // countを更新するentityをquestionsとanswersそれぞれ取得
    models.questions.read(questions.map(q => q.id), (err, q_entities) => {
      if (err) {
        console.log("ERROR: ", err);
        return;
      }
      models.answers.read(answers.map(a => a.id), (err, a_entities) => {
        if (err) {
          console.log("ERROR: ", err);
          return;
        }

        // questions.countの更新、answers.countの更新、votesの削除の3つを同じtransactionで行う
        const transaction = ds.transaction();
        transaction.run((err) => {
          if (err) {
            console.log("ERROR: ", err);
            return;
          }
          transaction.save(q_entities.map(question => {
            const key = ds.key(['Questions', ds.int(question.id)]);
            question.count += questions.filter(q => q.id == question.id)[0].count;
            question.id = undefined;

            const entity = {
              key: key,
              data: question
            };
            return entity;
          }));
          transaction.save(a_entities.map(answer => {
            const key = ds.key(['Answers', ds.int(answer.id)]);
            answer.count += answers.filter(a => a.id == answer.id)[0].count;
            answer.id = undefined;

            const entity = {
              key: key,
              data: answer
            };
            return entity;
          }));

          transaction.commit((err)=> {
            if(!err){
              models.votes._delete(votes.map(vote => vote.id), (err) => {
                if (err) {
                  console.log("count was updated, however, votes have not been deleted.");
                  console.log("ERROR: ", err);
                  return;
                }
                console.log('refreshVotes() succeeded.');
                return;
              });
            } else {
              console.log("ERROR: ", err);
              return;
            }
          });
        });
      });
    });
  });
}

module.exports = {
  refreshVotes: refreshVotes,
};
